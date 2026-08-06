import { useCallback, useEffect, useRef, useState } from 'react';

import { styled } from '@linaria/react';

import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { useSetReviewDecision } from '../hooks/useSetReviewDecision';

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitReviewState = {
  id: string;
  reviewDecision: string | null;
  reviewComment: string | null;
  verificationScore: number | null;
  verificationStatus: string | null;
  distanceFromClinic: number | null;
  selfieStatus: string | null;
  locationStatus: string | null;
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const StyledHeaderButton = styled.button<{ $decision: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid
    ${({ $decision }) =>
      $decision === 'APPROVED'
        ? '#D1FAE5'
        : $decision === 'REJECTED'
          ? '#FEE2E2'
          : '#E5E7EB'};
  background: ${({ $decision }) =>
    $decision === 'APPROVED'
      ? '#ECFDF5'
      : $decision === 'REJECTED'
        ? '#FEF2F2'
        : '#fff'};
  color: ${({ $decision }) =>
    $decision === 'APPROVED'
      ? '#065F46'
      : $decision === 'REJECTED'
        ? '#991B1B'
        : '#374151'};
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
`;

const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
`;

const StyledModal = styled.div`
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const StyledModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #F3F4F6;
`;

const StyledModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const StyledCloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #9CA3AF;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #F3F4F6;
    color: #374151;
  }
`;

const StyledModalBody = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StyledSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const StyledSummaryCard = styled.div<{ $variant?: 'good' | 'warn' | 'bad' | 'neutral' }>`
  padding: 10px 14px;
  border-radius: 8px;
  background: ${({ $variant }) =>
    $variant === 'good'
      ? '#ECFDF5'
      : $variant === 'warn'
        ? '#FFFBEB'
        : $variant === 'bad'
          ? '#FEF2F2'
          : '#F9FAFB'};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'good'
        ? '#A7F3D0'
        : $variant === 'warn'
          ? '#FDE68A'
          : $variant === 'bad'
            ? '#FECACA'
            : '#E5E7EB'};
`;

const StyledSummaryLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
`;

const StyledSummaryValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid #F3F4F6;
  margin: 0;
`;

const StyledCurrentDecision = styled.div<{ $decision: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: ${({ $decision }) =>
    $decision === 'APPROVED'
      ? '#ECFDF5'
      : $decision === 'REJECTED'
        ? '#FEF2F2'
        : '#F9FAFB'};
  color: ${({ $decision }) =>
    $decision === 'APPROVED'
      ? '#065F46'
      : $decision === 'REJECTED'
        ? '#991B1B'
        : '#6B7280'};
  border: 1px solid
    ${({ $decision }) =>
      $decision === 'APPROVED'
        ? '#A7F3D0'
        : $decision === 'REJECTED'
          ? '#FECACA'
          : '#E5E7EB'};
`;

const StyledCommentLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  display: block;
  margin-bottom: 6px;
`;

const StyledCommentTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  color: #111827;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: #6366F1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const StyledActions = styled.div`
  display: flex;
  gap: 10px;
`;

const StyledActionButton = styled.button<{ $variant: 'approve' | 'reject' | 'reset' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;

  background: ${({ $variant }) =>
    $variant === 'approve'
      ? '#10B981'
      : $variant === 'reject'
        ? '#EF4444'
        : '#9CA3AF'};
  color: #fff;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    opacity: 0.9;
  }
`;

