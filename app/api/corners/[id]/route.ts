import { NextRequest, NextResponse } from 'next/server'
import { requireCornerAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getCornerById, updateCorner, deleteCorner } from '@/lib/db'
import type { UpdateCorner } from '@/lib/types'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/corners/[id] - Get corner by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cornerId = params.id
    const authHeader = request.headers.get('Authorization') || undefined
    
    const { user, hasAccess } = await requireCornerAccess(cornerId, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    const corner = await getCornerById(cornerId, user.uid)

    if (!corner) {
      return NextResponse.json(
        { error: 'Corner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: corner },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching corner:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch corner' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/corners/[id] - Update corner
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const cornerId = params.id
    const authHeader = request.headers.get('Authorization') || undefined
    
    const { user, hasAccess, isAdmin } = await requireCornerAccess(cornerId, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    // Only admins can update corner settings
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only corner admins can update corner settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, is_public, share_password } = body

    const updates: UpdateCorner = {}

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Corner name cannot be empty' },
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const updatedCorner = await updateCorner(cornerId, updates, user.uid)

    return NextResponse.json(
      { success: true, data: updatedCorner },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating corner:', error)
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
      { error: 'Failed to update corner' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/corners/[id] - Delete corner (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cornerId = params.id
    const authHeader = request.headers.get('Authorization') || undefined
    
    const { user, hasAccess, isAdmin } = await requireCornerAccess(cornerId, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    // Only the admin can delete the corner
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only corner admins can delete the corner' },
        { status: 403 }
      )
    }

    await deleteCorner(cornerId, user.uid)

    return NextResponse.json(
      { success: true, message: 'Corner deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting corner:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied - only corner admin can delete' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete corner' },
      { status: 500 }
    )
  }
}