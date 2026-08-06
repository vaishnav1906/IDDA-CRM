import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowIddaAssignLeadAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { HorizontalSeparator } from 'twenty-ui/layout';

type WorkflowEditActionIddaAssignLeadProps = {
  action: WorkflowIddaAssignLeadAction;
  actionOptions:
    | { readonly: true }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowIddaAssignLeadAction) => void;
      };
};

export const WorkflowEditActionIddaAssignLead = ({
  action,
  actionOptions,
}: WorkflowEditActionIddaAssignLeadProps) => {
  const readonly = actionOptions.readonly === true;

  const handleInputUpdate = (
    patch: Partial<WorkflowIddaAssignLeadAction['settings']['input']>,
  ) => {
    if (readonly) return;
    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: { ...action.settings.input, ...patch },
      },
    });
  };

  return (
    <>
      <WorkflowStepBody>
        <FormTextFieldInput
          label={t`Lead ID`}
          defaultValue={action.settings.input.leadId}
          onChange={(leadId) => handleInputUpdate({ leadId })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.id}}`}
        />

        <FormTextFieldInput
          label={t`Assignee (Workspace Member ID)`}
          defaultValue={action.settings.input.assigneeWorkspaceMemberId}
          onChange={(assigneeWorkspaceMemberId) =>
            handleInputUpdate({ assigneeWorkspaceMemberId })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.assigneeId}}`}
        />

        <HorizontalSeparator noMargin />

        <FormTextFieldInput
          label={t`Notification Title (optional)`}
          defaultValue={action.settings.input.notificationTitle ?? ''}
          onChange={(notificationTitle) =>
            handleInputUpdate({
              notificationTitle: notificationTitle || undefined,
            })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`New lead assigned to you`}
        />

        <FormTextFieldInput
          label={t`Notification Body (optional)`}
          defaultValue={action.settings.input.notificationBody ?? ''}
          onChange={(notificationBody) =>
            handleInputUpdate({
              notificationBody: notificationBody || undefined,
            })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Please follow up with this lead promptly.`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
