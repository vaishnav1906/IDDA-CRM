import { Logger, Scope } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { EMPLOYEE_EXIT_HANDOFF_JOB_NAME } from 'src/modules/employee-exit-handoff/constants/exit-handoff.constants';
import { EmployeeExitHandoffService } from 'src/modules/employee-exit-handoff/services/employee-exit-handoff.service';
import { type ExitHandoffJobData } from 'src/modules/employee-exit-handoff/types/exit-handoff-job-data.type';

@Processor({ queueName: MessageQueue.delayedJobsQueue, scope: Scope.REQUEST })
export class EmployeeExitHandoffJob {
  private readonly logger = new Logger(EmployeeExitHandoffJob.name);

  constructor(
    private readonly employeeExitHandoffService: EmployeeExitHandoffService,
  ) {}

  @Process(EMPLOYEE_EXIT_HANDOFF_JOB_NAME)
  async handle(data: ExitHandoffJobData): Promise<void> {
    this.logger.log(
      `EmployeeExitHandoffJob: processing team=${data.teamMemberId} status=${data.exitStatus} workspace=${data.workspaceId}`,
    );

    const result = await this.employeeExitHandoffService.executeHandoff(data);

    this.logger.log(
      `EmployeeExitHandoffJob: outcome=${result.outcome} team=${data.teamMemberId}`,
    );
  }
}
