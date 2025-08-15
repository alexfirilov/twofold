import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllMedia, 
  createMediaItem, 
  updateMediaItem, 
  deleteMediaItem,
  getMediaById
} from '@/lib/db'
import type { CreateMediaItem, UpdateMediaItem } from '@/lib/types'
import { requireCornerAccess, getUserFromAuthHeader } from '@/lib/firebase/serverAuth'
import { deleteFileFromS3 } from '@/lib/s3'

/**
 * GET /api/media - Get all media items
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const cornerId = url.searchParams.get('corner_id')
    
    if (!cornerId) {
      return NextResponse.json(
        { error: 'corner_id parameter is required' },
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

    const mediaItems = await getAllMedia(cornerId)
    
    return NextResponse.json(
      { success: true, data: mediaItems },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get media error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch media items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/media - Create new media item
 */
export async function POST(request: NextRequest) {
  try {
    const mediaData: CreateMediaItem = await request.json()

    if (!mediaData.corner_id) {
      return NextResponse.json(
        { error: 'corner_id is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('Authorization') || undefined
    const { user, hasAccess } = await requireCornerAccess(mediaData.corner_id, authHeader)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this corner' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!mediaData.filename || !mediaData.s3_key || !mediaData.s3_url || !mediaData.file_type || !mediaData.file_size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Add uploader information
    mediaData.uploaded_by_firebase_uid = user.uid

    const newMedia = await createMediaItem(mediaData)
    
    return NextResponse.json(
      { success: true, data: newMedia },
      { status: 201 }
    )

  } catch (error) {
    console.error('Create media error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create media item' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/media - Update media item
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, corner_id, ...updates }: { id: string; corner_id: string } & UpdateMediaItem = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    if (!corner_id) {
      return NextResponse.json(
        { error: 'corner_id is required' },
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

    // Verify the media item belongs to the corner
    const existingMedia = await getMediaById(id, corner_id)
    
    if (!existingMedia) {
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 }
      )
    }

    const updatedMedia = await updateMediaItem(id, updates)
    
    return NextResponse.json(
      { success: true, data: updatedMedia },
      { status: 200 }
    )

  } catch (error) {
    console.error('Update media error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update media item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/media - Delete media item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const corner_id = searchParams.get('corner_id')

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    if (!corner_id) {
      return NextResponse.json(
        { error: 'corner_id is required' },
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

    // Get media item to verify it belongs to the corner and get S3 key for deletion
    const mediaItem = await getMediaById(id, corner_id)
    
    if (!mediaItem) {
      return NextResponse.json(
        { error: 'Media item not found' },
        { status: 404 }
      )
    }

    // Delete from database first
    const deleted = await deleteMediaItem(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete media item' },
        { status: 500 }
      )
    }

    // Try to delete from S3 (non-blocking)
    try {
      await deleteFileFromS3(mediaItem.s3_key)
    } catch (s3Error) {
      console.error('S3 deletion error (non-blocking):', s3Error)
      // Don't fail the entire operation if S3 deletion fails
    }

    return NextResponse.json(
      { success: true, message: 'Media item deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete media error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete media item' },
      { status: 500 }
    )
  }
}