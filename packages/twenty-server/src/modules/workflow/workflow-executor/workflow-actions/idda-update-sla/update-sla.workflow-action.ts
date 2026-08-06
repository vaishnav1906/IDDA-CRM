import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';

import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowUpdateSlaAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/guards/is-workflow-update-sla-action.guard';
import { type WorkflowUpdateSlaActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/types/workflow-update-sla-action-input.type';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  URGENT: 4,
  HIGH: 8,
  NORMAL: 24,
  LOW: 72,
};

@Injectable()
export class UpdateSlaWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(UpdateSlaWorkflowAction.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly businessCalendarService: BusinessCalendarService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({ stepId: currentStepId, steps });

    if (!isWorkflowUpdateSlaAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an update-sla action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowUpdateSlaActionInput;

    if (!isDefined(input.recordId)) {
      throw new WorkflowStepExecutorException(
        'recordId is required for update-sla action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(input.slaFieldName)) {
      throw new WorkflowStepExecutorException(
        'slaFieldName is required for update-sla action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const slaDeadline = await this.computeSlaDeadline(workspaceId, step, input);

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const repository = await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        input.objectSingularName,
        { shouldBypassPermissionChecks: true },
      );

      await repository.update(
        { id: input.recordId },
        { [input.slaFieldName]: slaDeadline.toISOString() },
      );
    }, authContext);

    await this.workflowTimelineWriterService.write({
      workspaceId,
      targetObjectSingularName: input.objectSingularName,
      targetRecordId: input.recordId,
      eventName: 'workflow.step.completed',
      properties: {
        action: 'SLA_UPDATED',
        slaFieldName: input.slaFieldName,
        slaDeadline: slaDeadline.toISOString(),
        priority: input.priority,
      },
    });

    this.logger.log(
      `SLA deadline set to ${slaDeadline.toISOString()} on ` +
        `${input.objectSingularName}/${input.recordId} field=${input.slaFieldName}`,
    );

    return {
      result: {
        recordId: input.recordId,
        slaFieldName: input.slaFieldName,
        slaDeadline: slaDeadline.toISOString(),
        priority: input.priority,
      },
    };
  }

  private async computeSlaDeadline(
    workspaceId: string,
    step: { settings: { priorityConfig?: { priority: string; slaHours: number }[]; defaultSlaHours?: number; useBusinessCalendar?: boolean } },
    input: WorkflowUpdateSlaActionInput,
  ): Promise<Date> {
    const now = new Date();

    const priorityConfig = step.settings.priorityConfig?.find(
      (cfg) => cfg.priority === input.priority,
    );

    const slaHours =
      input.customSlaHours ??
      priorityConfig?.slaHours ??
      SLA_HOURS_BY_PRIORITY[input.priority ?? 'NORMAL'] ??
      step.settings.defaultSlaHours ??
      24;

    const useBusinessCalendar =
      input.useBusinessCalendar ?? step.settings.useBusinessCalendar ?? false;

    if (!useBusinessCalendar) {
      return new Date(now.getTime() + slaHours * 60 * 60 * 1000);
    }

    const calendar =
      await this.businessCalendarService.findByWorkspaceId(workspaceId);

    if (!isDefined(calendar)) {
      this.logger.warn(
        `No business calendar for workspace ${workspaceId}. ` +
          `Falling back to wall-clock SLA calculation.`,
      );

      return new Date(now.getTime() + slaHours * 60 * 60 * 1000);
    }

    const businessDays = Math.ceil(slaHours / 8);

    return this.businessCalendarService.addBusinessDays(
      calendar,
      now,
      businessDays,
    );
  }
}
