import { useCallback, useEffect, useState } from 'react';

import { styled } from '@linaria/react';

import { VisitCameraCapture } from './VisitCameraCapture';
import { VisitNotesInput } from './VisitNotesInput';
import { VisitVerificationScore } from './VisitVerificationScore';
import { useVerifyVisit } from '../hooks/useVerifyVisit';
import { useVisitGps } from '../hooks/useVisitGps';
import {
  type VerifyVisitOutput,
  type VisitVerificationStep,
} from '../types/visitVerification.types';

// ─── Styled Components ────────────────────────────────────────────────────────

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
`;

const StyledStepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
`;

const StyledStepDot = styled.div<{ active: boolean; completed: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: ${({ active, completed }) =>
    completed ? '#10B981' : active ? '#3B82F6' : '#E5E7EB'};
  color: ${({ active, completed }) =>
    active || completed ? '#fff' : '#6B7280'};
`;

const StyledStepLine = styled.div<{ completed: boolean }>`
  width: 32px;
  height: 2px;
  background: ${({ completed }) => (completed ? '#10B981' : '#E5E7EB')};
`;

const StyledStepLabel = styled.span`
  font-size: 11px;
  color: #6B7280;
  text-align: center;
  display: block;
  margin-top: 2px;
`;

const StyledContent = styled.div`
  flex: 1;
  min-height: 200px;
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #E5E7EB;
  gap: 12px;
`;

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  background: ${({ variant }) => {
    if (variant === 'secondary') return '#6B7280';
    if (variant === 'danger') return '#EF4444';

    return '#3B82F6';
  }};
  color: #fff;

  &:disabled {
    background: #9CA3AF;
    cursor: not-allowed;
  }
`;

const StyledGpsStatus = styled.p`
  font-size: 13px;
  color: #374151;
  text-align: center;
  padding: 32px 16px;
  margin: 0;
`;

const StyledError = styled.p`
  font-size: 13px;
  color: #EF4444;
  text-align: center;
  padding: 8px 16px;
  margin: 0;
`;

const StyledLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #374151;
  z-index: 10;
`;

// ─── Step helpers ─────────────────────────────────────────────────────────────

const STEPS: VisitVerificationStep[] = ['selfie', 'location', 'notes', 'result'];
const STEP_LABELS: Record<VisitVerificationStep, string> = {
  selfie: 'Selfie',
  location: 'Location',
  notes: 'Notes',
  result: 'Result',
};
const STEP_NUMBERS: Record<VisitVerificationStep, number> = {
  selfie: 1,
  location: 2,
  notes: 3,
  result: 4,
};

// ─── Component ────────────────────────────────────────────────────────────────

type VisitVerificationFlowProps = {
  visitId: string;
  clinicId: string;
  onComplete: (result: VerifyVisitOutput) => void;
  onCancel: () => void;
};

export const VisitVerificationFlow = ({
  visitId,
  clinicId,
  onComplete,
  onCancel,
}: VisitVerificationFlowProps) => {
  const [currentStep, setCurrentStep] = useState<VisitVerificationStep>('selfie');
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<VerifyVisitOutput | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { verifyVisit, loading } = useVerifyVisit();
  const { coords, isLoading: gpsLoading, error: gpsError, acquireGps } = useVisitGps();

  // Auto-trigger GPS on entering location step
  useEffect(() => {
    if (currentStep === 'location' && coords === null && !gpsLoading) {
      acquireGps();
    }
  }, [currentStep, coords, gpsLoading, acquireGps]);

  const stepIndex = STEPS.indexOf(currentStep);

  const handleNext = useCallback(() => {
    if (currentStep === 'selfie' && capturedBase64) {
      setCurrentStep('location');
    } else if (currentStep === 'location' && coords) {
      setCurrentStep('notes');
    }
  }, [currentStep, capturedBase64, coords]);

  const handleSubmit = useCallback(async () => {
    if (!capturedBase64 || !coords || notes.trim().length < 10) return;

    setMutationError(null);

    try {
      const output = await verifyVisit({
        visitId,
        clinicId,
        visitNotes: notes,
        selfieBase64: capturedBase64,
        latitude: coords.latitude,
        longitude: coords.longitude,
        gpsAccuracy: coords.accuracy,
        captureSource: 'CRM_WEB_CAMERA',
      });

      setResult(output);
      setCurrentStep('result');
      onComplete(output);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';

      setMutationError(msg);
    }
  }, [capturedBase64, coords, notes, verifyVisit, visitId, clinicId, onComplete]);

  const renderStepIndicator = () => (
    <StyledStepIndicator>
      {STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <StyledStepDot
              active={step === currentStep}
              completed={stepIndex > i}
            >
              {STEP_NUMBERS[step]}
            </StyledStepDot>
            {i < STEPS.length - 1 && (
              <StyledStepLine completed={stepIndex > i} />
            )}
          </div>
          <StyledStepLabel>{STEP_LABELS[step]}</StyledStepLabel>
        </div>
      ))}
    </StyledStepIndicator>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'selfie':
        return (
          <VisitCameraCapture
            onImageCaptured={(base64) => setCapturedBase64(base64)}
          />
        );

      case 'location':
        if (gpsError) {
          return (
            <StyledGpsStatus>
              <StyledError>{gpsError}</StyledError>
              <StyledButton onClick={acquireGps} style={{ marginTop: 12 }}>
                Retry GPS
              </StyledButton>
            </StyledGpsStatus>
          );
        }

        if (gpsLoading) {
          return (
            <StyledGpsStatus>
              Acquiring GPS location… Please wait.
            </StyledGpsStatus>
          );
        }

        if (coords) {
          return (
            <StyledGpsStatus>
              GPS acquired. Accuracy: {Math.round(coords.accuracy)} m.
              <br />
              Lat: {coords.latitude.toFixed(5)}, Lon:{' '}
              {coords.longitude.toFixed(5)}
            </StyledGpsStatus>
          );
        }

        return (
          <StyledGpsStatus>
            Waiting for GPS…
          </StyledGpsStatus>
        );

      case 'notes':
        return (
          <VisitNotesInput value={notes} onChange={setNotes} />
        );

      case 'result':
        return result ? (
          <VisitVerificationScore result={result} />
        ) : null;
    }
  };

  const canAdvance = () => {
    if (currentStep === 'selfie') return !!capturedBase64;
    if (currentStep === 'location') return !!coords;

    return false;
  };

  return (
    <StyledWrapper>
      {renderStepIndicator()}

      <div style={{ position: 'relative' }}>
        {loading && (
          <StyledLoadingOverlay>Verifying visit…</StyledLoadingOverlay>
        )}
        <StyledContent>{renderStepContent()}</StyledContent>
      </div>

      {mutationError && <StyledError>{mutationError}</StyledError>}

      <StyledFooter>
        <StyledButton variant="secondary" onClick={onCancel}>
          Cancel
        </StyledButton>

        {currentStep === 'selfie' && (
          <StyledButton onClick={handleNext} disabled={!canAdvance()}>
            Next: Location
          </StyledButton>
        )}

        {currentStep === 'location' && (
          <StyledButton onClick={handleNext} disabled={!canAdvance()}>
            Next: Notes
          </StyledButton>
        )}

        {currentStep === 'notes' && (
          <StyledButton
            onClick={handleSubmit}
            disabled={loading || notes.trim().length < 10}
          >
            {loading ? 'Verifying…' : 'Submit Verification'}
          </StyledButton>
        )}
      </StyledFooter>
    </StyledWrapper>
  );
};
