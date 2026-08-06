import { type MapCoordinates } from '@/map-picker/types/mapLocation.types';

export const isValidLatitude = (lat: number): boolean =>
  isFinite(lat) && lat >= -90 && lat <= 90;

export const isValidLongitude = (lng: number): boolean =>
  isFinite(lng) && lng >= -180 && lng <= 180;

export const isValidCoordinates = (coords: MapCoordinates): boolean =>
  isValidLatitude(coords.lat) && isValidLongitude(coords.lng);

export const buildMapsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export const roundForDisplay = (value: number, decimals = 6): string =>
  value.toFixed(decimals);

export const extractAddressComponents = (
  results: google.maps.GeocoderResult[],
): { address: string; city: string; state: string } => {
  const first = results[0];
  if (!first) return { address: '', city: '', state: '' };

  const get = (type: string): string =>
    first.address_components.find((c: google.maps.GeocoderAddressComponent) =>
      c.types.includes(type),
    )?.long_name ?? '';

  const streetNumber = get('street_number');
  const route = get('route');
  const address =
    [streetNumber, route].filter(Boolean).join(' ') ||
    first.formatted_address ||
    '';
  const city =
    get('locality') || get('sublocality') || get('administrative_area_level_2');
  const state = get('administrative_area_level_1');

  return { address, city, state };
};
