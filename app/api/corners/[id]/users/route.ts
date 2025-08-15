import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { getCornerUsers } from '@/lib/db'

/**
 * GET /api/corners/[id]/users - Get all users for a corner
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

    const users = await getCornerUsers(cornerId)

    return NextResponse.json(
      { success: true, users },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching corner users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}