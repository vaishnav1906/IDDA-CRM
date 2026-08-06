import { useCallback, useEffect, useRef, useState } from 'react';

import {
  importLibrary,
  setOptions,
} from '@googlemaps/js-api-loader';

import { REACT_APP_GOOGLE_MAPS_API_KEY } from '~/config';
import { type GoogleMapsLoadState } from '@/map-picker/types/mapLocation.types';

let mapsLoadPromise: Promise<void> | null = null;
let optionsSet = false;

export const useGoogleMapsLoader = () => {
  const [loadState, setLoadState] = useState<GoogleMapsLoadState>({
    status: 'idle',
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const apiKey = REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLoadState({
        status: 'error',
        message: 'Google Maps API key is not configured.',
      });
      return;
    }

    if (typeof window !== 'undefined' && window.google?.maps?.Map) {
      setLoadState({ status: 'loaded' });
      return;
    }

    setLoadState({ status: 'loading' });

    try {
      if (!mapsLoadPromise) {
        if (!optionsSet) {
          setOptions({ key: apiKey, v: 'weekly', libraries: ['places', 'geocoding'] });
          optionsSet = true;
        }
        // importLibrary from @googlemaps/js-api-loader triggers the script load
        mapsLoadPromise = Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('places'),
          importLibrary('geocoding'),
        ]).then(() => undefined);
      }
      await mapsLoadPromise;
      if (mounted.current) {
        setLoadState({ status: 'loaded' });
      }
    } catch (err) {
      mapsLoadPromise = null;
      if (mounted.current) {
        setLoadState({
          status: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to load Google Maps. Check the API key and enabled APIs.',
        });
      }
    }
  }, []);

  const isApiKeySet = !!REACT_APP_GOOGLE_MAPS_API_KEY;

  return { loadState, load, isApiKeySet };
};
