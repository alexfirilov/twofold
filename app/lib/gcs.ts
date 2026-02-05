import { Storage } from '@google-cloud/storage'

let storageInstance: Storage | null = null
let bucketInstance: any = null

function getBucket() {
  if (bucketInstance) return bucketInstance

  const bucketName = process.env.GCS_BUCKET_NAME
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not defined')
  }

  if (!storageInstance) {
    storageInstance = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    })
  }

  bucketInstance = storageInstance.bucket(bucketName)
  return bucketInstance
}

export interface PresignedUrlResponse {
  uploadUrl: string
  storageKey: string
  publicUrl: string
}

/**
 * Generate a presigned URL for uploading files to GCP Cloud Storage
 */
export async function generatePresignedUploadUrl(
  filename: string,
  fileType: string,
  fileSizeBytes: number
): Promise<PresignedUrlResponse> {
  try {
    const bucket = getBucket()
    // Generate a unique key for the file
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

    const key = `media/${timestamp}-${randomString}-${sanitizedFilename}`
    const file = bucket.file(key)

    // Generate the presigned URL for uploading (V4)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      contentType: fileType,
    })

    // Construct the public URL for accessing the file
    // GCP Public URL format: https://storage.googleapis.com/[BUCKET_NAME]/[KEY]
    const bucketName = process.env.GCS_BUCKET_NAME
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${key}`

    return {
      uploadUrl,
      storageKey: key,
      publicUrl,
    }
  } catch (error) {
    console.error('Error generating GCP presigned URL:', error)
    throw new Error('Failed to generate upload URL')
  }
}

/**
 * Generate a presigned URL for downloading/viewing files from GCP Cloud Storage
 */
export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  try {
    const bucket = getBucket()
    const file = bucket.file(key)

    // Generate the presigned URL (expires in 1 hour)
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return downloadUrl
  } catch (error) {
    console.error('Error generating GCP presigned download URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

/**
 * Delete a file from GCP Cloud Storage
 */
export async function deleteFileFromGCS(key: string): Promise<void> {
  try {
    const bucket = getBucket()
    const file = bucket.file(key)
    await file.delete()
  } catch (error) {
    console.error('Error deleting file from GCS:', error)
    // Don't throw if file already deleted
    if ((error as any).code !== 404) {
      throw new Error('Failed to delete file')
    }
  }
}

/**
 * Get file type category (image, video, etc.)
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType.startsWith('video/')) {
    return 'video'
  } else {
    return 'other'
  }
}

/**
 * Validate file type for our romantic gallery
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    // Videos
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/avi',
    'video/mkv',
    'video/webm',
  ]

  return allowedTypes.includes(mimeType.toLowerCase())
}

/**
 * Get max file size based on file type (in bytes)
 */
export function getMaxFileSize(mimeType: string): number {
  const fileCategory = getFileTypeCategory(mimeType)

  switch (fileCategory) {
    case 'image':
      return 10 * 1024 * 1024 // 10MB for images
    case 'video':
      return 100 * 1024 * 1024 // 100MB for videos
    default:
      return 5 * 1024 * 1024 // 5MB for other files
  }
}
