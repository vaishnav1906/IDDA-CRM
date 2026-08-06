import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const SEARCH_DEBOUNCE_MS = 300;

import { styled } from '@linaria/react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from 'twenty-ui/surfaces';
import { Button } from 'twenty-ui/input';
import { IconFocusCentered, IconLoader, IconPin, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useGetPlaceApiData } from '@/geo-map/hooks/useGetPlaceApiData';
import { PlaceAutocompleteSelect } from '@/geo-map/components/PlaceAutocompleteSelect';
import { type PlaceAutocompleteResult } from '@/geo-map/types/placeApi';

import { useGoogleMapsLoader } from '@/map-picker/hooks/useGoogleMapsLoader';
import { useCurrentLocation } from '@/map-picker/hooks/useCurrentLocation';
import { MapLocationFallback } from '@/map-picker/components/MapLocationFallback';
import {
  type MapCoordinates,
  type MapLocationResult,
} from '@/map-picker/types/mapLocation.types';
import {
  buildMapsUrl,
  extractAddressComponents,
  isValidCoordinates,
  isValidLatitude,
  isValidLongitude,
  roundForDisplay,
} from '@/map-picker/utils/mapLocationUtils';

// ─── Styles ───────────────────────────────────────────────────────────────────

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  width: 100%;
  height: 100%;
  min-height: 520px;
  position: relative;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  color: ${themeCssVariables.font.color.primary};
  margin: 0;
`;

const StyledCloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  align-items: center;
  padding: ${themeCssVariables.spacing[1]};
  border-radius: ${themeCssVariables.border.radius.sm};

  &:hover {
    background: ${themeCssVariables.background.tertiary};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledSearchRow = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  align-items: flex-start;
`;

const StyledSearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const StyledSearchInput = styled.input`
  width: 100%;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }

  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }
`;

const StyledSuggestionPortal = styled.div`
  position: fixed;
  z-index: 99999;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24);
  overflow: hidden;
`;

const StyledMapContainer = styled.div`
  flex: 1;
  min-height: 300px;
  border-radius: ${themeCssVariables.border.radius.md};
  border: 1px solid ${themeCssVariables.border.color.medium};
  overflow: hidden;
  position: relative;
  background: ${themeCssVariables.background.tertiary};
`;

const StyledMapLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${themeCssVariables.background.secondary};
  z-index: 10;
  gap: ${themeCssVariables.spacing[2]};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledCoordsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  background: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledCoordItem = styled.span`
  color: ${themeCssVariables.font.color.secondary};

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
    margin-left: ${themeCssVariables.spacing[1]};
  }
`;

const StyledAccuracy = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFooterLeft = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFooterRight = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledValidationError = styled.p`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

const StyledGeoError = styled.p`
  color: ${themeCssVariables.color.orange};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

// ─── Component ────────────────────────────────────────────────────────────────

type MapLocationPickerProps = {
  isOpen: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onConfirm: (result: MapLocationResult) => void;
  onClose: () => void;
};

const DEFAULT_CENTER: MapCoordinates = { lat: 20.5937, lng: 78.9629 }; // India center
const DEFAULT_ZOOM = 5;
const PLACED_ZOOM = 15;

