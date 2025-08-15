import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { createCornerInvite, getCornerInvites, getInviteByCodeAndEmail } from '@/lib/db'
import type { CreateCornerInvite } from '@/lib/types'

/**
 * GET /api/corner-invites - Get all invites for a corner
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cornerId = searchParams.get('cornerId')
    const code = searchParams.get('code')
    const email = searchParams.get('email')

    // Handle public invite lookup by corner code and email
    if (code && email) {
      try {
        const invite = await getInviteByCodeAndEmail(code, email)
        return NextResponse.json(
          { success: true, invite },
          { status: 200 }
        )
      } catch (error) {
        console.error('Public invite lookup error:', error)
        return NextResponse.json(
          { success: false, invite: null, error: 'Invite not found' },
          { status: 404 }
        )
      }
    }

    // Handle authenticated admin requests
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

/**
 * POST /api/corner-invites - Create a new corner invite
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { corner_id, email, role, permissions } = body

    if (!corner_id) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!role || !['admin', 'participant'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (admin or participant)' },
        { status: 400 }
      )
    }

    const inviteData: CreateCornerInvite = {
      corner_id,
      email: email.trim().toLowerCase(),
      role,
      can_upload: permissions?.can_upload !== false,
      can_edit_others_media: permissions?.can_edit || false,
      invited_by_firebase_uid: user.uid,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }

    const invite = await createCornerInvite(inviteData)

    return NextResponse.json(
      { success: true, data: invite },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating corner invite:', error)
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'User already invited or is already a member' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}