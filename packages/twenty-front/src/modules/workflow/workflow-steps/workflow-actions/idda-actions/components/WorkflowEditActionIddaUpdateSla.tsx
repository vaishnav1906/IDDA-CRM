import { FormNumberFieldInput } from '@/object-record/record-field/ui/form-types/components/FormNumberFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { type WorkflowIddaUpdateSlaAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { type SelectOption } from 'twenty-ui/input';
import { HorizontalSeparator } from 'twenty-ui/layout';

type WorkflowEditActionIddaUpdateSlaProps = {
  action: WorkflowIddaUpdateSlaAction;
  actionOptions:
    | { readonly: true }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowIddaUpdateSlaAction) => void;
      };
};

const PRIORITY_OPTIONS: SelectOption<string>[] = [
  { value: 'URGENT', label: 'Urgent (4h)' },
  { value: 'HIGH', label: 'High (8h)' },
  { value: 'NORMAL', label: 'Normal (24h)' },
  { value: 'LOW', label: 'Low (72h)' },
];

const USE_CALENDAR_OPTIONS: SelectOption<string>[] = [
  { value: 'true', label: 'Business hours only' },
  { value: 'false', label: 'Wall-clock (24/7)' },
];

export const WorkflowEditActionIddaUpdateSla = ({
  action,
  actionOptions,
}: WorkflowEditActionIddaUpdateSlaProps) => {
  const readonly = actionOptions.readonly === true;

  const handleInputUpdate = (
    patch: Partial<WorkflowIddaUpdateSlaAction['settings']['input']>,
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
          label={t`Record ID`}
          defaultValue={action.settings.input.recordId}
          onChange={(recordId) => handleInputUpdate({ recordId })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`{{trigger.record.id}}`}
        />

        <FormTextFieldInput
          label={t`Object Name`}
          defaultValue={action.settings.input.objectSingularName}
          onChange={(objectSingularName) =>
            handleInputUpdate({ objectSingularName })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`lead`}
        />

        <FormTextFieldInput
          label={t`SLA Field Name`}
          defaultValue={action.settings.input.slaFieldName}
          onChange={(slaFieldName) => handleInputUpdate({ slaFieldName })}
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`slaDeadline`}
        />

        <HorizontalSeparator noMargin />

        <Select
          dropdownId="idda-sla-priority"
          label={t`Priority`}
          options={PRIORITY_OPTIONS}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={action.settings.input.priority ?? 'NORMAL'}
          onChange={(priority) => handleInputUpdate({ priority })}
          disabled={readonly}
        />

        <Select
          dropdownId="idda-sla-calendar"
          label={t`SLA Calculation`}
          options={USE_CALENDAR_OPTIONS}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={String(action.settings.input.useBusinessCalendar)}
          onChange={(value) =>
            handleInputUpdate({ useBusinessCalendar: value === 'true' })
          }
          disabled={readonly}
        />

        <FormNumberFieldInput
          label={t`Custom SLA Hours (optional, overrides priority)`}
          defaultValue={action.settings.input.customSlaHours}
          onChange={(customSlaHours) =>
            handleInputUpdate({
              customSlaHours: customSlaHours
                ? Number(customSlaHours)
                : undefined,
            })
          }
          readonly={readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`0`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
