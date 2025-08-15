"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Play, Calendar, FileText } from 'lucide-react'
import { MediaItem } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface MediaCardProps {
  media: MediaItem
  onClick: () => void
}

export default function MediaCard({ media, onClick }: MediaCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isVideo = media.file_type.startsWith('video/')
  const hasNote = media.note && media.note.trim().length > 0
  const hasTitle = media.title && media.title.trim().length > 0

  // Calculate relative time
  const timeAgo = formatDistanceToNow(new Date(media.created_at), { addSuffix: true })

  // Format date taken if available
  const dateTaken = media.date_taken 
    ? new Date(media.date_taken).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  return (
    <div className="masonry-item group">
      <div 
        className="romantic-card cursor-pointer overflow-hidden relative"
        onClick={onClick}
      >
        {/* Image/Video container */}
        <div className="relative aspect-auto">
          {!imageError ? (
            <>
              <Image
                src={media.s3_url}
                alt={media.title || media.original_name}
                width={media.width || 400}
                height={media.height || 300}
                className={`w-full h-auto object-cover transition-all duration-300 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized // Since we're using S3 URLs
              />
              
              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-accent/20 animate-pulse flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary/40 animate-heart-beat" />
                </div>
              )}
            </>
          ) : (
            // Error placeholder
            <div className="aspect-square bg-accent/20 flex items-center justify-center">
              <div className="text-center">
                <Heart className="h-12 w-12 text-primary/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Unable to load image</p>
              </div>
            </div>
          )}

          {/* Video indicator */}
          {isVideo && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
              <Play className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-center">
                <Heart className="h-6 w-6 text-white animate-heart-beat" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          {hasTitle && (
            <h3 className="font-romantic text-lg text-primary mb-2 line-clamp-2">
              {media.title}
            </h3>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            {dateTaken && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="font-body">{dateTaken}</span>
              </div>
            )}
            
            {hasNote && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span className="font-body">Note</span>
              </div>
            )}
          </div>

          {/* Note preview */}
          {hasNote && (
            <div className="text-sm text-foreground/80 font-body line-clamp-3 mb-3">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: (media.note || '').replace(/<[^>]*>/g, '').substring(0, 120) + '...' 
                }} 
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-body">{timeAgo}</span>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-primary" />
              <span className="font-body">Memory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility function to strip HTML tags (you might want to use a proper library for this)
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}