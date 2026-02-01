/**
 * Google Maps Geocoding & Places API utility
 *
 * Converts GPS coordinates to human-readable place names.
 * Uses Places API (New) for specific venues, falls back to Geocoding API for addresses.
 * Free tier: $200/month credit
 */

interface GeocodeResult {
  formattedAddress: string;
  placeName?: string;        // Specific place/business name if available
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  shortName: string;         // Concise name for display (e.g., "Mandoria, Rzgów")
}

interface GoogleGeocodeResponse {
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    types: string[];
  }>;
  status: string;
  error_message?: string;
}

interface PlacesNearbyResponse {
  places?: Array<{
    displayName?: {
      text: string;
      languageCode: string;
    };
    primaryType?: string;
    types?: string[];
    shortFormattedAddress?: string;
  }>;
  error?: {
    message: string;
    status: string;
  };
}

// Place types supported by Places API (New) - for finding specific venues
// See: https://developers.google.com/maps/documentation/places/web-service/place-types
const INTERESTING_PLACE_TYPES = [
  'amusement_park',
  'aquarium',
  'art_gallery',
  'campground',
  'casino',
  'church',
  'city_hall',
  'convention_center',
  'marina',
  'mosque',
  'museum',
  'national_park',
  'park',
  'stadium',
  'synagogue',
  'tourist_attraction',
  'visitor_center',
  'zoo',
  // Restaurants and cafes for memorable meals
  'restaurant',
  'cafe',
  'bar',
];

/**
 * Search for nearby places using Places API (New)
 */
async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<string | null> {
  try {
    console.log('[Places] Searching for nearby places at:', latitude, longitude);

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.primaryType,places.types,places.shortFormattedAddress',
      },
      body: JSON.stringify({
        includedTypes: INTERESTING_PLACE_TYPES,
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius: 100.0, // 100 meters - very close proximity
          },
        },
      }),
    });

    const data: PlacesNearbyResponse = await response.json();

    if (data.error) {
      console.log('[Places] API error:', data.error.status, data.error.message);
      return null;
    }

    if (!data.places || data.places.length === 0) {
      console.log('[Places] No nearby places found within 100m');
      return null;
    }

    // Find the most relevant place (prefer tourist attractions, parks, landmarks)
    const priorityTypes = ['tourist_attraction', 'park', 'national_park', 'museum', 'historical_landmark', 'cultural_landmark'];

    let bestPlace = data.places[0];
    for (const place of data.places) {
      if (place.types?.some(t => priorityTypes.includes(t))) {
        bestPlace = place;
        break;
      }
    }

    const placeName = bestPlace.displayName?.text;
    console.log('[Places] Found place:', placeName, '| Type:', bestPlace.primaryType);

    return placeName || null;
  } catch (error) {
    console.error('[Places] Exception:', error);
    return null;
  }
}

/**
 * Get address info using Geocoding API
 */
async function getAddressInfo(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<{ city?: string; country?: string; formattedAddress: string } | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'en');

    console.log('[Geocoding] Getting address info for:', latitude, longitude);
    const response = await fetch(url.toString());
    const data: GoogleGeocodeResponse = await response.json();

    if (data.status !== 'OK') {
      console.log('[Geocoding] Failed:', data.status, data.error_message);
      return null;
    }

    const result = data.results[0];
    const components: Record<string, string> = {};

    for (const component of result.address_components) {
      for (const type of component.types) {
        components[type] = component.long_name;
      }
    }

    return {
      city: components['locality'] || components['sublocality'] || components['administrative_area_level_2'],
      country: components['country'],
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error('[Geocoding] Exception:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to a human-readable location
 *
 * Strategy:
 * 1. Try Places API to find specific venue (park, restaurant, landmark)
 * 2. Use Geocoding API to get city/country info
 * 3. Combine them: "Mandoria, Rzgów" or just "Rzgów, Poland" if no venue found
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not configured, skipping reverse geocoding');
    return null;
  }

  try {
    // Run both API calls in parallel for speed
    const [placeName, addressInfo] = await Promise.all([
      searchNearbyPlaces(latitude, longitude, apiKey),
      getAddressInfo(latitude, longitude, apiKey),
    ]);

    if (!addressInfo) {
      console.log('[Geocoding] Could not get address info');
      return null;
    }

    // Build the short name
    let shortName: string;

    if (placeName) {
      // We found a specific place - combine with city
      if (addressInfo.city) {
        shortName = `${placeName}, ${addressInfo.city}`;
      } else {
        shortName = placeName;
      }
      console.log('[Geocoding] Final result (with place):', shortName);
    } else {
      // No specific place found - use city, country
      const parts: string[] = [];
      if (addressInfo.city) parts.push(addressInfo.city);
      if (addressInfo.country && parts.length < 2) parts.push(addressInfo.country);
      shortName = parts.length > 0 ? parts.join(', ') : addressInfo.formattedAddress;
      console.log('[Geocoding] Final result (address only):', shortName);
    }

    return {
      formattedAddress: addressInfo.formattedAddress,
      placeName: placeName || undefined,
      city: addressInfo.city,
      country: addressInfo.country,
      shortName,
    };
  } catch (error) {
    console.error('[Geocoding] Exception:', error);
    return null;
  }
}

/**
 * Format coordinates nicely as a fallback when geocoding fails
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;
}
