import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowIddaSendTaskEmailAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { HorizontalSeparator } from 'twenty-ui/layout';

type WorkflowEditActionIddaSendTaskEmailProps = {
  action: WorkflowIddaSendTaskEmailAction;
  actionOptions:
    | { readonly: true }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowIddaSendTaskEmailAction) => void;
      };
};

export const WorkflowEditActionIddaSendTaskEmail = ({
  action,
  actionOptions,
}: WorkflowEditActionIddaSendTaskEmailProps) => {
  const readonly = actionOptions.readonly === true;

  const handleInputUpdate = (
    patch: Partial<WorkflowIddaSendTaskEmailAction['settings']['input']>,
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
          label={t`Task ID`}
          defaultValue={action.settings.input.taskId}
          onChange={(taskId) => handleInputUpdate({ taskId })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.properties.after.id}}`}
        />

        <HorizontalSeparator noMargin />

        <FormTextFieldInput
          label={t`Additional Note (optional)`}
          defaultValue={action.settings.input.additionalNote ?? ''}
          onChange={(additionalNote) =>
            handleInputUpdate({ additionalNote: additionalNote || undefined })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Any extra context to include in the email...`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
