import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { RESUME_DELAYED_WORKFLOW_JOB_NAME } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/contants/resume-delayed-workflow-job-name';
import { type WorkflowDelayActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/types/workflow-delay-action-input.type';
import { type ResumeDelayedWorkflowJobData } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/types/resume-delayed-workflow-job-data.type';

export type WaitStateScheduleParams = {
  workspaceId: string;
  workflowRunId: string;
  stepId: string;
  input: WorkflowDelayActionInput;
};

/**
 * Bridges the workflow DELAY action with the Business Calendar service.
 * Resolves the delay duration for all three delay types — including the
 * BUSINESS_DAYS type that the base DelayWorkflowAction does not support —
 * and enqueues a ResumeDelayedWorkflowJob via the delayedJobsQueue.
 */
@Injectable()
export class WaitStateEngineService {
  private readonly logger = new Logger(WaitStateEngineService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.delayedJobsQueue)
    private readonly delayedJobsQueueService: MessageQueueService,
    private readonly businessCalendarService: BusinessCalendarService,
  ) {}

  async schedule(params: WaitStateScheduleParams): Promise<void> {
    const { workspaceId, workflowRunId, stepId, input } = params;

    const delayInMs = await this.resolveDelayMs(workspaceId, input);

    this.logger.log(
      `Scheduling workflow resume for run ${workflowRunId}, step ${stepId} ` +
        `in ${delayInMs}ms (type: ${input.delayType})`,
    );

    await this.delayedJobsQueueService.add<ResumeDelayedWorkflowJobData>(
      RESUME_DELAYED_WORKFLOW_JOB_NAME,
      { workspaceId, workflowRunId, stepId },
      { delay: delayInMs },
    );
  }

  private async resolveDelayMs(
    workspaceId: string,
    input: WorkflowDelayActionInput,
  ): Promise<number> {
    if (input.delayType === 'SCHEDULED_DATE') {
      const scheduledDate = new Date(input.scheduledDateTime);
      const now = new Date();
      const diff = scheduledDate.getTime() - now.getTime();

      return Math.max(0, diff);
    }

    if (input.delayType === 'DURATION') {
      const { days = 0, hours = 0, minutes = 0, seconds = 0 } = input.duration;

      return (
        days * 24 * 60 * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000 +
        seconds * 1000
      );
    }

    if (input.delayType === 'BUSINESS_DAYS') {
      return this.resolveBusinessDaysDelayMs(workspaceId, input.businessDays);
    }

    throw new Error(`Unknown delay type: ${(input as WorkflowDelayActionInput).delayType}`);
  }

  private async resolveBusinessDaysDelayMs(
    workspaceId: string,
    businessDays: number,
  ): Promise<number> {
    const calendar =
      await this.businessCalendarService.findByWorkspaceId(workspaceId);

    const now = new Date();

    if (!isDefined(calendar)) {
      const fallbackMs =
        businessDays * 24 * 60 * 60 * 1000;

      this.logger.warn(
        `No business calendar configured for workspace ${workspaceId}. ` +
          `Falling back to ${businessDays} calendar days (${fallbackMs}ms).`,
      );

      return fallbackMs;
    }

    const targetDate = this.businessCalendarService.addBusinessDays(
      calendar,
      now,
      businessDays,
    );

    return this.businessCalendarService.msUntil(targetDate);
  }
}
