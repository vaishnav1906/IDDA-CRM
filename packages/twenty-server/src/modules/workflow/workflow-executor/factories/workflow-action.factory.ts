import { Injectable } from '@nestjs/common';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { AiAgentWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/ai-agent.workflow-action';
import { CodeWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/code/code.workflow-action';
import { DelayWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/delay.workflow-action';
import { EmptyWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/empty/empty.workflow-action';
import { FilterWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/filter/filter.workflow-action';
import { FormWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/form/form.workflow-action';
import { HttpRequestWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/http-request/http-request.workflow-action';
import { IfElseWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/if-else.workflow-action';
import { CreateCalendarEventWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/create-calendar-event/create-calendar-event.workflow-action';
import { IteratorWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/iterator.workflow-action';
import { LogicFunctionWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/logic-function/logic-function.workflow-action';
import { DraftEmailWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mail-sender/draft-email.workflow-action';
import { SendEmailWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mail-sender/send-email.workflow-action';
import { CreateRecordWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/create-record.workflow-action';
import { DeleteRecordWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/delete-record.workflow-action';
import { FindRecordsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/find-records.workflow-action';
import { PickRecordWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/pick-record.workflow-action';
import { UpdateRecordWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/update-record.workflow-action';
import { UpsertRecordWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/upsert-record.workflow-action';
import { WorkflowActionType } from 'twenty-shared/workflow';
import { NotifyWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/notify.workflow-action';
import { AssignLeadWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/assign-lead.workflow-action';
import { UpdateSlaWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/update-sla.workflow-action';
import { CreateSubscriptionTaskWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/create-subscription-task.workflow-action';
import { CheckLeadNextStepWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/check-lead-next-step.workflow-action';
import { CheckFirstContactSlaWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/check-first-contact-sla.workflow-action';
import { CheckMissedFollowupsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/check-missed-followups.workflow-action';
import { HandleOppWonWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/handle-opp-won.workflow-action';
import { SendTaskEmailWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/send-task-email.workflow-action';
import { CheckCandidateFollowupsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/check-candidate-followups.workflow-action';
import { CheckStaleLeadsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/check-stale-leads.workflow-action';

@Injectable()
export class WorkflowActionFactory {
  constructor(
    private readonly codeWorkflowAction: CodeWorkflowAction,
    private readonly logicFunctionWorkflowAction: LogicFunctionWorkflowAction,
    private readonly createRecordWorkflowAction: CreateRecordWorkflowAction,
    private readonly upsertRecordWorkflowAction: UpsertRecordWorkflowAction,
    private readonly updateRecordWorkflowAction: UpdateRecordWorkflowAction,
    private readonly deleteRecordWorkflowAction: DeleteRecordWorkflowAction,
    private readonly findRecordsWorkflowAction: FindRecordsWorkflowAction,
    private readonly pickRecordWorkflowAction: PickRecordWorkflowAction,
    private readonly formWorkflowAction: FormWorkflowAction,
    private readonly filterWorkflowAction: FilterWorkflowAction,
    private readonly ifElseWorkflowAction: IfElseWorkflowAction,
    private readonly iteratorWorkflowAction: IteratorWorkflowAction,
    private readonly httpRequestWorkflowAction: HttpRequestWorkflowAction,
    private readonly sendEmailWorkflowAction: SendEmailWorkflowAction,
    private readonly draftEmailWorkflowAction: DraftEmailWorkflowAction,
    private readonly createCalendarEventWorkflowAction: CreateCalendarEventWorkflowAction,
    private readonly aiAgentWorkflowAction: AiAgentWorkflowAction,
    private readonly emptyWorkflowAction: EmptyWorkflowAction,
    private readonly delayWorkflowAction: DelayWorkflowAction,
    private readonly notifyWorkflowAction: NotifyWorkflowAction,
    private readonly assignLeadWorkflowAction: AssignLeadWorkflowAction,
    private readonly updateSlaWorkflowAction: UpdateSlaWorkflowAction,
    private readonly createSubscriptionTaskWorkflowAction: CreateSubscriptionTaskWorkflowAction,
    private readonly checkLeadNextStepWorkflowAction: CheckLeadNextStepWorkflowAction,
    private readonly checkFirstContactSlaWorkflowAction: CheckFirstContactSlaWorkflowAction,
    private readonly checkMissedFollowupsWorkflowAction: CheckMissedFollowupsWorkflowAction,
    private readonly handleOppWonWorkflowAction: HandleOppWonWorkflowAction,
    private readonly sendTaskEmailWorkflowAction: SendTaskEmailWorkflowAction,
    private readonly checkCandidateFollowupsWorkflowAction: CheckCandidateFollowupsWorkflowAction,
    private readonly checkStaleLeadsWorkflowAction: CheckStaleLeadsWorkflowAction,
  ) {}

  get(stepType: WorkflowActionType): WorkflowAction {
    switch (stepType) {
      case WorkflowActionType.CODE:
        return this.codeWorkflowAction;
      case WorkflowActionType.LOGIC_FUNCTION:
        return this.logicFunctionWorkflowAction;
      case WorkflowActionType.SEND_EMAIL:
        return this.sendEmailWorkflowAction;
      case WorkflowActionType.DRAFT_EMAIL:
        return this.draftEmailWorkflowAction;
      case WorkflowActionType.CREATE_CALENDAR_EVENT:
        return this.createCalendarEventWorkflowAction;
      case WorkflowActionType.CREATE_RECORD:
        return this.createRecordWorkflowAction;
      case WorkflowActionType.UPSERT_RECORD:
        return this.upsertRecordWorkflowAction;
      case WorkflowActionType.UPDATE_RECORD:
        return this.updateRecordWorkflowAction;
      case WorkflowActionType.DELETE_RECORD:
        return this.deleteRecordWorkflowAction;
      case WorkflowActionType.FIND_RECORDS:
        return this.findRecordsWorkflowAction;
      case WorkflowActionType.PICK_RECORD:
        return this.pickRecordWorkflowAction;
      case WorkflowActionType.FORM:
        return this.formWorkflowAction;
      case WorkflowActionType.FILTER:
        return this.filterWorkflowAction;
      case WorkflowActionType.IF_ELSE:
        return this.ifElseWorkflowAction;
      case WorkflowActionType.ITERATOR:
        return this.iteratorWorkflowAction;
      case WorkflowActionType.HTTP_REQUEST:
        return this.httpRequestWorkflowAction;
      case WorkflowActionType.AI_AGENT:
        return this.aiAgentWorkflowAction;
      case WorkflowActionType.EMPTY:
        return this.emptyWorkflowAction;
      case WorkflowActionType.DELAY:
        return this.delayWorkflowAction;
      case WorkflowActionType.IDDA_NOTIFY:
        return this.notifyWorkflowAction;
      case WorkflowActionType.IDDA_ASSIGN_LEAD:
        return this.assignLeadWorkflowAction;
      case WorkflowActionType.IDDA_UPDATE_SLA:
        return this.updateSlaWorkflowAction;
      case WorkflowActionType.IDDA_CREATE_SUBSCRIPTION_TASK:
        return this.createSubscriptionTaskWorkflowAction;
      case WorkflowActionType.IDDA_CHECK_LEAD_NEXT_STEP:
        return this.checkLeadNextStepWorkflowAction;
      case WorkflowActionType.IDDA_CHECK_FIRST_CONTACT_SLA:
        return this.checkFirstContactSlaWorkflowAction;
      case WorkflowActionType.IDDA_CHECK_MISSED_FOLLOWUPS:
        return this.checkMissedFollowupsWorkflowAction;
      case WorkflowActionType.IDDA_HANDLE_OPP_WON:
        return this.handleOppWonWorkflowAction;
      case WorkflowActionType.IDDA_SEND_TASK_EMAIL:
        return this.sendTaskEmailWorkflowAction;
      case WorkflowActionType.IDDA_CHECK_CANDIDATE_FOLLOWUPS:
        return this.checkCandidateFollowupsWorkflowAction;
      case WorkflowActionType.IDDA_CHECK_STALE_LEADS:
        return this.checkStaleLeadsWorkflowAction;
      default:
        throw new WorkflowStepExecutorException(
          `Workflow step executor not found for step type '${stepType}'`,
          WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
        );
    }
  }
}
