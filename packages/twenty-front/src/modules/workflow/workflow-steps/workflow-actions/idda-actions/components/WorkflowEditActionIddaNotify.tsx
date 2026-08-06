import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowIddaNotifyAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { type SelectOption } from 'twenty-ui/input';
import { HorizontalSeparator } from 'twenty-ui/layout';

type WorkflowEditActionIddaNotifyProps = {
  action: WorkflowIddaNotifyAction;
  actionOptions:
    | { readonly: true }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowIddaNotifyAction) => void;
      };
};

const CHANNEL_OPTIONS: SelectOption<'IN_APP' | 'EMAIL' | 'BOTH'>[] = [
  { value: 'IN_APP', label: 'In-App Only' },
  { value: 'EMAIL', label: 'Email Only' },
  { value: 'BOTH', label: 'In-App + Email' },
];

export const WorkflowEditActionIddaNotify = ({
  action,
  actionOptions,
}: WorkflowEditActionIddaNotifyProps) => {
  const readonly = actionOptions.readonly === true;

  const handleUpdate = (patch: Partial<WorkflowIddaNotifyAction['settings']>) => {
    if (readonly) return;
    actionOptions.onActionUpdate({
      ...action,
      settings: { ...action.settings, ...patch },
    });
  };

  const handleInputUpdate = (
    patch: Partial<WorkflowIddaNotifyAction['settings']['input']>,
  ) => {
    if (readonly) return;
    handleUpdate({ input: { ...action.settings.input, ...patch } });
  };

  return (
    <>
      <WorkflowStepBody>
        <Select
          dropdownId="idda-notify-channel"
          label={t`Channel`}
          options={CHANNEL_OPTIONS}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={action.settings.channel}
          onChange={(channel) => handleUpdate({ channel })}
          disabled={readonly}
        />

        <HorizontalSeparator noMargin />

        <FormTextFieldInput
          label={t`Recipient (Workspace Member ID)`}
          defaultValue={action.settings.input.recipientWorkspaceMemberId}
          onChange={(recipientWorkspaceMemberId) =>
            handleInputUpdate({ recipientWorkspaceMemberId })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.assigneeId}}`}
        />

        <FormTextFieldInput
          label={t`Title`}
          defaultValue={action.settings.input.title}
          onChange={(title) => handleInputUpdate({ title })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`New lead assigned: {{trigger.record.name}}`}
        />

        <FormTextFieldInput
          label={t`Body`}
          defaultValue={action.settings.input.body}
          onChange={(body) => handleInputUpdate({ body })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Enter notification message...`}
        />

        <FormTextFieldInput
          label={t`Action URL (optional)`}
          defaultValue={action.settings.input.actionUrl ?? ''}
          onChange={(actionUrl) =>
            handleInputUpdate({ actionUrl: actionUrl || undefined })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`/leads/{{trigger.record.id}}`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
