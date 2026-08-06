import { useCallback, useState } from 'react';

import { type GeolocationState, type MapCoordinates } from '@/map-picker/types/mapLocation.types';

type UseCurrentLocationReturn = {
  geolocationState: GeolocationState;
  requestLocation: (onSuccess: (coords: MapCoordinates) => void) => void;
  resetGeolocation: () => void;
};

export const useCurrentLocation = (): UseCurrentLocationReturn => {
  const [geolocationState, setGeolocationState] = useState<GeolocationState>({
    status: 'idle',
  });

  const requestLocation = useCallback(
    (onSuccess: (coords: MapCoordinates) => void) => {
      if (!navigator.geolocation) {
        setGeolocationState({
          status: 'unavailable',
          message: 'Geolocation is not supported by your browser.',
        });
        return;
      }

      setGeolocationState({ status: 'requesting' });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: MapCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setGeolocationState({
            status: 'success',
            coords,
            accuracy: Math.round(position.coords.accuracy),
          });
          onSuccess(coords);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setGeolocationState({
              status: 'denied',
              message:
                'Location access was denied. Please allow location permission in your browser settings.',
            });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGeolocationState({
              status: 'unavailable',
              message: 'Your current location could not be determined.',
            });
          } else {
            setGeolocationState({
              status: 'unavailable',
              message: `Location error: ${error.message}`,
            });
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    },
    [],
  );

  const resetGeolocation = useCallback(() => {
    setGeolocationState({ status: 'idle' });
  }, []);

  return { geolocationState, requestLocation, resetGeolocation };
};
