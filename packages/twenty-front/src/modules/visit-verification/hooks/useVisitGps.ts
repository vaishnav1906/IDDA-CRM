import { useCallback, useState } from 'react';

import { VISIT_VERIFICATION_CONFIG } from '../constants/visitVerificationConfig';
import { type GpsCoords } from '../types/visitVerification.types';

export const useVisitGps = () => {
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acquireGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');

      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: VISIT_VERIFICATION_CONFIG.gps.enableHighAccuracy,
        timeout: VISIT_VERIFICATION_CONFIG.gps.timeout,
        maximumAge: VISIT_VERIFICATION_CONFIG.gps.maximumAge,
      },
    );
  }, []);

  return { coords, isLoading, error, acquireGps };
};
