import { FormNumberFieldInput } from '@/object-record/record-field/ui/form-types/components/FormNumberFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowIddaCreateSubscriptionTaskAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { HorizontalSeparator } from 'twenty-ui/layout';

type WorkflowEditActionIddaCreateSubscriptionTaskProps = {
  action: WorkflowIddaCreateSubscriptionTaskAction;
  actionOptions:
    | { readonly: true }
    | {
        readonly?: false;
        onActionUpdate: (
          action: WorkflowIddaCreateSubscriptionTaskAction,
        ) => void;
      };
};

export const WorkflowEditActionIddaCreateSubscriptionTask = ({
  action,
  actionOptions,
}: WorkflowEditActionIddaCreateSubscriptionTaskProps) => {
  const readonly = actionOptions.readonly === true;

  const handleInputUpdate = (
    patch: Partial<
      WorkflowIddaCreateSubscriptionTaskAction['settings']['input']
    >,
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
          label={t`Subscription ID`}
          defaultValue={action.settings.input.subscriptionId}
          onChange={(subscriptionId) => handleInputUpdate({ subscriptionId })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.id}}`}
        />

        <FormTextFieldInput
          label={t`Renewal Date`}
          defaultValue={action.settings.input.renewalDate}
          onChange={(renewalDate) => handleInputUpdate({ renewalDate })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.renewalDate}}`}
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

        <FormNumberFieldInput
          label={t`Days Before Renewal`}
          defaultValue={
            action.settings.input.dueDaysBeforeRenewal ??
            action.settings.defaultDueDaysBeforeRenewal ??
            7
          }
          onChange={(dueDaysBeforeRenewal) =>
            handleInputUpdate({
              dueDaysBeforeRenewal: dueDaysBeforeRenewal
                ? Number(dueDaysBeforeRenewal)
                : undefined,
            })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`7`}
        />

        <FormTextFieldInput
          label={t`Task Title (optional)`}
          defaultValue={action.settings.input.taskTitle ?? ''}
          onChange={(taskTitle) =>
            handleInputUpdate({ taskTitle: taskTitle || undefined })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Renewal due: {{trigger.record.name}}`}
        />

        <FormTextFieldInput
          label={t`Task Body (optional)`}
          defaultValue={action.settings.input.taskBody ?? ''}
          onChange={(taskBody) =>
            handleInputUpdate({ taskBody: taskBody || undefined })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Review subscription before renewal date.`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
