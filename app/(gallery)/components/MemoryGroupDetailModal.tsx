"use client"

import { useState } from 'react'
import { MemoryGroup, MediaItem } from '@/lib/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Calendar,
  Image as ImageIcon,
  Video,
  FileText,
  Clock,
  HardDrive,
  Users,
  Edit
} from 'lucide-react'
import { format } from 'date-fns'

interface MemoryGroupDetailModalProps {
  memoryGroup: MemoryGroup
  isOpen: boolean
  onClose: () => void
}

export default function MemoryGroupDetailModal({ 
  memoryGroup, 
  isOpen, 
  onClose 
}: MemoryGroupDetailModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const mediaItems = memoryGroup.media_items || []
  const currentMedia = mediaItems[currentMediaIndex]

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Media Display Area */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {mediaItems.length === 0 ? (
              <div className="text-center text-white/60">
                <Heart className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">No media in this memory</p>
              </div>
            ) : (
              <>
                {/* Main Media */}
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  {currentMedia.file_type.startsWith('video/') ? (
                    <video
                      src={currentMedia.s3_url}
                      controls
                      className="max-w-full max-h-full"
                      autoPlay={false}
                    />
                  ) : (
                    <img
                      src={currentMedia.s3_url}
                      alt={currentMedia.title || currentMedia.original_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                {/* Navigation */}
                {mediaItems.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Media Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentMediaIndex + 1} of {mediaItems.length}
                </div>
              </>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Info Panel */}
          <div className="w-96 bg-white flex flex-col max-h-[90vh]">
            {/* Header */}
            <DialogHeader className="p-6 border-b border-accent/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="font-romantic text-xl text-primary">
                    {memoryGroup.title || 'Untitled Memory'}
                  </DialogTitle>
                  {memoryGroup.description && (
                    <div 
                      className="text-muted-foreground mt-2 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/admin', '_blank')}
                  className="text-muted-foreground hover:text-foreground"
                  title="Edit in Admin Panel"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Current Media Info */}
            {currentMedia && (
              <div className="p-6 border-b border-accent/20">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  {currentMedia.file_type.startsWith('video/') ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {currentMedia.title || currentMedia.original_name}
                </h3>

                {currentMedia.note && (
                  <div className="mb-4">
                    <div 
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentMedia.note }}
                    />
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {currentMedia.date_taken && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(currentMedia.date_taken), 'MMM d, yyyy • h:mm a')}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="h-4 w-4" />
                    {formatFileSize(currentMedia.file_size)}
                  </div>

                  {currentMedia.width && currentMedia.height && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      {currentMedia.width} × {currentMedia.height}
                    </div>
                  )}

                  {currentMedia.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(currentMedia.duration)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Memory Group Stats */}
            <div className="p-6 border-b border-accent/20">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Memory Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {mediaItems.length}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Items
                  </div>
                </div>
                
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {mediaItems.filter(m => m.file_type.startsWith('image/')).length}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Photos
                  </div>
                </div>
                
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {mediaItems.filter(m => m.file_type.startsWith('video/')).length}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Videos
                  </div>
                </div>
                
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {formatFileSize(mediaItems.reduce((sum, m) => sum + m.file_size, 0))}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Size
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(memoryGroup.created_at), 'MMM d, yyyy')}
              </div>
            </div>

            {/* Media Thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex-1 overflow-auto p-6">
                <h3 className="font-medium mb-3">All Media</h3>
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((media, index) => (
                    <div
                      key={media.id}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        index === currentMediaIndex 
                          ? 'border-primary' 
                          : 'border-transparent hover:border-accent'
                      }`}
                      onClick={() => setCurrentMediaIndex(index)}
                    >
                      {media.file_type.startsWith('video/') ? (
                        <div className="relative w-full h-full bg-black flex items-center justify-center">
                          <video
                            src={media.s3_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <Video className="absolute inset-0 w-6 h-6 text-white m-auto" />
                        </div>
                      ) : (
                        <img
                          src={media.s3_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}