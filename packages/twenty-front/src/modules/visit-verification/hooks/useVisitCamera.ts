import { useCallback, useEffect, useRef, useState } from 'react';

import { VISIT_VERIFICATION_CONFIG } from '../constants/visitVerificationConfig';

export const useVisitCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsCameraReady(false);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: VISIT_VERIFICATION_CONFIG.selfie.idealWidth },
          height: { ideal: VISIT_VERIFICATION_CONFIG.selfie.idealHeight },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera access denied';

      setError(`Camera unavailable: ${message}`);
    }
  }, []);

  const captureImage = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      setError('Camera not ready');

      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL(
      'image/jpeg',
      VISIT_VERIFICATION_CONFIG.selfie.jpegQuality,
    );

    setCapturedBase64(base64);

    // Stop the stream after capture to release camera
    stream?.getTracks().forEach((t) => t.stop());
    setIsCameraReady(false);
  }, [stream]);

  const retake = useCallback(() => {
    setCapturedBase64(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    isCameraReady,
    capturedBase64,
    startCamera,
    captureImage,
    retake,
    error,
  };
};
