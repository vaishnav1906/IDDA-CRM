import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { Toggle } from 'twenty-ui/input';

import { type BusinessDayHours, type BusinessWeekSchedule, DAY_LABELS } from '@/settings/idda-business-calendar/types/businessCalendar.type';

type BusinessCalendarWeekScheduleProps = {
  schedule: BusinessWeekSchedule;
  onChange: (schedule: BusinessWeekSchedule) => void;
  readonly?: boolean;
};

const StyledTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: 120px 44px 1fr 1fr;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledTimeInput = styled.input`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:disabled {
    color: ${themeCssVariables.font.color.light};
    cursor: not-allowed;
  }

  &:focus {
    border-color: ${themeCssVariables.color.blue};
    outline: none;
  }
`;

const StyledClosedLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const BusinessCalendarWeekSchedule = ({
  schedule,
  onChange,
  readonly = false,
}: BusinessCalendarWeekScheduleProps) => {
  const handleToggle = (key: keyof BusinessWeekSchedule, enabled: boolean) => {
    onChange({
      ...schedule,
      [key]: enabled ? { open: '09:00', close: '18:00' } : null,
    });
  };

  const handleTimeChange = (
    key: keyof BusinessWeekSchedule,
    field: keyof BusinessDayHours,
    value: string,
  ) => {
    const existing = schedule[key];

    if (!existing) return;
    onChange({ ...schedule, [key]: { ...existing, [field]: value } });
  };

  return (
    <StyledTable>
      {DAY_LABELS.map(({ key, label }) => {
        const day = schedule[key];
        const isEnabled = day !== null;

        return (
          <StyledRow key={key}>
            <StyledLabel>{label}</StyledLabel>
            <Toggle
              value={isEnabled}
              onChange={(val) => handleToggle(key, val)}
              disabled={readonly}
            />
            {isEnabled ? (
              <>
                <StyledTimeInput
                  type="time"
                  value={day?.open ?? '09:00'}
                  onChange={(e) =>
                    handleTimeChange(key, 'open', e.target.value)
                  }
                  disabled={readonly}
                  aria-label={`${label} open time`}
                />
                <StyledTimeInput
                  type="time"
                  value={day?.close ?? '18:00'}
                  onChange={(e) =>
                    handleTimeChange(key, 'close', e.target.value)
                  }
                  disabled={readonly}
                  aria-label={`${label} close time`}
                />
              </>
            ) : (
              <StyledClosedLabel>{t`Closed`}</StyledClosedLabel>
            )}
          </StyledRow>
        );
      })}
    </StyledTable>
  );
};
