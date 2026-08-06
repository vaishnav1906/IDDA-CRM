import { styled } from '@linaria/react';

import {
  SCORE_FACTOR_LABELS,
  SCORE_FACTOR_MAX,
  VERIFICATION_STATUS_COLORS,
  VERIFICATION_STATUS_LABELS,
} from '../constants/visitVerificationConfig';
import { type VerifyVisitOutput } from '../types/visitVerification.types';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
`;

const StyledScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StyledScoreNumber = styled.span<{ color: string }>`
  font-size: 48px;
  font-weight: 700;
  color: ${({ color }) => color};
  line-height: 1;
`;

const StyledStatusBadge = styled.span<{ color: string }>`
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${({ color }) => color};
`;

const StyledSectionTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const StyledBreakdownList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledBreakdownItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #374151;
`;

const StyledEarned = styled.span<{ earned: number; max: number }>`
  font-weight: 600;
  color: ${({ earned, max }) =>
    earned === max ? '#10B981' : earned > 0 ? '#F59E0B' : '#9CA3AF'};
`;

const StyledIssueList = styled.ul`
  margin: 0;
  padding-left: 16px;
  list-style: disc;
`;

const StyledIssueItem = styled.li`
  font-size: 13px;
  color: #EF4444;
  margin-bottom: 4px;
`;

const StyledLocationInfo = styled.p`
  font-size: 13px;
  color: #6B7280;
  margin: 0;
`;

type VisitVerificationScoreProps = {
  result: VerifyVisitOutput;
};

export const VisitVerificationScore = ({
  result,
}: VisitVerificationScoreProps) => {
  const statusColor =
    VERIFICATION_STATUS_COLORS[result.verificationStatus] ?? '#6B7280';
  const statusLabel =
    VERIFICATION_STATUS_LABELS[result.verificationStatus] ?? result.verificationStatus;

  return (
    <StyledContainer>
      <StyledScoreRow>
        <StyledScoreNumber color={statusColor}>
          {result.verificationScore}
        </StyledScoreNumber>
        <div>
          <StyledStatusBadge color={statusColor}>{statusLabel}</StyledStatusBadge>
          <StyledLocationInfo>
            Distance from clinic: {Math.round(result.distanceFromClinic)} m
          </StyledLocationInfo>
        </div>
      </StyledScoreRow>

      <div>
        <StyledSectionTitle>Score Breakdown</StyledSectionTitle>
        <StyledBreakdownList>
          {Object.entries(result.scoreBreakdown).map(([key, earned]) => {
            const max = SCORE_FACTOR_MAX[key] ?? 0;
            const label = SCORE_FACTOR_LABELS[key] ?? key;

            return (
              <StyledBreakdownItem key={key}>
                <span>{label}</span>
                <StyledEarned earned={earned} max={max}>
                  {earned} / {max}
                </StyledEarned>
              </StyledBreakdownItem>
            );
          })}
        </StyledBreakdownList>
      </div>

      {result.issues.length > 0 && (
        <div>
          <StyledSectionTitle>Issues</StyledSectionTitle>
          <StyledIssueList>
            {result.issues.map((issue, i) => (
              <StyledIssueItem key={i}>{issue}</StyledIssueItem>
            ))}
          </StyledIssueList>
        </div>
      )}

      {result.imageReused && (
        <StyledLocationInfo style={{ color: '#EF4444' }}>
          Warning: This image has been used in a previous visit.
        </StyledLocationInfo>
      )}
    </StyledContainer>
  );
};
