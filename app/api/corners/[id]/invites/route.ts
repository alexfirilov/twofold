import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getCornerInvites } from '@/lib/db'

/**
 * GET /api/corners/[id]/invites - Get all pending invites for a corner
 */
export async function GET(
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

    const cornerId = params.id

    if (!cornerId) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    const invites = await getCornerInvites(cornerId)

    return NextResponse.json(
      { success: true, invites },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching corner invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}