const StyledError = styled.p`
  font-size: 13px;
  color: #EF4444;
  margin: 0;
  text-align: center;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const decisionLabel: Record<string, string> = {
  APPROVED: '✓ Approved',
  REJECTED: '✗ Rejected',
  PENDING: '⏳ Pending Review',
};

const decisionIcon: Record<string, string> = {
  APPROVED: '✓',
  REJECTED: '✗',
  PENDING: '⋯',
};

const scoreVariant = (score: number | null) => {
  if (score === null) return 'neutral' as const;
  if (score >= 80) return 'good' as const;
  if (score >= 50) return 'warn' as const;
  return 'bad' as const;
};

const statusVariant = (status: string | null) => {
  if (!status) return 'neutral' as const;
  if (status === 'VERIFIED') return 'good' as const;
  if (status === 'PARTIALLY_VERIFIED') return 'warn' as const;
  if (status === 'NEEDS_REVIEW') return 'warn' as const;
  return 'bad' as const;
};

const locationVariant = (status: string | null) => {
  if (!status) return 'neutral' as const;
  if (status === 'INSIDE_GEOFENCE') return 'good' as const;
  if (status === 'OUTSIDE_GEOFENCE') return 'bad' as const;
  return 'warn' as const;
};

// ─── Component ────────────────────────────────────────────────────────────────

type VisitReviewButtonProps = {
  objectRecordId: string;
};

export const VisitReviewButton = ({ objectRecordId }: VisitReviewButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [visitState, setVisitState] = useState<VisitReviewState | null>(null);
  const [comment, setComment] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { setReviewDecision, loading: submitting } = useSetReviewDecision();

  const { findOneRecord } = useLazyFindOneRecord<VisitReviewState>({
    objectNameSingular: 'visit',
    recordGqlFields: {
      id: true,
      reviewDecision: true,
      reviewComment: true,
      verificationScore: true,
      verificationStatus: true,
      distanceFromClinic: true,
      selfieStatus: true,
      locationStatus: true,
    },
  });

  const loadVisit = useCallback(() => {
    findOneRecord({
      objectRecordId,
      onCompleted: (record) => {
        setVisitState(record);
        setComment(record.reviewComment ?? '');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectRecordId]);

  // Load on mount for the header button label
  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setMutationError(null);
    loadVisit();
    setIsOpen(true);
  }, [loadVisit]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  const handleDecision = useCallback(
    async (decision: 'APPROVED' | 'REJECTED' | 'PENDING') => {
      setMutationError(null);
      try {
        const result = await setReviewDecision({
          visitId: objectRecordId,
          decision,
          reviewComment: comment.trim() || undefined,
        });
        setVisitState((prev) =>
          prev
            ? {
                ...prev,
                reviewDecision: result.reviewDecision,
                reviewComment: result.reviewComment,
              }
            : prev,
        );
        setIsOpen(false);
      } catch (err) {
        setMutationError(
          err instanceof Error ? err.message : 'Failed to save decision.',
        );
      }
    },
    [setReviewDecision, objectRecordId, comment],
  );

  const currentDecision = visitState?.reviewDecision ?? 'PENDING';

  return (
    <>
      <StyledHeaderButton $decision={currentDecision} onClick={handleOpen}>
        <span>{decisionIcon[currentDecision] ?? '⋯'}</span>
        {decisionLabel[currentDecision] ?? 'Review Visit'}
      </StyledHeaderButton>

      {isOpen && (
        <StyledOverlay onClick={handleOverlayClick}>
          <StyledModal>
            <StyledModalHeader>
              <StyledModalTitle>Review Visit</StyledModalTitle>
              <StyledCloseBtn onClick={handleClose} aria-label="Close">✕</StyledCloseBtn>
            </StyledModalHeader>

            <StyledModalBody>
              {/* Verification summary */}
              <StyledSummaryGrid>
                <StyledSummaryCard $variant={scoreVariant(visitState?.verificationScore ?? null)}>
                  <StyledSummaryLabel>Score</StyledSummaryLabel>
                  <StyledSummaryValue>
                    {visitState?.verificationScore ?? '—'} / 100
                  </StyledSummaryValue>
                </StyledSummaryCard>

                <StyledSummaryCard $variant={statusVariant(visitState?.verificationStatus ?? null)}>
                  <StyledSummaryLabel>AI Status</StyledSummaryLabel>
                  <StyledSummaryValue>
                    {visitState?.verificationStatus?.replace(/_/g, ' ') ?? '—'}
                  </StyledSummaryValue>
                </StyledSummaryCard>

                <StyledSummaryCard $variant={locationVariant(visitState?.locationStatus ?? null)}>
                  <StyledSummaryLabel>GPS</StyledSummaryLabel>
                  <StyledSummaryValue>
                    {visitState?.distanceFromClinic != null
                      ? `${Math.round(visitState.distanceFromClinic)} m`
                      : '—'}
                  </StyledSummaryValue>
                </StyledSummaryCard>

                <StyledSummaryCard
                  $variant={
                    visitState?.selfieStatus === 'VERIFIED'
                      ? 'good'
                      : visitState?.selfieStatus
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  <StyledSummaryLabel>Selfie</StyledSummaryLabel>
                  <StyledSummaryValue>
                    {visitState?.selfieStatus?.replace(/_/g, ' ') ?? '—'}
                  </StyledSummaryValue>
                </StyledSummaryCard>
              </StyledSummaryGrid>

              <StyledDivider />

              {/* Current decision */}
              <StyledCurrentDecision $decision={currentDecision}>
                Current decision: {decisionLabel[currentDecision] ?? 'Pending Review'}
              </StyledCurrentDecision>

              {/* Comment */}
              <div>
                <StyledCommentLabel htmlFor="review-comment">
                  Comment (optional — shown to team)
                </StyledCommentLabel>
                <StyledCommentTextarea
                  id="review-comment"
                  placeholder="Add a note about this visit…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>

              {mutationError && (
                <StyledError>{mutationError}</StyledError>
              )}

              {/* Action buttons */}
              <StyledActions>
                <StyledActionButton
                  $variant="reject"
                  disabled={submitting}
                  onClick={() => handleDecision('REJECTED')}
                >
                  {submitting ? '…' : '✕ Reject'}
                </StyledActionButton>
                <StyledActionButton
                  $variant="approve"
                  disabled={submitting}
                  onClick={() => handleDecision('APPROVED')}
                >
                  {submitting ? '…' : '✓ Approve'}
                </StyledActionButton>
              </StyledActions>

              {currentDecision !== 'PENDING' && (
                <StyledActionButton
                  $variant="reset"
                  disabled={submitting}
                  onClick={() => handleDecision('PENDING')}
                  style={{ marginTop: -6 }}
                >
                  Reset to Pending
                </StyledActionButton>
              )}
            </StyledModalBody>
          </StyledModal>
        </StyledOverlay>
      )}
    </>
  );
};
