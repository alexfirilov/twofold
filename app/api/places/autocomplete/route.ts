import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/firebase/serverAuth'

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      text: {
        text: string;
      };
      structuredFormat?: {
        mainText: { text: string };
        secondaryText?: { text: string };
      };
    };
  }>;
  error?: {
    message: string;
    status: string;
  };
}

/**
 * POST /api/places/autocomplete - Get place autocomplete suggestions
 *
 * Body: { input: string, locationBias?: { lat: number, lng: number } }
 * Returns: { suggestions: Array<{ placeId, name, description }> }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { input, locationBias } = body

    if (!input || typeof input !== 'string' || input.length < 2) {
      return NextResponse.json(
        { error: 'Input must be at least 2 characters' },
        { status: 400 }
      )
    }

    const requestBody: Record<string, unknown> = {
      input,
      // Don't filter by type - allow users to search for any place
    }

    // Add location bias if coordinates are provided (improves relevance)
    if (locationBias?.lat && locationBias?.lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: locationBias.lat,
            longitude: locationBias.lng,
          },
          radius: 50000.0, // 50km bias radius
        },
      }
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    const data: AutocompleteResponse = await response.json()

    if (data.error) {
      console.error('[Autocomplete] API error:', data.error.status, data.error.message)
      return NextResponse.json(
        { error: data.error.message },
        { status: 400 }
      )
    }

    // Transform to simpler format
    const suggestions = (data.suggestions || [])
      .filter(s => s.placePrediction)
      .map(s => ({
        placeId: s.placePrediction!.placeId,
        name: s.placePrediction!.structuredFormat?.mainText.text || s.placePrediction!.text.text,
        description: s.placePrediction!.structuredFormat?.secondaryText?.text || '',
        fullText: s.placePrediction!.text.text,
      }))

    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('[Autocomplete] Error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
