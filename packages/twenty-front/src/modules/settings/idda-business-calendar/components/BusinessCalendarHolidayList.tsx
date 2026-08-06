import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { Button } from 'twenty-ui/input';
import { IconPlus, IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type BusinessHoliday } from '@/settings/idda-business-calendar/types/businessCalendar.type';

type BusinessCalendarHolidayListProps = {
  holidays: BusinessHoliday[];
  onChange: (holidays: BusinessHoliday[]) => void;
  readonly?: boolean;
};

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 160px 1fr 32px;
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:focus {
    border-color: ${themeCssVariables.color.blue};
    outline: none;
  }
`;

const StyledRemoveButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  height: 28px;
  justify-content: center;
  padding: 0;
  width: 28px;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
    color: ${themeCssVariables.color.red};
  }
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

export const BusinessCalendarHolidayList = ({
  holidays,
  onChange,
  readonly = false,
}: BusinessCalendarHolidayListProps) => {
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newDate || !newName.trim()) return;
    onChange([...holidays, { date: newDate, name: newName.trim() }]);
    setNewDate('');
    setNewName('');
  };

  const handleRemove = (index: number) => {
    onChange(holidays.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <StyledList>
      {holidays.length === 0 && (
        <StyledEmptyState>{t`No holidays configured`}</StyledEmptyState>
      )}
      {holidays.map((holiday, i) => (
        <StyledRow key={`${holiday.date}-${i}`}>
          <StyledInput
            type="date"
            value={holiday.date}
            onChange={(e) => {
              const updated = [...holidays];

              updated[i] = { ...updated[i], date: e.target.value };
              onChange(updated);
            }}
            disabled={readonly}
          />
          <StyledInput
            type="text"
            value={holiday.name}
            onChange={(e) => {
              const updated = [...holidays];

              updated[i] = { ...updated[i], name: e.target.value };
              onChange(updated);
            }}
            disabled={readonly}
            placeholder={t`Holiday name`}
          />
          {!readonly && (
            <StyledRemoveButton
              onClick={() => handleRemove(i)}
              aria-label={`Remove ${holiday.name}`}
              type="button"
            >
              <IconTrash size={14} />
            </StyledRemoveButton>
          )}
        </StyledRow>
      ))}

      {!readonly && (
        <StyledRow>
          <StyledInput
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="YYYY-MM-DD"
          />
          <StyledInput
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t`Holiday name`}
          />
          <Button
            Icon={IconPlus}
            title=""
            size="small"
            onClick={handleAdd}
            disabled={!newDate || !newName.trim()}
            aria-label={t`Add holiday`}
          />
        </StyledRow>
      )}
    </StyledList>
  );
};
