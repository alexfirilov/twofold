import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/image-proxy?url=<encoded-url>
 *
 * Proxies images from GCS/Firebase Storage to avoid CORS issues.
 * Only allows URLs from trusted storage domains.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Validate URL is from trusted storage domains
    const allowedDomains = [
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      'storage.cloud.google.com',
    ]

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
      return NextResponse.json({ error: 'URL not from allowed domain' }, { status: 403 })
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        // Pass through cache headers if present
        'Cache-Control': 'public, max-age=31536000',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      )
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Stream the response
    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 })
  }
}
