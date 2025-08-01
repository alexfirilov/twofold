import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllMemoryGroups, 
  createMemoryGroup, 
  updateMemoryGroup, 
  deleteMemoryGroup,
  getMemoryGroupById,
  CreateMemoryGroup,
  UpdateMemoryGroup 
} from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/memory-groups - Get all memory groups
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const includeMedia = searchParams.get('includeMedia') !== 'false'
    const includeLocked = searchParams.get('includeLocked') === 'true'

    const memoryGroups = await getAllMemoryGroups(includeMedia, includeLocked)
    return NextResponse.json(memoryGroups, { status: 200 })

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
    await requireAuth()

    const groupData: CreateMemoryGroup = await request.json()

    const newGroup = await createMemoryGroup(groupData)
    return NextResponse.json(newGroup, { status: 201 })

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
    await requireAuth()

    const { id, ...updates }: { id: string } & UpdateMemoryGroup = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
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
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Memory group ID is required' },
        { status: 400 }
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