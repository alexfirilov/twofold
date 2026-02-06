import { NextRequest, NextResponse } from 'next/server'
import { requireCornerAccess } from '@/lib/firebase/serverAuth'
import { pinMemory, unpinMemory, getPinnedMemory } from '@/lib/db'
import { generatePresignedDownloadUrl } from '@/lib/gcs'

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/lockets/[id]/pinned - Get the currently pinned memory
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const pinnedMemory = await getPinnedMemory(locketId)

    if (pinnedMemory?.media_items && Array.isArray(pinnedMemory.media_items)) {
      for (const media of pinnedMemory.media_items) {
        if (media.storage_key) {
          try {
            media.storage_url = await generatePresignedDownloadUrl(media.storage_key)
          } catch (e) {
            console.error('Failed to generate signed URL for', media.storage_key, e)
          }
        }
      }
    }

    return NextResponse.json(
      { success: true, data: pinnedMemory },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching pinned memory:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch pinned memory' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/lockets/[id]/pinned - Pin a memory
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memory_id } = body

    if (!memory_id) {
      return NextResponse.json(
        { error: 'memory_id is required' },
        { status: 400 }
      )
    }

    await pinMemory(locketId, memory_id, user.uid)

    return NextResponse.json(
      { success: true, message: 'Memory pinned successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error pinning memory:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to pin memory' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/lockets/[id]/pinned - Unpin the current memory
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const locketId = params.id
    const authHeader = request.headers.get('Authorization') || undefined

    const { user, hasAccess } = await requireCornerAccess(locketId, authHeader)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this locket' },
        { status: 403 }
      )
    }

    await unpinMemory(locketId, user.uid)

    return NextResponse.json(
      { success: true, message: 'Memory unpinned successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error unpinning memory:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Permission denied') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to unpin memory' },
      { status: 500 }
    )
  }
}
