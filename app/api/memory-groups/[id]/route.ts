import { NextRequest, NextResponse } from 'next/server'
import { getMemoryGroupById } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/memory-groups/[id] - Get memory group by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const includeMedia = searchParams.get('includeMedia') !== 'false'

    const memoryGroup = await getMemoryGroupById(params.id, includeMedia)
    
    if (!memoryGroup) {
      return NextResponse.json(
        { error: 'Memory group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(memoryGroup, { status: 200 })

  } catch (error) {
    console.error('Get memory group by ID error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch memory group' },
      { status: 500 }
    )
  }
}