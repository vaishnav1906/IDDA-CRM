import { type WorkflowActionType } from '@/workflow/types/Workflow';
import { assertUnreachable } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const getActionIconColorOrThrow = (
  actionType: WorkflowActionType,
): string => {
  switch (actionType) {
    case 'CODE':
    case 'LOGIC_FUNCTION':
    case 'HTTP_REQUEST':
    case 'SEND_EMAIL':
    case 'DRAFT_EMAIL':
    case 'CREATE_CALENDAR_EVENT':
      return themeCssVariables.color.red;
    case 'CREATE_RECORD':
    case 'UPDATE_RECORD':
    case 'DELETE_RECORD':
    case 'UPSERT_RECORD':
    case 'FIND_RECORDS':
    case 'PICK_RECORD':
      return themeCssVariables.font.color.tertiary;
    case 'FORM':
      return themeCssVariables.color.orange;
    case 'ITERATOR':
    case 'EMPTY':
    case 'FILTER':
    case 'IF_ELSE':
    case 'DELAY':
      return themeCssVariables.color.green12;
    case 'AI_AGENT':
      return themeCssVariables.color.pink;
    case 'IDDA_NOTIFY':
    case 'IDDA_ASSIGN_LEAD':
    case 'IDDA_UPDATE_SLA':
    case 'IDDA_CREATE_SUBSCRIPTION_TASK':
    case 'IDDA_SEND_TASK_EMAIL':
    case 'IDDA_CHECK_LEAD_NEXT_STEP':
    case 'IDDA_CHECK_FIRST_CONTACT_SLA':
    case 'IDDA_CHECK_MISSED_FOLLOWUPS':
    case 'IDDA_HANDLE_OPP_WON':
    case 'IDDA_CHECK_CANDIDATE_FOLLOWUPS':
    case 'IDDA_CHECK_STALE_LEADS':
      return themeCssVariables.color.blue;
    default:
      assertUnreachable(actionType, `Unsupported action type: ${actionType}`);
  }
};
