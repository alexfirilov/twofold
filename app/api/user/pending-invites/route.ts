import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/firebase/serverAuth'
import { getPendingInvitesForEmail } from '@/lib/db'

/**
 * GET /api/user/pending-invites - Get pending invites for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const invites = await getPendingInvitesForEmail(user.email)

    return NextResponse.json(
      { success: true, invites },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching pending invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    )
  }
}