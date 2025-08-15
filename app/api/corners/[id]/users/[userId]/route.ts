import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { updateUserRole, removeUserFromCorner } from '@/lib/db'

/**
 * PUT /api/corners/[id]/users/[userId] - Update user role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
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

    const cornerId = params.id
    const userId = params.userId
    const { role } = await request.json()

    if (!cornerId || !userId) {
      return NextResponse.json(
        { error: 'Corner ID and User ID are required' },
        { status: 400 }
      )
    }

    if (!role || !['admin', 'participant'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin or participant)' },
        { status: 400 }
      )
    }

    const updatedUser = await updateUserRole(cornerId, userId, role)

    return NextResponse.json(
      { success: true, data: updatedUser },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/corners/[id]/users/[userId] - Remove user from corner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
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

    const cornerId = params.id
    const userId = params.userId

    if (!cornerId || !userId) {
      return NextResponse.json(
        { error: 'Corner ID and User ID are required' },
        { status: 400 }
      )
    }

    const success = await removeUserFromCorner(cornerId, userId)

    if (!success) {
      return NextResponse.json(
        { error: 'User not found or cannot be removed' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'User removed from corner' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error removing user from corner:', error)
    return NextResponse.json(
      { error: 'Failed to remove user' },
      { status: 500 }
    )
  }
}