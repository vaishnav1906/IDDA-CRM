import { useEffect } from 'react';

import { styled } from '@linaria/react';

import { useVisitCamera } from '../hooks/useVisitCamera';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
`;

const StyledVideoWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 4/3;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const StyledCanvas = styled.canvas`
  display: none;
`;

const StyledPreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 8px;
`;

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 24px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  background: ${({ variant }) =>
    variant === 'secondary' ? '#6B7280' : '#3B82F6'};
  color: #fff;

  &:hover {
    background: ${({ variant }) =>
      variant === 'secondary' ? '#4B5563' : '#2563EB'};
  }

  &:disabled {
    background: #9CA3AF;
    cursor: not-allowed;
  }
`;

const StyledError = styled.p`
  color: #EF4444;
  font-size: 13px;
  text-align: center;
  margin: 0;
`;

const StyledHint = styled.p`
  color: #6B7280;
  font-size: 13px;
  text-align: center;
  margin: 0;
`;

const StyledButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

type VisitCameraCaptureProps = {
  onImageCaptured: (base64: string) => void;
};

export const VisitCameraCapture = ({ onImageCaptured }: VisitCameraCaptureProps) => {
  const {
    videoRef,
    canvasRef,
    isCameraReady,
    capturedBase64,
    startCamera,
    captureImage,
    retake,
    error,
  } = useVisitCamera();

  useEffect(() => {
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (capturedBase64) {
      onImageCaptured(capturedBase64);
    }
  }, [capturedBase64, onImageCaptured]);

  if (error) {
    return (
      <StyledContainer>
        <StyledError>{error}</StyledError>
        <StyledButton onClick={startCamera}>Retry Camera</StyledButton>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <StyledVideoWrapper>
        {capturedBase64 ? (
          <StyledPreviewImage src={capturedBase64} alt="Captured selfie" />
        ) : (
          <StyledVideo ref={videoRef} muted playsInline />
        )}
      </StyledVideoWrapper>

      <StyledCanvas ref={canvasRef} />

      {capturedBase64 ? (
        <StyledButtonRow>
          <StyledButton variant="secondary" onClick={retake}>
            Retake
          </StyledButton>
        </StyledButtonRow>
      ) : (
        <>
          {!isCameraReady && (
            <StyledHint>Starting camera…</StyledHint>
          )}
          <StyledButton onClick={captureImage} disabled={!isCameraReady}>
            Capture Selfie
          </StyledButton>
        </>
      )}

      <StyledHint>
        Position your face clearly in the frame before capturing.
      </StyledHint>
    </StyledContainer>
  );
};
