import { useCallback, useEffect, useState } from 'react';

import { styled } from '@linaria/react';

import { useClinicPhotoUrl } from '../hooks/useClinicPhotoUrl';

// ─── Styled Components ────────────────────────────────────────────────────────

const StyledTriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #E5E7EB;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #F9FAFB;
    border-color: #D1D5DB;
  }
`;

const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
`;

const StyledLightboxContent = styled.div`
  position: relative;
  max-width: min(90vw, 900px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: #111827;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #1F2937;
  border-bottom: 1px solid #374151;
  flex-shrink: 0;
`;

const StyledTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #F9FAFB;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #9CA3AF;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #374151;
    color: #F9FAFB;
  }
`;

const StyledImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: calc(90vh - 60px);
  object-fit: contain;
  width: 100%;
`;

const StyledLoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #9CA3AF;
  font-size: 14px;
  min-width: 320px;
`;

const StyledErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #EF4444;
  font-size: 14px;
  min-width: 320px;
  text-align: center;
`;

// ─── Component ────────────────────────────────────────────────────────────────

type VisitClinicPhotoViewerProps = {
  objectRecordId: string;
};

export const VisitClinicPhotoViewer = ({
  objectRecordId,
}: VisitClinicPhotoViewerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { photoUrl, loading, error } = useClinicPhotoUrl(objectRecordId);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  // Don't render the button at all if there's no photo
  if (!loading && !photoUrl) return null;

  return (
    <>
      <StyledTriggerButton onClick={handleOpen} disabled={loading}>
        <span>📷</span>
        {loading ? 'Checking photo…' : 'View Clinic Photo'}
      </StyledTriggerButton>

      {isOpen && (
        <StyledOverlay onClick={handleOverlayClick}>
          <StyledLightboxContent>
            <StyledHeader>
              <StyledTitle>
                <span>📷</span>
                Clinic Exterior Photo
              </StyledTitle>
              <StyledCloseButton onClick={handleClose} aria-label="Close">
                ✕
              </StyledCloseButton>
            </StyledHeader>

            {loading && (
              <StyledLoadingState>Loading photo…</StyledLoadingState>
            )}

            {error && (
              <StyledErrorState>
                <span>⚠️</span>
                Could not load photo. Please try again.
              </StyledErrorState>
            )}

            {photoUrl && !loading && (
              <StyledImage
                src={photoUrl}
                alt="Clinic exterior"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                }}
              />
            )}
          </StyledLightboxContent>
        </StyledOverlay>
      )}
    </>
  );
};
