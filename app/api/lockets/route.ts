import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getUserLockets, createLocket, getLocketBySlug } from '@/lib/db'
import { ensureInitialized } from '@/lib/init'
import type { CreateLocket } from '@/lib/types'

/**
 * GET /api/lockets - Get all lockets for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized before fetching lockets
    await ensureInitialized()

    const authHeader = request.headers.get('Authorization') || undefined
    const user = authHeader
      ? await getUserFromAuthHeader(authHeader)
      : await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const lockets = await getUserLockets(user.uid)

    return NextResponse.json(
      { success: true, data: lockets },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching user lockets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lockets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lockets - Create a new locket
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized before creating locket
    await ensureInitialized()

    const authHeader = request.headers.get('Authorization') || undefined
    const user = authHeader
      ? await getUserFromAuthHeader(authHeader)
      : await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, is_public, share_password, anniversary_date, cover_photo_url, location_origin } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Locket name is required' },
        { status: 400 }
      )
    }

    const locketData: CreateLocket = {
      name: name.trim(),
      description: description?.trim() || undefined,
      is_public: is_public || false,
      share_password: share_password?.trim() || undefined,
      admin_firebase_uid: user.uid,
      anniversary_date: anniversary_date || undefined,
      cover_photo_url: cover_photo_url?.trim() || undefined,
      location_origin: location_origin?.trim() || undefined,
    }

    const locket = await createLocket(locketData)

    const response = NextResponse.json(
      { success: true, data: locket },
      { status: 201 }
    )

    // Set locket-id cookie for middleware
    response.cookies.set('locket-id', locket.id, {
      httpOnly: false, // Allow client-side access if needed (though middleware handles it)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Error creating locket:', error)
    if (error instanceof Error && error.message.includes('slug')) {
      return NextResponse.json(
        { error: 'A locket with a similar name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create locket' },
      { status: 500 }
    )
  }
}
