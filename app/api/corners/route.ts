import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getUserCorners, createCorner, getCornerBySlug } from '@/lib/db'
import { ensureInitialized } from '@/lib/init'
import type { CreateCorner } from '@/lib/types'

/**
 * GET /api/corners - Get all corners for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
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

    const corners = await getUserCorners(user.uid)

    return NextResponse.json(
      { success: true, data: corners },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching user corners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch corners' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/corners - Create a new corner
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized before creating corner
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
    const { name, description, is_public, share_password } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Corner name is required' },
        { status: 400 }
      )
    }

    const cornerData: CreateCorner = {
      name: name.trim(),
      description: description?.trim() || undefined,
      is_public: is_public || false,
      share_password: share_password?.trim() || undefined,
      admin_firebase_uid: user.uid,
    }

    const corner = await createCorner(cornerData)

    return NextResponse.json(
      { success: true, data: corner },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating corner:', error)
    if (error instanceof Error && error.message.includes('slug')) {
      return NextResponse.json(
        { error: 'A corner with a similar name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create corner' },
      { status: 500 }
    )
  }
}