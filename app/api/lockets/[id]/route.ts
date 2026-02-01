import { NextRequest, NextResponse } from 'next/server'
import { requireCornerAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getLocketById, updateLocket, deleteLocket } from '@/lib/db'
import type { UpdateLocket } from '@/lib/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/lockets/[id] - Get locket by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const locket = await getLocketById(locketId, user.uid)

    if (!locket) {
      return NextResponse.json(
        { error: 'Locket not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(
      { success: true, data: locket },
      { status: 200 }
    )

    // Update locket-id cookie to reflect current selection/access
    response.cookies.set('locket-id', locket.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Error fetching locket:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch locket' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/lockets/[id] - Update locket
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess, isAdmin } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    // Only admins can update locket settings
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only locket admins can update locket settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, is_public, share_password, anniversary_date, cover_photo_url, location_origin } = body

    const updates: UpdateLocket = {}

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Locket name cannot be empty' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    if (is_public !== undefined) {
      updates.is_public = is_public
    }

    if (share_password !== undefined) {
      updates.share_password = share_password?.trim() || null
    }

    if (anniversary_date !== undefined) {
      updates.anniversary_date = anniversary_date || null
    }

    if (cover_photo_url !== undefined) {
      updates.cover_photo_url = cover_photo_url?.trim() || null
    }

    if (location_origin !== undefined) {
      updates.location_origin = location_origin?.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const updatedLocket = await updateLocket(locketId, updates, user.uid)

    return NextResponse.json(
      { success: true, data: updatedLocket },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating locket:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update locket' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lockets/[id] - Delete locket (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess, isAdmin } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    // Only the admin can delete the locket
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only locket admins can delete the locket' },
        { status: 403 }
      )
    }

    await deleteLocket(locketId, user.uid)

    return NextResponse.json(
      { success: true, message: 'Locket deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting locket:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied - only locket admin can delete' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete locket' },
      { status: 500 }
    )
  }
}