export const MapLocationPicker = ({
  isOpen,
  initialLatitude,
  initialLongitude,
  onConfirm,
  onClose,
}: MapLocationPickerProps) => {
  const { loadState, load, isApiKeySet } = useGoogleMapsLoader();
  const { geolocationState, requestLocation, resetGeolocation } =
    useCurrentLocation();
  const { getPlaceAutocompleteData, getPlaceDetailsData } =
    useGetPlaceApiData();

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<string>(uuidv4());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedCoords, setSelectedCoords] =
    useState<MapCoordinates | null>(null);
  const [reversedAddress, setReversedAddress] = useState({
    address: '',
    city: '',
    state: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [confirmExistingLocation, setConfirmExistingLocation] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Maps when modal opens
  useEffect(() => {
    if (isOpen && loadState.status === 'idle') {
      load();
    }
  }, [isOpen, loadState.status, load]);

  // Initialise map once Maps is loaded
  useEffect(() => {
    if (
      loadState.status !== 'loaded' ||
      !mapDivRef.current ||
      mapRef.current
    )
      return;

    const initialCenter =
      initialLatitude != null && initialLongitude != null
        ? { lat: initialLatitude, lng: initialLongitude }
        : DEFAULT_CENTER;

    const map = new window.google.maps.Map(mapDivRef.current, {
      center: initialCenter,
      zoom: initialLatitude != null ? PLACED_ZOOM : DEFAULT_ZOOM,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapId: 'DEMO_MAP_ID',
    });

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map: initialLatitude != null ? map : null,
      position: initialLatitude != null ? initialCenter : null,
      gmpDraggable: true,
    });

    geocoderRef.current = new window.google.maps.Geocoder();
    mapRef.current = map;
    markerRef.current = marker;

    if (initialLatitude != null && initialLongitude != null) {
      setSelectedCoords({ lat: initialLatitude, lng: initialLongitude });
    }

    // Trigger resize after modal animation settles — fixes black tiles when
    // the map div has zero dimensions at initialization time.
    window.requestAnimationFrame(() => {
      window.google.maps.event.trigger(map, 'resize');
      map.setCenter(initialLatitude != null
        ? { lat: initialLatitude, lng: initialLongitude! }
        : DEFAULT_CENTER,
      );
    });

    // Click on map places/moves marker
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      placeMarker(coords, marker);
    });

    // Drag end updates coordinates
    marker.addListener('gmp-dragend', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      updateCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
  }, [loadState.status, initialLatitude, initialLongitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup map on close
  useEffect(() => {
    if (!isOpen) {
      mapRef.current = null;
      markerRef.current = null;
      geocoderRef.current = null;
      setSearchQuery('');
      setSuggestions([]);
      setValidationError(null);
      resetGeolocation();
    }
  }, [isOpen, resetGeolocation]);

  const reverseGeocode = useCallback(async (coords: MapCoordinates) => {
    if (!geocoderRef.current) return;
    setIsReverseGeocoding(true);
    try {
      const result = await geocoderRef.current.geocode({ location: coords });
      if (result.results.length > 0) {
        setReversedAddress(extractAddressComponents(result.results));
      }
    } catch {
      // Reverse geocoding is best-effort — silent failure is acceptable
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  const updateCoords = useCallback(
    (coords: MapCoordinates) => {
      setSelectedCoords(coords);
      setValidationError(null);
      reverseGeocode(coords);
    },
    [reverseGeocode],
  );

  const placeMarker = useCallback(
    (
      coords: MapCoordinates,
      marker?: google.maps.marker.AdvancedMarkerElement | null,
    ) => {
      const m = marker ?? markerRef.current;
      if (!m) return;
      m.position = coords;
      m.map = mapRef.current;
      mapRef.current?.panTo(coords);
      updateCoords(coords);
    },
    [updateCoords],
  );

  // Search autocomplete — debounced to avoid a backend query per keystroke
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceAutocompleteData(
          value,
          sessionTokenRef.current,
        );
        setSuggestions(results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const handlePlaceSelect = async (placeId: string) => {
    setSuggestions([]);
    setSearchQuery('');
    sessionTokenRef.current = uuidv4();

    try {
      const details = await getPlaceDetailsData(
        placeId,
        sessionTokenRef.current,
      );
      if (!details?.location) return;
      const { lat, lng } = details.location;
      if (lat == null || lng == null) return;

      const coords: MapCoordinates = { lat, lng };

      placeMarker(coords);
      mapRef.current?.setZoom(PLACED_ZOOM);

      // Use address components from the place details directly
      setReversedAddress({
        address: details.street ?? '',
        city: details.city ?? '',
        state: details.state ?? '',
      });
    } catch {
      // Silent — user can still click on the map
    }
  };

  const handleCurrentLocation = () => {
    if (selectedCoords && !confirmExistingLocation) {
      setConfirmExistingLocation(true);
      return;
    }
    setConfirmExistingLocation(false);
    requestLocation((coords) => {
      placeMarker(coords);
      mapRef.current?.setZoom(PLACED_ZOOM);
    });
  };

  const handleConfirm = () => {
    if (!selectedCoords) {
      setValidationError('Please select a location on the map first.');
      return;
    }
    if (!isValidLatitude(selectedCoords.lat)) {
      setValidationError('Latitude must be between -90 and 90.');
      return;
    }
    if (!isValidLongitude(selectedCoords.lng)) {
      setValidationError('Longitude must be between -180 and 180.');
      return;
    }
    if (!isValidCoordinates(selectedCoords)) {
      setValidationError('Invalid coordinates. Please select a valid location.');
      return;
    }

    onConfirm({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      address: reversedAddress.address,
      city: reversedAddress.city,
      state: reversedAddress.state,
      mapsUrl: buildMapsUrl(selectedCoords.lat, selectedCoords.lng),
    });
  };

  const isMapLoading =
    loadState.status === 'idle' || loadState.status === 'loading';
  const isMapError = loadState.status === 'error';
  const isMapLoaded = loadState.status === 'loaded';

  // ─── Fallback mode when no API key or load error ─────────────────────────
  if (!isApiKeySet || isMapError) {
    return (
      <Modal isOpen={isOpen} size="medium" padding="medium">
        <StyledModalContent>
          <StyledHeader>
            <StyledTitle>Select Location</StyledTitle>
            <StyledCloseButton onClick={onClose} type="button">
              <IconX size={16} />
            </StyledCloseButton>
          </StyledHeader>

          <MapLocationFallback
            latitude={
              selectedCoords ? roundForDisplay(selectedCoords.lat) : ''
            }
            longitude={
              selectedCoords ? roundForDisplay(selectedCoords.lng) : ''
            }
            errorMessage={
              isMapError
                ? loadState.message
                : 'Google Maps is not configured. Enter coordinates manually.'
            }
            onLatitudeChange={(v) => {
              const lat = parseFloat(v);
              // Only set coords if BOTH are valid — prevents saving lng=0 when only lat typed
              setSelectedCoords((prev) => {
                if (!isValidLatitude(lat)) return null;
                const lng = prev?.lng;
                if (lng === undefined || !isValidLongitude(lng)) return null;
                return { lat, lng };
              });
            }}
            onLongitudeChange={(v) => {
              const lng = parseFloat(v);
              setSelectedCoords((prev) => {
                if (!isValidLongitude(lng)) return null;
                const lat = prev?.lat;
                if (lat === undefined || !isValidLatitude(lat)) return null;
                return { lat, lng };
              });
            }}
          />

          <StyledFooter>
            <StyledFooterLeft />
            <StyledFooterRight>
              <Button title="Cancel" onClick={onClose} variant="secondary" size="small" />
              <Button
                title="Confirm"
                onClick={handleConfirm}
                variant="primary"
                size="small"
                disabled={!selectedCoords}
              />
            </StyledFooterRight>
          </StyledFooter>
          {validationError && (
            <StyledValidationError>{validationError}</StyledValidationError>
          )}
        </StyledModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} size="large" padding="medium">
      <StyledModalContent>
        {/* Header */}
        <StyledHeader>
          <StyledTitle>Select Location on Map</StyledTitle>
          <StyledCloseButton onClick={onClose} type="button">
            <IconX size={16} />
          </StyledCloseButton>
        </StyledHeader>

        {/* Search row */}
        <StyledSearchRow>
          <StyledSearchInputWrapper>
            <StyledSearchInput
              ref={searchInputRef}
              type="text"
              placeholder="Search clinic, address, landmark..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSuggestions([]);
              }}
            />
          </StyledSearchInputWrapper>
        </StyledSearchRow>

        {/* Autocomplete suggestions — portal to body escapes all stacking contexts */}
        {suggestions.length > 0 && searchInputRef.current && createPortal(
          <StyledSuggestionPortal
            style={(() => {
              const r = searchInputRef.current!.getBoundingClientRect();
              return { top: r.bottom + 4, left: r.left, width: r.width };
            })()}
          >
            <PlaceAutocompleteSelect
              list={suggestions}
              onChange={handlePlaceSelect}
              dropdownId="map-picker-autocomplete"
            />
          </StyledSuggestionPortal>,
          document.body,
        )}

        {/* Map */}
        <StyledMapContainer>
          {isMapLoading && (
            <StyledMapLoadingOverlay>
              <IconLoader size={18} />
              Loading map…
            </StyledMapLoadingOverlay>
          )}
          <div
            ref={mapDivRef}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          />
        </StyledMapContainer>

        {/* Coordinates preview */}
        {isMapLoaded && (
          <StyledCoordsRow>
            <StyledCoordItem>
              Lat:<strong>{selectedCoords ? roundForDisplay(selectedCoords.lat) : '—'}</strong>
            </StyledCoordItem>
            <StyledCoordItem>
              Lng:<strong>{selectedCoords ? roundForDisplay(selectedCoords.lng) : '—'}</strong>
            </StyledCoordItem>
            {geolocationState.status === 'success' && (
              <StyledAccuracy>
                GPS accuracy: ±{geolocationState.accuracy}m
              </StyledAccuracy>
            )}
            {isReverseGeocoding && (
              <StyledAccuracy>Looking up address…</StyledAccuracy>
            )}
          </StyledCoordsRow>
        )}

        {/* Geolocation errors */}
        {(geolocationState.status === 'denied' ||
          geolocationState.status === 'unavailable') && (
          <StyledGeoError>{geolocationState.message}</StyledGeoError>
        )}

        {/* Overwrite confirmation */}
        {confirmExistingLocation && (
          <StyledGeoError>
            This will replace the existing coordinates. Click "Use Current Location" again to confirm.
          </StyledGeoError>
        )}

        {validationError && (
          <StyledValidationError>{validationError}</StyledValidationError>
        )}

        {/* Hint when no location selected */}
        {isMapLoaded && !selectedCoords && (
          <StyledAccuracy>
            Click anywhere on the map or search for a location to place the marker.
          </StyledAccuracy>
        )}

        {/* Footer */}
        <StyledFooter>
          <StyledFooterLeft>
            <Button
              title={
                geolocationState.status === 'requesting'
                  ? 'Locating…'
                  : 'Use Current Location'
              }
              Icon={
                geolocationState.status === 'requesting'
                  ? IconLoader
                  : IconFocusCentered
              }
              onClick={handleCurrentLocation}
              variant="tertiary"
              size="small"
              disabled={geolocationState.status === 'requesting'}
            />
          </StyledFooterLeft>
          <StyledFooterRight>
            <Button title="Cancel" onClick={onClose} variant="secondary" size="small" />
            <Button
              title="Confirm Location"
              Icon={IconPin}
              onClick={handleConfirm}
              variant="primary"
              size="small"
              disabled={!selectedCoords}
            />
          </StyledFooterRight>
        </StyledFooter>
      </StyledModalContent>
    </Modal>
  );
};
