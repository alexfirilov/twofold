"use client"

import { useState } from 'react'
import { MemoryGroup, MediaItem } from '@/lib/types'
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
  Edit,
  Maximize
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
  const [isFullScreen, setIsFullScreen] = useState(false)
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col md:flex-row h-full">
            {/* Media Display Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center min-h-[50vh] md:min-h-auto order-2 md:order-1">
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
                        className="max-w-full max-h-full w-full h-full object-contain"
                        autoPlay={false}
                      />
                    ) : (
                      <img
                        src={currentMedia.s3_url}
                        alt={currentMedia.title || currentMedia.original_name}
                        className="max-w-full max-h-full object-contain w-full h-full"
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

                  {/* Full Screen Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullScreen(true)}
                    className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                    title="View full screen"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
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
            <div className="w-full md:w-96 bg-white flex flex-col max-h-[40vh] md:max-h-[90vh] order-1 md:order-2">
              {/* Header */}
              <DialogHeader className="p-4 md:p-6 border-b border-accent/20">
                <DialogTitle className="font-romantic text-xl text-primary">
                  {memoryGroup.title || 'Untitled Memory'}
                </DialogTitle>
                {memoryGroup.description && (
                  <div 
                    className="text-muted-foreground mt-2 prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
                  />
                )}
              </DialogHeader>

              {/* Current Media Info */}
              {currentMedia && (
                <div className="p-4 md:p-6 border-b border-accent/20">
                  {currentMedia.title && (
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      {currentMedia.file_type.startsWith('video/') ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {currentMedia.title}
                    </h3>
                  )}

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

                    {currentMedia.duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDuration(currentMedia.duration)}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Media Thumbnails */}
              {mediaItems.length > 1 && (
                <div className="flex-1 overflow-auto p-4 md:p-6">
                  <h3 className="font-medium mb-3">All Media</h3>
                  <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
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

      {/* Full Screen Modal */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-screen max-h-screen w-screen h-screen p-0 bg-black border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {currentMedia && (
              <>
                {/* Media */}
                {currentMedia.file_type.startsWith('video/') ? (
                  <video
                    src={currentMedia.s3_url}
                    controls
                    className="max-w-full max-h-full object-contain"
                    autoPlay={false}
                  />
                ) : (
                  <img
                    src={currentMedia.s3_url}
                    alt={currentMedia.title || 'Media'}
                    className="max-w-full max-h-full object-contain"
                  />
                )}

                {/* Navigation */}
                {mediaItems.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullScreen(false)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                >
                  <X className="h-8 w-8" />
                </Button>

                {/* Media Counter */}
                {mediaItems.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-lg">
                    {currentMediaIndex + 1} of {mediaItems.length}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}