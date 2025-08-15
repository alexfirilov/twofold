import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl, isValidFileType, getMaxFileSize } from '@/lib/s3'
import { requireAuth } from '@/lib/firebase/serverAuth'

/**
 * POST /api/upload - Generate presigned URL for file upload
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()

    const { filename, fileType, fileSize } = await request.json()

    // Validate required fields
    if (!filename || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, fileType, or fileSize' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isValidFileType(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = getMaxFileSize(fileType)
    if (fileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return NextResponse.json(
        { error: `File size too large. Maximum allowed size is ${maxSizeMB}MB for this file type.` },
        { status: 400 }
      )
    }

    // Generate presigned URL
    const presignedData = await generatePresignedUploadUrl(filename, fileType, fileSize)

    return NextResponse.json(presignedData, { status: 200 })

  } catch (error) {
    console.error('Upload URL generation error:', error)
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}