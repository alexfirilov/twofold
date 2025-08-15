"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCorner } from '@/contexts/CornerContext'
import { CreateMemoryGroup, CreateMediaItem } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  Loader2, 
  Calendar,
  FileText,
  FolderPlus,
  Lock,
  Unlock,
  Clock,
  Settings,
  CheckSquare,
  GripVertical
} from 'lucide-react'
import RichTextEditor from './RichTextEditor'

interface FileWithPreview {
  id: string
  file: File
  preview?: string
  uploadedUrl?: string
  progress?: number
  uploaded?: boolean
  error?: string
}

export default function EnhancedUploadForm() {
  const { currentCorner } = useCorner()
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryDescription, setMemoryDescription] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [unlockDate, setUnlockDate] = useState('')
  const [unlockTime, setUnlockTime] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [allowNoMedia, setAllowNoMedia] = useState(false)
  
  // Advanced locking features
  const [lockVisibility, setLockVisibility] = useState<'public' | 'private'>('private')
  const [showDateHint, setShowDateHint] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [blurPercentage, setBlurPercentage] = useState(95)
  const [unlockHint, setUnlockHint] = useState('')
  // Public visibility controls
  const [showTitle, setShowTitle] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showMediaCount, setShowMediaCount] = useState(false)
  const [showCreationDate, setShowCreationDate] = useState(false)
  // Task-based unlocking
  const [unlockType, setUnlockType] = useState<'scheduled' | 'task_based'>('scheduled')
  const [unlockTask, setUnlockTask] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const newFiles: FileWithPreview[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))

    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      const [movedFile] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, movedFile)
      return newFiles
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!allowNoMedia && selectedFiles.length === 0) {
      alert('Please select at least one file or enable "Create without media"')
      return
    }

    if (allowNoMedia && !memoryTitle.trim()) {
      alert('Memory title is required when creating without media')
      return
    }

    setIsUploading(true)

    try {
      // Step 1: Create memory group
      if (!currentCorner) {
        throw new Error('No corner selected')
      }

      const memoryGroupData: CreateMemoryGroup = {
        corner_id: currentCorner.id,
        title: memoryTitle || undefined,
        description: memoryDescription || undefined,
        is_locked: isLocked,
        unlock_date: (unlockDate && unlockTime) 
          ? new Date(`${unlockDate}T${unlockTime}`) 
          : undefined,
        // Advanced locking features
        lock_visibility: lockVisibility,
        show_date_hint: showDateHint,
        show_image_preview: showImagePreview,
        blur_percentage: blurPercentage,
        unlock_hint: unlockHint || undefined,
        // Public visibility controls
        show_title: showTitle,
        show_description: showDescription,
        show_media_count: showMediaCount,
        show_creation_date: showCreationDate,
        // Task-based unlocking
        unlock_type: unlockType,
        unlock_task: unlockTask || undefined
      }

      const groupResponse = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryGroupData)
      })

      if (!groupResponse.ok) {
        throw new Error('Failed to create memory group')
      }

      const { data: memoryGroup } = await groupResponse.json()

      // Step 2: Upload files and create media items (sequential to maintain order)
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        try {
          // Update progress
          setUploadProgress(prev => ({ ...prev, [file.id]: 0 }))

          // Get presigned URL
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.file.name,
              fileType: file.file.type,
              fileSize: file.file.size
            })
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to get upload URL')
          }

          const { uploadUrl, key, fileUrl } = await uploadResponse.json()

          // Upload to S3
          setUploadProgress(prev => ({ ...prev, [file.id]: 25 }))
          
          const s3Response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file.file,
            headers: {
              'Content-Type': file.file.type
            }
          })

          if (!s3Response.ok) {
            throw new Error('Failed to upload file to S3')
          }

          setUploadProgress(prev => ({ ...prev, [file.id]: 75 }))

          // Create media item in database
          const mediaData: CreateMediaItem = {
            corner_id: currentCorner.id,
            memory_group_id: memoryGroup.id,
            filename: file.file.name,
            original_name: file.file.name,
            s3_key: key,
            s3_url: fileUrl,
            file_type: file.file.type,
            file_size: file.file.size,
            sort_order: i
          }

          const mediaResponse = await fetch('/api/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mediaData)
          })

          if (!mediaResponse.ok) {
            throw new Error('Failed to create media item')
          }

          setUploadProgress(prev => ({ ...prev, [file.id]: 100 }))
          
          // Mark file as uploaded and store the S3 URL
          setSelectedFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === file.id ? { ...f, uploaded: true, uploadedUrl: fileUrl } : f
            )
          )

        } catch (error) {
          console.error(`Upload failed for ${file.file.name}:`, error)
          setSelectedFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === file.id ? { ...f, error: error instanceof Error ? error.message : 'Upload failed' } : f
            )
          )
        }
      }
      }

      // Success - redirect or reset form
      alert('Memory created successfully!')
      
      // Reset form
      setMemoryTitle('')
      setMemoryDescription('')
      setIsLocked(false)
      setUnlockDate('')
      setUnlockTime('')
      setSelectedFiles([])
      setUploadProgress({})
      setAllowNoMedia(false)
      // Reset advanced locking fields
      setLockVisibility('private')
      setShowDateHint(false)
      setShowImagePreview(false)
      setBlurPercentage(95)
      setUnlockHint('')
      // Reset public visibility controls
      setShowTitle(false)
      setShowDescription(false)
      setShowMediaCount(false)
      setShowCreationDate(false)
      // Reset task-based unlocking
      setUnlockType('scheduled')
      setUnlockTask('')
      
      // Refresh the page
      window.location.reload()

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to create memory. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Memory Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Memory Details
          </CardTitle>
          <CardDescription>
            Give your memory a title and description to make it special
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memory-title">Memory Title</Label>
            <RichTextEditor
              value={memoryTitle}
              onChange={setMemoryTitle}
              placeholder="e.g., Our Romantic Evening, Beach Vacation 2024..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory-description">Description (Optional)</Label>
            <RichTextEditor
              value={memoryDescription}
              onChange={setMemoryDescription}
              placeholder="Add a beautiful description of this memory..."
            />
          </div>

          {/* Create without media option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allow-no-media"
              checked={allowNoMedia}
              onChange={(e) => setAllowNoMedia(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="allow-no-media">
              Create memory without uploading media (text-only memory)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Privacy & Scheduling
          </CardTitle>
          <CardDescription>
            Control when this memory becomes visible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={isLocked ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLocked(!isLocked)}
              className="flex items-center gap-2"
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {isLocked ? 'Locked' : 'Visible'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {isLocked ? 'This memory will be hidden from the main gallery' : 'This memory will be visible immediately'}
            </span>
          </div>

          {isLocked && (
            <div className="p-4 bg-accent/10 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Schedule Automatic Unlock (Optional)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unlock-date">Unlock Date</Label>
                  <Input
                    id="unlock-date"
                    type="date"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    className="romantic-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unlock-time">Unlock Time</Label>
                  <Input
                    id="unlock-time"
                    type="time"
                    value={unlockTime}
                    onChange={(e) => setUnlockTime(e.target.value)}
                    className="romantic-input"
                  />
                </div>
              </div>
              
              {unlockDate && unlockTime && (
                <p className="text-sm text-muted-foreground">
                  This memory will automatically unlock on {new Date(`${unlockDate}T${unlockTime}`).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Advanced Locking Options */}
          {isLocked && (
            <div className="p-4 bg-accent/5 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                Advanced Locking Options
              </div>

              {/* Lock Visibility */}
              <div className="space-y-2">
                <Label>Visibility When Locked</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={lockVisibility === 'private' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLockVisibility('private')}
                  >
                    Private (Hidden)
                  </Button>
                  <Button
                    type="button"
                    variant={lockVisibility === 'public' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLockVisibility('public')}
                  >
                    Public (Visible but Locked)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lockVisibility === 'private' 
                    ? 'Memory will be completely hidden from users until unlocked'
                    : 'Memory will be visible to users but appear as locked with customizable hints'
                  }
                </p>
              </div>


              {/* Public Lock Options */}
              {lockVisibility === 'public' && (
                <div className="space-y-4 border-t border-accent/20 pt-4">
                  <div className="text-sm font-medium">Public Lock Visibility & Hints</div>
                  
                  {/* Visibility Controls */}
                  <div className="space-y-3 p-3 bg-accent/5 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Show to users when locked:</div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-title"
                        checked={showTitle}
                        onChange={(e) => setShowTitle(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="show-title" className="text-sm">Title</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-description"
                        checked={showDescription}
                        onChange={(e) => setShowDescription(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="show-description" className="text-sm">Description</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-media-count"
                        checked={showMediaCount}
                        onChange={(e) => setShowMediaCount(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="show-media-count" className="text-sm">Media count</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-creation-date"
                        checked={showCreationDate}
                        onChange={(e) => setShowCreationDate(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="show-creation-date" className="text-sm">Creation date</Label>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      By default, all information is hidden when the memory is locked. Check the boxes above to show specific details to users.
                    </p>
                  </div>
                  
                  {/* Date Hint */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-date-hint"
                      checked={showDateHint}
                      onChange={(e) => setShowDateHint(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="show-date-hint" className="text-sm">Show date when memory was created</Label>
                  </div>

                  {/* Image Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-image-preview"
                        checked={showImagePreview}
                        onChange={(e) => setShowImagePreview(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="show-image-preview" className="text-sm">Show blurred preview image</Label>
                    </div>
                    
                    {showImagePreview && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="blur-percentage" className="text-sm">Blur intensity: {blurPercentage}%</Label>
                        <input
                          type="range"
                          id="blur-percentage"
                          min="50"
                          max="98"
                          value={blurPercentage}
                          onChange={(e) => setBlurPercentage(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Unlock Hint */}
                  <div className="space-y-2">
                    <Label htmlFor="unlock-hint">Hint Text (Optional)</Label>
                    <Input
                      id="unlock-hint"
                      placeholder="e.g., 'A special surprise awaits...'"
                      value={unlockHint}
                      onChange={(e) => setUnlockHint(e.target.value)}
                      className="romantic-input"
                    />
                  </div>

                  {/* Task Assignment - Only for public locked memories without schedule */}
                  {lockVisibility === 'public' && !unlockDate && (
                    <div className="space-y-4 border-t border-accent/20 pt-4">
                      <div className="text-sm font-medium">Task-Based Unlocking</div>
                      
                      <div className="space-y-2">
                        <Label>Unlock Method</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={unlockType === 'scheduled' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUnlockType('scheduled')}
                          >
                            Time-Based
                          </Button>
                          <Button
                            type="button"
                            variant={unlockType === 'task_based' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUnlockType('task_based')}
                          >
                            Task-Based
                          </Button>
                        </div>
                      </div>

                      {unlockType === 'task_based' && (
                        <div className="space-y-2">
                          <Label htmlFor="unlock-task">Task Assignment</Label>
                          <Input
                            id="unlock-task"
                            placeholder="e.g., 'Complete your first week of exercise' or 'Send me a photo of your smile'"
                            value={unlockTask}
                            onChange={(e) => setUnlockTask(e.target.value)}
                            className="romantic-input"
                          />
                          <p className="text-xs text-muted-foreground">
                            Describe the task that needs to be completed to unlock this memory
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      {!allowNoMedia && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Add photos and videos to this memory. You can upload multiple files at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-accent/50 hover:border-primary/50 transition-colors"
            disabled={isUploading}
          >
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm font-medium">Choose Files</div>
              <div className="text-xs text-muted-foreground">
                Photos and videos up to 100MB each
              </div>
            </div>
          </Button>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Files ({selectedFiles.length}) - Drag to reorder</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg cursor-move hover:bg-accent/15 transition-colors"
                    draggable={!isUploading}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString())
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                      const toIndex = index
                      if (fromIndex !== toIndex) {
                        moveFile(fromIndex, toIndex)
                      }
                    }}
                  >
                    {/* Drag Handle and Order */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                      {(file.uploadedUrl && file.file.type.startsWith('image/')) || file.preview ? (
                        <img 
                          src={file.uploadedUrl || file.preview} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {file.file.type.startsWith('video/') ? (
                            <Video className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{file.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.file.size)}
                      </div>
                      
                      {/* Upload Progress */}
                      {isUploading && uploadProgress[file.id] !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-accent/20 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[file.id]}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {uploadProgress[file.id]}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      {file.uploaded && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          ✓ Uploaded
                        </Badge>
                      )}
                      
                      {file.error && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          ✗ {file.error}
                        </Badge>
                      )}
                    </div>

                    {/* Remove Button */}
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isUploading || (!allowNoMedia && selectedFiles.length === 0)}
          className="romantic-button"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Memory...
            </>
          ) : (
            <>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Memory
            </>
          )}
        </Button>
      </div>
    </form>
  )
}