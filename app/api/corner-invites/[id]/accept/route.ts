import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/firebase/serverAuth'
import { acceptCornerInvite } from '@/lib/db'

/**
 * POST /api/corner-invites/[id]/accept - Accept a corner invite
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const inviteId = params.id

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    const result = await acceptCornerInvite(inviteId, user.uid, user.email || '', user.displayName || '')

    return NextResponse.json(
      { success: true, message: 'Invitation accepted successfully', data: result },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error accepting invite:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Invitation not found or expired' },
          { status: 404 }
        )
      } else if (error.message.includes('already accepted')) {
        return NextResponse.json(
          { error: 'Invitation already accepted' },
          { status: 409 }
        )
      } else if (error.message.includes('permission denied')) {
        return NextResponse.json(
          { error: 'Permission denied - invitation is for a different email' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}