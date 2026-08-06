import { styled } from '@linaria/react';

import { VISIT_NOTES_QUICK_REASONS } from '../constants/visitVerificationConfig';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
`;

const StyledLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StyledRequired = styled.span`
  color: #EF4444;
`;

const StyledChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const StyledChip = styled.button`
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid #D1D5DB;
  background: #F9FAFB;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: #E5E7EB;
    border-color: #9CA3AF;
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  padding: 10px;
  font-size: 14px;
  color: #111827;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const StyledCharCount = styled.span<{ isNearLimit: boolean }>`
  font-size: 11px;
  color: ${({ isNearLimit }) => (isNearLimit ? '#F59E0B' : '#9CA3AF')};
  text-align: right;
`;

const MAX_LENGTH = 1000;
const MIN_LENGTH = 10;

type VisitNotesInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export const VisitNotesInput = ({ value, onChange }: VisitNotesInputProps) => {
  const handleChipClick = (reason: string) => {
    const separator = value.trim().length > 0 ? '. ' : '';
    const next = value + separator + reason;

    onChange(next.slice(0, MAX_LENGTH));
  };

  return (
    <StyledContainer>
      <StyledLabel>
        Visit Notes <StyledRequired>*</StyledRequired>
      </StyledLabel>

      <StyledChipsRow>
        {VISIT_NOTES_QUICK_REASONS.map((reason) => (
          <StyledChip
            key={reason}
            type="button"
            onClick={() => handleChipClick(reason)}
          >
            {reason}
          </StyledChip>
        ))}
      </StyledChipsRow>

      <StyledTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the purpose and outcome of this visit…"
        maxLength={MAX_LENGTH}
      />

      <StyledCharCount isNearLimit={value.length > MAX_LENGTH * 0.9}>
        {value.length} / {MAX_LENGTH}
        {value.trim().length < MIN_LENGTH && value.length > 0 && (
          <span style={{ color: '#EF4444', marginLeft: 8 }}>
            Minimum {MIN_LENGTH} characters required
          </span>
        )}
      </StyledCharCount>
    </StyledContainer>
  );
};
