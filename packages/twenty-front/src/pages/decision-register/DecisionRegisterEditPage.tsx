import { useEffect, useState } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useNavigate, useParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { IconArrowLeft, IconPlus, IconX } from 'twenty-ui/icon';

import { useDecisionRegisterApi } from '@/decision-register/hooks/useDecisionRegisterApi';
import {
  Decision,
  DECISION_CATEGORIES,
} from '@/decision-register/types/decision.type';

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledBack = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  margin-bottom: ${themeCssVariables.spacing[4]};
  padding: 0;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  margin-top: ${themeCssVariables.spacing[5]};
`;

const StyledField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.label`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  color: ${themeCssVariables.font.color.primary};
`;

const StyledInput = styled.input`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  outline: none;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledTextarea = styled.textarea`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 100px;
  outline: none;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  resize: vertical;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledSelect = styled.select`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  outline: none;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  width: 100%;
  box-sizing: border-box;
`;

const StyledOptionRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTag = styled.span`
  align-items: center;
  background: ${themeCssVariables.color.blue}20;
  border-radius: 9999px;
  color: ${themeCssVariables.color.blue};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: 4px;
  padding: 2px ${themeCssVariables.spacing[2]};

  button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    padding: 0;
    color: inherit;
  }
`;

const StyledError = styled.span`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledReadonlyNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

export const DecisionRegisterEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDecision, updateDecision } = useDecisionRegisterApi();

  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);

  const [context, setContext] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('');
  const [category, setCategory] = useState('');
  const [outcome, setOutcome] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDefined(id)) return;
    getDecision(id)
      .then((d) => {
        setDecision(d);
        setContext(d.context);
        setDecisionSummary(d.decisionSummary);
        setCategory(d.category ?? '');
        setOutcome(d.outcome ?? '');
        setTags(d.tags ?? []);
        setOptions(d.options.map((o) => o.optionText));
      })
      .catch(() => setDecision(null))
      .finally(() => setLoading(false));
  }, [id, getDecision]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!context.trim()) next['context'] = t`Context is required`;
    if (!decisionSummary.trim()) next['decisionSummary'] = t`Decision summary is required`;
    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const addTag = () => {
    const val = tagInput.trim();

    if (val && !tags.includes(val)) setTags([...tags, val]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const addOption = () => {
    const val = optionInput.trim();

    if (val) setOptions([...options, val]);
    setOptionInput('');
  };

  const removeOption = (idx: number) =>
    setOptions(options.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !isDefined(id)) return;
    setSaving(true);
    try {
      await updateDecision(id, {
        context: context.trim(),
        decisionSummary: decisionSummary.trim(),
        category: category || undefined,
        outcome: outcome.trim() || undefined,
        tags,
        options,
      });
      navigate(`/decision-register/${id}`);
    } catch {
      setErrors({ form: t`Failed to save changes. Please try again.` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StyledPage>{t`Loading…`}</StyledPage>;
  }

  if (!isDefined(decision)) {
    return <StyledPage>{t`Decision not found.`}</StyledPage>;
  }

  return (
    <StyledPage>
      <StyledBack onClick={() => navigate(`/decision-register/${id}`)}>
        <IconArrowLeft size={16} />
        {t`Back to decision`}
      </StyledBack>

      <H2Title
        title={t`Edit Decision`}
        description={decision.title}
      />
      <StyledReadonlyNote>
        {t`Title, Created By, and Created At cannot be edited.`}
      </StyledReadonlyNote>

      <StyledForm onSubmit={handleSubmit}>
        <StyledField>
          <StyledLabel>{t`Context`}</StyledLabel>
          <StyledTextarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          {errors['context'] && <StyledError>{errors['context']}</StyledError>}
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Decision Summary`}</StyledLabel>
          <StyledTextarea
            value={decisionSummary}
            onChange={(e) => setDecisionSummary(e.target.value)}
          />
          {errors['decisionSummary'] && (
            <StyledError>{errors['decisionSummary']}</StyledError>
          )}
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Category`}</StyledLabel>
          <StyledSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t`None`}</option>
            {DECISION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </StyledSelect>
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Alternative Options`}</StyledLabel>
          <StyledOptionRow>
            <StyledInput
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              placeholder={t`Add an option…`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <Button
              title=""
              Icon={IconPlus}
              size="small"
              variant="secondary"
              onClick={addOption}
              type="button"
            />
          </StyledOptionRow>
          {options.map((opt, idx) => (
            <StyledOptionRow key={idx}>
              <span style={{ flex: 1, fontSize: '14px' }}>{opt}</span>
              <Button
                title=""
                Icon={IconX}
                size="small"
                variant="tertiary"
                onClick={() => removeOption(idx)}
                type="button"
              />
            </StyledOptionRow>
          ))}
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Tags`}</StyledLabel>
          <StyledTagRow>
            {tags.map((tag) => (
              <StyledTag key={tag}>
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <IconX size={10} />
                </button>
              </StyledTag>
            ))}
          </StyledTagRow>
          <StyledOptionRow>
            <StyledInput
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={t`Add a tag…`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button
              title=""
              Icon={IconPlus}
              size="small"
              variant="secondary"
              onClick={addTag}
              type="button"
            />
          </StyledOptionRow>
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Outcome`}</StyledLabel>
          <StyledTextarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder={t`Record the outcome after implementation`}
          />
        </StyledField>

        {errors['form'] && <StyledError>{errors['form']}</StyledError>}

        <StyledActions>
          <Button
            title={t`Cancel`}
            size="small"
            variant="secondary"
            onClick={() => navigate(`/decision-register/${id}`)}
            type="button"
          />
          <Button
            title={saving ? t`Saving…` : t`Save Changes`}
            size="small"
            variant="primary"
            type="submit"
            disabled={saving}
          />
        </StyledActions>
      </StyledForm>
    </StyledPage>
  );
};
