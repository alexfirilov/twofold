import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllMemoryGroups, 
  createMemoryGroup, 
  updateMemoryGroup, 
  deleteMemoryGroup,
  getMemoryGroupById
} from '@/lib/db'
import type { CreateMemoryGroup, UpdateMemoryGroup } from '@/lib/types'
import { requireAuth, requireCornerAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'

/**
 * GET /api/memory-groups - Get all memory groups
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cornerId = searchParams.get('cornerId')
    const includeMedia = searchParams.get('includeMedia') !== 'false'
    const includeLocked = searchParams.get('includeLocked') === 'true'

    if (!cornerId) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireCornerAccess(cornerId, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    const memoryGroups = await getAllMemoryGroups(cornerId, includeMedia, includeLocked)
    
    return NextResponse.json(
      { success: true, memoryGroups },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get memory groups error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch memory groups' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memory-groups - Create new memory group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { corner_id, title, description, is_locked, unlock_date } = body

    if (!corner_id) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireCornerAccess(corner_id, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Memory group title is required' },
        { status: 400 }
      )
    }

    const groupData: CreateMemoryGroup = {
      corner_id,
      title: title.trim(),
      description: description?.trim() || undefined,
      is_locked: is_locked || false,
      unlock_date: unlock_date ? new Date(unlock_date) : undefined,
      created_by_firebase_uid: user.uid,
    }

    const newGroup = await createMemoryGroup(groupData)
    
    return NextResponse.json(
      { success: true, data: newGroup },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create memory group error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create memory group' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/memory-groups - Update memory group
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, corner_id, ...updates }: { id: string; corner_id: string } & UpdateMemoryGroup = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
      )
    }

    if (!corner_id) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireCornerAccess(corner_id, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    // Verify the memory group belongs to the corner
    const existingGroup = await getMemoryGroupById(id, false)
    
    if (!existingGroup || existingGroup.corner_id !== corner_id) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const updatedGroup = await updateMemoryGroup(id, updates)
    
    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedGroup, { status: 200 })

  } catch (error) {
    console.error('Update memory group error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update memory group' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memory-groups - Delete memory group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const corner_id = searchParams.get('corner_id')

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
      )
    }

    if (!corner_id) {
      return NextResponse.json(
        { error: 'Corner ID is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireCornerAccess(corner_id, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    // Verify the memory group belongs to the corner
    const existingGroup = await getMemoryGroupById(id, false)
    
    if (!existingGroup || existingGroup.corner_id !== corner_id) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    const deleted = await deleteMemoryGroup(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Memory group deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete memory group error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete memory group' },
      { status: 500 }
    )
  }
}