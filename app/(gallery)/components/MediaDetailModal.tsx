"use client"

import { useState, useRef } from 'react'
import Image from 'next/image'
import { MediaItem } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Heart, 
  Calendar, 
  Download, 
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface MediaDetailModalProps {
  media: MediaItem
  isOpen: boolean
  onClose: () => void
}

export default function MediaDetailModal({ media, isOpen, onClose }: MediaDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = media.file_type.startsWith('video/')
  const timeAgo = formatDistanceToNow(new Date(media.created_at), { addSuffix: true })
  
  const dateTaken = media.date_taken 
    ? format(new Date(media.date_taken), 'MMMM d, yyyy \'at\' h:mm a')
    : null

  const handleVideoPlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isVideoPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsVideoPlaying(!isVideoPlaying)
  }

  const handleVideoMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isVideoMuted
    setIsVideoMuted(!isVideoMuted)
  }

  const handleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!isFullscreen) {
      video.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = media.s3_url
    link.download = media.original_name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.title || 'Our Memory',
          text: media.note || 'A beautiful memory from our little corner',
          url: media.s3_url,
        })
      } catch (error) {
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(media.s3_url)
        // You might want to show a toast notification here
        console.log('Link copied to clipboard')
      } catch (error) {
        console.error('Failed to copy link')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
        {/* Header */}
        <DialogHeader className="p-6 pb-3 border-b border-accent/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-romantic text-primary mb-2">
                {media.title || media.original_name}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{dateTaken || `Added ${timeAgo}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 text-primary" />
                  <span>{isVideo ? 'Video' : 'Photo'} Memory</span>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="font-body"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="font-body"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Media viewer */}
          <div className="flex-1 flex items-center justify-center bg-black/5 relative">
            {!imageError ? (
              <>
                {isVideo ? (
                  <div className="relative max-w-full max-h-full">
                    <video
                      ref={videoRef}
                      src={media.s3_url}
                      className="max-w-full max-h-full object-contain"
                      controls={false}
                      muted={isVideoMuted}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onLoadedData={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                    
                    {/* Custom video controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleVideoPlayPause}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          {isVideoPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleVideoMute}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          {isVideoMuted ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFullscreen}
                        className="text-white hover:text-white hover:bg-white/20"
                      >
                        <Maximize className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={media.s3_url}
                    alt={media.title || media.original_name}
                    width={media.width || 800}
                    height={media.height || 600}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                )}

                {/* Loading state */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Heart className="h-12 w-12 text-primary/40 mx-auto mb-4 animate-heart-beat" />
                      <p className="text-muted-foreground font-body">Loading your memory...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Error state
              <div className="text-center">
                <Heart className="h-16 w-16 text-primary/40 mx-auto mb-4" />
                <h3 className="text-lg font-romantic text-primary mb-2">Unable to load media</h3>
                <p className="text-muted-foreground font-body mb-4">
                  This memory seems to be temporarily unavailable.
                </p>
                <Button variant="outline" onClick={handleDownload}>
                  Try downloading instead
                </Button>
              </div>
            )}
          </div>

          {/* Note panel */}
          {media.note && (
            <div className="w-80 border-l border-accent/20 bg-white/50 backdrop-blur-sm p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-primary" />
                <h3 className="font-romantic text-lg text-primary">Our Memory</h3>
              </div>
              
              <div 
                className="prose prose-sm max-w-none font-body text-foreground/90"
                dangerouslySetInnerHTML={{ __html: media.note }}
              />
              
              {/* Metadata */}
              <div className="mt-6 pt-4 border-t border-accent/20">
                <div className="space-y-2 text-sm text-muted-foreground font-body">
                  <div>
                    <strong>File:</strong> {media.original_name}
                  </div>
                  <div>
                    <strong>Size:</strong> {formatFileSize(media.file_size)}
                  </div>
                  {media.width && media.height && (
                    <div>
                      <strong>Dimensions:</strong> {media.width} × {media.height}
                    </div>
                  )}
                  {media.duration && (
                    <div>
                      <strong>Duration:</strong> {formatDuration(media.duration)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Utility functions
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}