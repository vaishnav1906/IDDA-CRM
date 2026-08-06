export type MapCoordinates = {
  lat: number;
  lng: number;
};

export type MapLocationResult = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  mapsUrl: string;
};

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'success'; coords: MapCoordinates; accuracy: number }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string };

export type GoogleMapsLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded' }
  | { status: 'error'; message: string };
