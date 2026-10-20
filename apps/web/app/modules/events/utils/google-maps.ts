import type { LocationValue } from '~/modules/events/model/event-location.types';
import { getPublicEnv } from '~/shared/lib/public-env';

/**
 * All Google Maps/Places interactions are isolated here.
 * Components and hooks import only this class — no Google SDK calls elsewhere.
 *
 * APIs used (all enabled on VITE_GOOGLE_MAPS_API_KEY):
 *   - Maps JavaScript API (via @googlemaps/js-api-loader v2 functional API)
 *   - Places API (New) — Autocomplete Data API for suggestions + place resolution
 *   - Maps Embed API — free/unlimited iframe embeds
 *
 * The loader package is dynamically imported inside loadPlaces() so this module
 * is safe to import during SSR — window is never touched at module evaluation time.
 */

type PlacesLib = google.maps.PlacesLibrary;

let placesPromise: Promise<PlacesLib> | null = null;

export class GoogleMaps {
  private static get apiKey(): string {
    return getPublicEnv().googleMapsApiKey;
  }

  // ── Loader ────────────────────────────────────────────────────────────────

  /**
   * Lazily imports @googlemaps/js-api-loader via dynamic import so the package
   * (which references `window` on load) is never evaluated during SSR.
   * Only executes client-side when called from the autocomplete hook.
   * Subsequent calls return the cached promise.
   */
  static loadPlaces(): Promise<PlacesLib> {
    if (placesPromise) return placesPromise;
    placesPromise = import('@googlemaps/js-api-loader').then(({ setOptions, importLibrary }) => {
      setOptions({
        key: GoogleMaps.apiKey,
        v: 'weekly',
      });
      return importLibrary('places') as Promise<PlacesLib>;
    });
    return placesPromise;
  }

  // ── Session token ─────────────────────────────────────────────────────────

  /**
   * Creates a billing-efficient `AutocompleteSessionToken`.
   * One token covers the full autocomplete → place-details round-trip.
   * Callers should rotate the token after each resolved place.
   */
  static async createSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
    const { AutocompleteSessionToken } = await GoogleMaps.loadPlaces();
    return new AutocompleteSessionToken();
  }

  // ── Suggestions ───────────────────────────────────────────────────────────

  /**
   * Fetches autocomplete predictions for `input`.
   * Returns an empty array on error so callers don't need to guard.
   */
  static async getSuggestions(
    input: string,
    token: google.maps.places.AutocompleteSessionToken,
    locationBias?: google.maps.places.LocationBias,
  ): Promise<google.maps.places.AutocompleteSuggestion[]> {
    if (!input.trim()) return [];
    try {
      const { AutocompleteSuggestion } = await GoogleMaps.loadPlaces();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: token,
        // Default soft bias toward Baku (50km radius). Results outside this area
        // still appear if more relevant — use locationRestriction to hard-restrict.
        locationBias: locationBias ?? {
          center: { lat: 40.4093, lng: 49.8671 },
          radius: 50000,
        },
      });
      return suggestions;
    } catch {
      return [];
    }
  }

  // ── Place resolution ──────────────────────────────────────────────────────

  /**
   * Resolves a prediction to a full `LocationValue` by fetching the minimum
   * required fields (id, displayName, formattedAddress, location).
   * Consumes the session token — caller should rotate after this call.
   */
  static async resolvePlace(
    prediction: google.maps.places.AutocompleteSuggestion,
    token: google.maps.places.AutocompleteSessionToken,
  ): Promise<LocationValue> {
    const place = prediction.placePrediction!.toPlace();
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });

    const latLng = place.location;
    if (!latLng) throw new Error('Place has no location data');

    return {
      name: place.displayName ?? '',
      address: place.formattedAddress ?? '',
      lat: latLng.lat(),
      lng: latLng.lng(),
      placeId: place.id ?? '',
    };
  }

  // ── URL builders ──────────────────────────────────────────────────────────

  /**
   * Free Maps Embed API URL (unlimited loads, no per-map billing).
   * Use as the `src` of an <iframe> for map previews and the event detail page.
   */
  static embedUrl(loc: Pick<LocationValue, 'placeId'>): string {
    return `https://www.google.com/maps/embed/v1/place?key=${GoogleMaps.apiKey}&q=place_id:${encodeURIComponent(loc.placeId)}`;
  }

  /**
   * "Open in Google Maps" URL — opens the place panel directly in Google Maps.
   */
  static mapsLink(loc: Pick<LocationValue, 'name' | 'placeId'>): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name)}&query_place_id=${encodeURIComponent(loc.placeId)}`;
  }

  /**
   * "Get directions" URL — opens Google Maps directions to the venue.
   */
  static directionsLink(loc: Pick<LocationValue, 'address' | 'placeId'>): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}&destination_place_id=${encodeURIComponent(loc.placeId)}`;
  }

  /**
   * Server-safe Maps URL that works with or without a place_id.
   * Prefers the structured place_id URL; falls back to a plain text query.
   * Use this for emails and anywhere the full LocationValue is unavailable.
   */
  static mapsSearchUrl({
    name,
    address,
    placeId,
  }: {
    name?: string | null;
    address?: string | null;
    placeId?: string | null;
  }): string {
    const query = encodeURIComponent(name || address || '');
    if (placeId) {
      return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`;
    }
    return `https://www.google.com/maps/search/?q=${query}`;
  }
}
