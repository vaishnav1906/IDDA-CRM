import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import {
  type SLAPriority,
  type WorkflowUpdateSlaActionInput,
} from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/types/workflow-update-sla-action-input.type';

export type SLAPriorityConfig = {
  priority: SLAPriority;
  slaHours: number;
};

export type WorkflowUpdateSlaActionSettings = BaseWorkflowActionSettings & {
  defaultSlaHours: number;
  useBusinessCalendar: boolean;
  priorityConfig: SLAPriorityConfig[];
  input: WorkflowUpdateSlaActionInput;
};
