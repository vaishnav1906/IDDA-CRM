import { useEffect, useState } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useNavigate, useParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { IconArrowLeft, IconEdit } from 'twenty-ui/icon';

import { useDecisionRegisterApi } from '@/decision-register/hooks/useDecisionRegisterApi';
import { DecisionThreadSection } from '@/decision-register/components/DecisionThreadSection';
import { Decision } from '@/decision-register/types/decision.type';

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

const StyledHeaderRow = styled.div`
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledSection = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  margin-bottom: ${themeCssVariables.spacing[4]};
  overflow: hidden;
`;

const StyledSectionTitle = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.05em;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  text-transform: uppercase;
  color: ${themeCssVariables.font.color.tertiary};
`;

const StyledSectionBody = styled.div`
  font-size: ${themeCssVariables.font.size.sm};
  color: ${themeCssVariables.font.color.primary};
  line-height: 1.6;
  padding: ${themeCssVariables.spacing[4]};
  white-space: pre-wrap;
`;

const StyledMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  margin-bottom: ${themeCssVariables.spacing[5]};
`;

const StyledMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledMetaLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StyledMetaValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledChip = styled.span`
  background: ${themeCssVariables.color.blue}20;
  border-radius: 9999px;
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 2px ${themeCssVariables.spacing[2]};
`;

const StyledTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledOptionList = styled.ul`
  list-style: disc;
  margin: 0;
  padding: ${themeCssVariables.spacing[4]};
  padding-left: ${themeCssVariables.spacing[8]};
  font-size: ${themeCssVariables.font.size.sm};
  color: ${themeCssVariables.font.color.primary};
`;

const StyledEmpty = styled.div`
  text-align: center;
  padding: ${themeCssVariables.spacing[12]} 0;
  color: ${themeCssVariables.font.color.light};
`;

export const DecisionRegisterDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDecision, getPermissions } = useDecisionRegisterApi();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [canModerate, setCanModerate] = useState(false);

  useEffect(() => {
    if (!isDefined(id)) return;
    setLoading(true);
    Promise.all([getDecision(id), getPermissions()])
      .then(([dec, perms]) => {
        setDecision(dec);
        setCurrentUserId(perms.userId);
        setCanModerate(perms.canApprove);
      })
      .catch(() => setDecision(null))
      .finally(() => setLoading(false));
  }, [id, getDecision, getPermissions]);

  if (loading) {
    return <StyledPage><StyledEmpty>{t`Loading…`}</StyledEmpty></StyledPage>;
  }

  if (!isDefined(decision)) {
    return <StyledPage><StyledEmpty>{t`Decision not found.`}</StyledEmpty></StyledPage>;
  }

  return (
    <StyledPage>
      <StyledBack onClick={() => navigate('/decision-register')}>
        <IconArrowLeft size={16} />
        {t`Back to decisions`}
      </StyledBack>

      <StyledHeaderRow>
        <H2Title title={decision.title} description={decision.category ?? ''} />
        <Button
          title={t`Edit`}
          Icon={IconEdit}
          size="small"
          variant="secondary"
          onClick={() => navigate(`/decision-register/${decision.id}/edit`)}
        />
      </StyledHeaderRow>

      <StyledMeta>
        <StyledMetaItem>
          <StyledMetaLabel>{t`Created`}</StyledMetaLabel>
          <StyledMetaValue>
            {new Date(decision.createdAt).toLocaleDateString()}
          </StyledMetaValue>
        </StyledMetaItem>
        <StyledMetaItem>
          <StyledMetaLabel>{t`Updated`}</StyledMetaLabel>
          <StyledMetaValue>
            {new Date(decision.updatedAt).toLocaleDateString()}
          </StyledMetaValue>
        </StyledMetaItem>
        {isDefined(decision.category) && (
          <StyledMetaItem>
            <StyledMetaLabel>{t`Category`}</StyledMetaLabel>
            <StyledMetaValue>
              <StyledChip>{decision.category}</StyledChip>
            </StyledMetaValue>
          </StyledMetaItem>
        )}
      </StyledMeta>

      <StyledSection>
        <StyledSectionTitle>{t`Context`}</StyledSectionTitle>
        <StyledSectionBody>{decision.context}</StyledSectionBody>
      </StyledSection>

      <StyledSection>
        <StyledSectionTitle>{t`Decision Summary`}</StyledSectionTitle>
        <StyledSectionBody>{decision.decisionSummary}</StyledSectionBody>
      </StyledSection>

      {decision.options.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>{t`Alternative Options Considered`}</StyledSectionTitle>
          <StyledOptionList>
            {decision.options.map((opt) => (
              <li key={opt.id}>{opt.optionText}</li>
            ))}
          </StyledOptionList>
        </StyledSection>
      )}

      {isDefined(decision.outcome) && decision.outcome !== '' && (
        <StyledSection>
          <StyledSectionTitle>{t`Outcome`}</StyledSectionTitle>
          <StyledSectionBody>{decision.outcome}</StyledSectionBody>
        </StyledSection>
      )}

      {decision.tags && decision.tags.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>{t`Tags`}</StyledSectionTitle>
          <StyledTagRow>
            {decision.tags.map((tag) => (
              <StyledChip key={tag}>{tag}</StyledChip>
            ))}
          </StyledTagRow>
        </StyledSection>
      )}

      {isDefined(id) && (
        <DecisionThreadSection
          decisionId={id}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />
      )}
    </StyledPage>
  );
};
