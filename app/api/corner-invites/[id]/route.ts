import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { revokeCornerInvite } from '@/lib/db'

/**
 * DELETE /api/corner-invites/[id] - Revoke a corner invite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const inviteId = params.id

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    await revokeCornerInvite(inviteId, user.uid)

    return NextResponse.json(
      { success: true, message: 'Invite revoked successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error revoking invite:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invite' },
      { status: 500 }
    )
  }
}