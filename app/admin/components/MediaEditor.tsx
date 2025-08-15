"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MediaItem, MemoryGroup } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Plus,
  Trash2,
  Edit,
  Save,
  GripVertical,
  RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import RichTextEditor from './RichTextEditor'

interface MediaEditorProps {
  memoryGroup: MemoryGroup
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

interface FileWithPreview {
  id: string
  file: File
  preview?: string
  progress?: number
  uploaded?: boolean
  error?: string
}

export default function MediaEditor({ memoryGroup, isOpen, onClose, onUpdate }: MediaEditorProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(memoryGroup.media_items || [])
  const [newFiles, setNewFiles] = useState<FileWithPreview[]>([])
  const [editingMedia, setEditingMedia] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNote, setEditNote] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const filesWithPreview: FileWithPreview[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))

    setNewFiles(prev => [...prev, ...filesWithPreview])
  }

  const removeNewFile = (fileId: string) => {
    setNewFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const moveNewFile = (fromIndex: number, toIndex: number) => {
    setNewFiles(prev => {
      const newArray = [...prev]
      const [movedFile] = newArray.splice(fromIndex, 1)
      newArray.splice(toIndex, 0, movedFile)
      return newArray
    })
  }

  const moveMediaItem = (fromIndex: number, toIndex: number) => {
    setMediaItems(prev => {
      const newArray = [...prev]
      const [movedItem] = newArray.splice(fromIndex, 1)
      newArray.splice(toIndex, 0, movedItem)
      return newArray
    })
  }

  const handleAddNewMedia = async () => {
    if (newFiles.length === 0) return

    setIsUploading(true)

    try {
      const currentMaxSort = Math.max(...mediaItems.map(m => m.sort_order), -1)

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]

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

        if (!uploadResponse.ok) throw new Error('Failed to get upload URL')

        const { uploadUrl, key, fileUrl } = await uploadResponse.json()

        // Upload to S3
        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file.file,
          headers: { 'Content-Type': file.file.type }
        })

        if (!s3Response.ok) throw new Error('Failed to upload file to S3')

        // Create media item
        const mediaResponse = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memory_group_id: memoryGroup.id,
            filename: file.file.name,
            original_name: file.file.name,
            s3_key: key,
            s3_url: fileUrl,
            file_type: file.file.type,
            file_size: file.file.size,
            sort_order: currentMaxSort + i + 1
          })
        })

        if (!mediaResponse.ok) throw new Error('Failed to create media item')

        const newMediaItem = await mediaResponse.json()
        setMediaItems(prev => [...prev, newMediaItem])
      }

      // Clear new files
      newFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview)
      })
      setNewFiles([])
      
      onUpdate()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to add media. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return

    try {
      const response = await fetch(`/api/media?id=${mediaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete media')

      setMediaItems(prev => prev.filter(m => m.id !== mediaId))
      onUpdate()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete media. Please try again.')
    }
  }

  const handleEditMedia = (media: MediaItem) => {
    setEditingMedia(media.id)
    setEditTitle(media.title || '')
    setEditNote(media.note || '')
  }

  const handleSaveEdit = async () => {
    if (!editingMedia) return

    try {
      const response = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMedia,
          title: editTitle || undefined,
          note: editNote || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to update media')

      const updatedMedia = await response.json()
      setMediaItems(prev => prev.map(m => m.id === editingMedia ? updatedMedia : m))
      
      setEditingMedia(null)
      setEditTitle('')
      setEditNote('')
      onUpdate()
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update media. Please try again.')
    }
  }

  const handleSaveOrder = async () => {
    setIsReordering(true)

    try {
      // Update sort order for all media items
      const updates = mediaItems.map((media, index) => ({
        id: media.id,
        sort_order: index
      }))

      for (const update of updates) {
        const response = await fetch('/api/media', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        })

        if (!response.ok) throw new Error('Failed to update sort order')
      }

      onUpdate()
      alert('Media order updated successfully!')
    } catch (error) {
      console.error('Reorder error:', error)
      alert('Failed to update media order. Please try again.')
    } finally {
      setIsReordering(false)
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Media - {memoryGroup.title || 'Untitled Memory'}</DialogTitle>
          <DialogDescription>
            Add, remove, reorder, and edit media items in this memory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Media */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Existing Media ({mediaItems.length})</h3>
              {mediaItems.length > 1 && (
                <Button
                  onClick={handleSaveOrder}
                  disabled={isReordering}
                  size="sm"
                  variant="outline"
                >
                  {isReordering ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Order
                </Button>
              )}
            </div>

            {mediaItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No media in this memory yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {mediaItems.map((media, index) => (
                  <div
                    key={media.id}
                    className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg hover:bg-accent/15 transition-colors"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString())
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                      if (fromIndex !== index) {
                        moveMediaItem(fromIndex, index)
                      }
                    }}
                  >
                    {/* Drag Handle and Order */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                      {media.file_type.startsWith('image/') ? (
                        <img
                          src={media.s3_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Media Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {media.title || media.original_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(media.file_size)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMedia(media)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMedia(media.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add New Media</h3>

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
              className="w-full h-24 border-2 border-dashed border-accent/50 hover:border-primary/50 transition-colors"
              disabled={isUploading}
            >
              <div className="text-center">
                <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">Add More Files</div>
                <div className="text-xs text-muted-foreground">
                  Photos and videos up to 100MB each
                </div>
              </div>
            </Button>

            {/* New Files Preview */}
            {newFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">New Files to Add ({newFiles.length})</h4>
                  <Button
                    onClick={handleAddNewMedia}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Add to Memory
                  </Button>
                </div>

                <div className="space-y-2">
                  {newFiles.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg hover:bg-accent/15 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString())
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                        if (fromIndex !== index) {
                          moveNewFile(fromIndex, index)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center">
                          {mediaItems.length + index + 1}
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{file.file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.file.size)}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewFile(file.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Edit Media Dialog */}
      <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update the title and note for this media item
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-media-title">Title (Optional)</Label>
              <RichTextEditor
                value={editTitle}
                onChange={setEditTitle}
                placeholder="Enter a title for this media..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-media-note">Note (Optional)</Label>
              <RichTextEditor
                value={editNote}
                onChange={setEditNote}
                placeholder="Add a note about this media..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingMedia(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}