"use client"

import { MemoryGroup, ViewMode } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Image as ImageIcon, Video, Clock, Lock, Users } from 'lucide-react'
import { format } from 'date-fns'
import CountdownTimer from './CountdownTimer'

interface MemoryGroupCardProps {
  memoryGroup: MemoryGroup
  viewMode: ViewMode
  onClick: () => void
}

export default function MemoryGroupCard({ memoryGroup, viewMode, onClick }: MemoryGroupCardProps) {
  const coverMedia = memoryGroup.media_items?.[0]
  const mediaCount = memoryGroup.media_count || 0
  const imageCount = memoryGroup.media_items?.filter(m => m.file_type && m.file_type.startsWith('image/')).length || 0
  const videoCount = memoryGroup.media_items?.filter(m => m.file_type && m.file_type.startsWith('video/')).length || 0
  
  // Get the earliest date_taken from media items, fallback to created_at
  const getMemoryDate = () => {
    return memoryGroup.media_items?.reduce((earliest, media) => {
      if (!media.date_taken) return earliest
      const mediaDate = new Date(media.date_taken)
      return !earliest || mediaDate < earliest ? mediaDate : earliest
    }, null as Date | null) || new Date(memoryGroup.created_at)
  }

  // Check if memory is actually locked (and not just scheduled for future unlock)
  const isCurrentlyLocked = memoryGroup.is_locked && 
    (!memoryGroup.unlock_date || memoryGroup.unlock_date > new Date())
  
  // Render media with blur effect if needed
  const renderMediaContent = (className: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    if (!coverMedia) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Heart className={`text-primary/40 ${size === 'small' ? 'h-6 w-6' : size === 'large' ? 'h-12 w-12' : 'h-8 w-8'}`} />
        </div>
      )
    }

    const isVideo = coverMedia.file_type && coverMedia.file_type.startsWith('video/')
    const shouldBlur = isCurrentlyLocked && 
      memoryGroup.lock_visibility === 'public' && 
      memoryGroup.show_image_preview
    
    const blurStyle = shouldBlur ? {
      filter: `blur(${(memoryGroup.blur_percentage || 80) / 10}px)`
    } : {}

    if (isVideo) {
      return (
        <div className="relative w-full h-full">
          <video
            src={coverMedia.s3_url}
            className={className}
            style={blurStyle}
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Video className={`text-white ${size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-8 w-8' : 'h-4 w-4'}`} />
          </div>
        </div>
      )
    }

    return (
      <img
        src={coverMedia.s3_url}
        alt={memoryGroup.title || 'Memory'}
        className={className}
        style={blurStyle}
      />
    )
  }

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return (
          <div className="flex items-center gap-4 p-4">
            {/* Thumbnail */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-accent/20 flex-shrink-0">
              {coverMedia ? (
                coverMedia.file_type && coverMedia.file_type.startsWith('video/') ? (
                  <div className="relative w-full h-full">
                    <video
                      src={coverMedia.s3_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={coverMedia.s3_url}
                    alt={memoryGroup.title || 'Memory'}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary/40" />
                </div>
              )}
              {memoryGroup.is_locked && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-romantic text-lg text-primary truncate">
                    {memoryGroup.title || 'Untitled Memory'}
                  </h3>
                  {memoryGroup.description && (
                    <div 
                      className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
                    />
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {mediaCount}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {format(getMemoryDate(), 'MMM d, yyyy')}
                  </time>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                {imageCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    {imageCount}
                  </Badge>
                )}
                {videoCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    {videoCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )

      case 'icons':
        return (
          <div className="aspect-square relative group">
            {coverMedia ? (
              coverMedia.file_type && coverMedia.file_type.startsWith('video/') ? (
                <div className="relative w-full h-full">
                  <video
                    src={coverMedia.s3_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Video className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={coverMedia.s3_url}
                  alt={memoryGroup.title || 'Memory'}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                <Heart className="h-12 w-12 text-primary/40" />
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="font-romantic text-lg truncate">
                {memoryGroup.title || 'Untitled Memory'}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  {mediaCount}
                </div>
                <time className="text-sm">
                  {format(getMemoryDate(), 'MMM yyyy')}
                </time>
              </div>
            </div>

            {/* Lock indicator */}
            {memoryGroup.is_locked && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        )

      case 'columns':
        return (
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <h3 className="font-romantic text-lg text-primary">
                {memoryGroup.title || 'Untitled Memory'}
              </h3>
              {memoryGroup.is_locked && (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-1 overflow-hidden">
              {memoryGroup.media_items?.slice(0, 4).map((media, index) => (
                <div key={media.id} className="w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                  <img
                    src={media.s3_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {mediaCount > 4 && (
                <div className="w-12 h-12 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">+{mediaCount - 4}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {memoryGroup.description && (
              <div 
                className="text-sm text-muted-foreground line-clamp-3 prose prose-sm"
                dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
              />
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {imageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {imageCount}
                  </span>
                )}
                {videoCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {videoCount}
                  </span>
                )}
              </div>
              <time>{format(getMemoryDate(), 'MMM d')}</time>
            </div>
          </div>
        )

      case 'timeline':
        const memoryDate = getMemoryDate()
        
        return (
          <div className="flex gap-4 p-4">
            {/* Date */}
            <div className="flex-shrink-0 w-16 text-center">
              <div className="text-lg font-romantic text-primary">
                {format(memoryDate, 'd')}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(memoryDate, 'MMM')}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                  {coverMedia ? (
                    coverMedia.file_type && coverMedia.file_type.startsWith('video/') ? (
                      <div className="relative w-full h-full">
                        <video
                          src={coverMedia.s3_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={coverMedia.s3_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <Heart className="h-6 w-6 text-primary/40 m-3" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-romantic text-base text-primary truncate">
                    {memoryGroup.title || 'Untitled Memory'}
                  </h3>
                  {memoryGroup.description && (
                    <div 
                      className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {mediaCount} items
                    {memoryGroup.is_locked && (
                      <>
                        • <Lock className="h-3 w-3" /> Locked
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default: // gallery
        return (
          <div className="relative group">
            {/* Main image/video */}
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-accent/20">
              {renderMediaContent("w-full h-full object-cover group-hover:scale-105 transition-transform duration-300", 'large')}
              
              {/* Locked overlay for public locked memories */}
              {isCurrentlyLocked && memoryGroup.lock_visibility === 'public' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <Lock className="h-8 w-8 mx-auto mb-2" />
                    {memoryGroup.unlock_hint && (
                      <p className="text-sm font-medium">{memoryGroup.unlock_hint}</p>
                    )}
                    {memoryGroup.unlock_type === 'scheduled' && memoryGroup.unlock_date && (
                      <div className="mt-2">
                        <CountdownTimer 
                          unlockDate={new Date(memoryGroup.unlock_date)} 
                          className="text-white justify-center"
                        />
                      </div>
                    )}
                    {memoryGroup.unlock_type === 'task_based' && memoryGroup.unlock_task && (
                      <p className="text-xs mt-1 opacity-90">Task: {memoryGroup.unlock_task}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-romantic text-lg text-primary line-clamp-2 flex-1">
                  {memoryGroup.title || 'Untitled Memory'}
                </h3>
                {memoryGroup.is_locked && (
                  <Lock className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                )}
              </div>

              {memoryGroup.description && (
                <div 
                  className="text-sm text-muted-foreground mb-3 line-clamp-2 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: memoryGroup.description }}
                />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {mediaCount}
                  </Badge>
                  {imageCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {imageCount}
                    </Badge>
                  )}
                  {videoCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Video className="h-3 w-3 mr-1" />
                      {videoCount}
                    </Badge>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {format(getMemoryDate(), 'MMM d, yyyy')}
                </time>
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 border-2 border-primary/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        )
    }
  }

  const getCardClassName = () => {
    const baseClasses = "cursor-pointer transition-all duration-300 hover:shadow-lg"
    
    switch (viewMode) {
      case 'list':
        return `${baseClasses} border-b border-accent/20 last:border-b-0 hover:bg-accent/5`
      case 'icons':
        return `${baseClasses} rounded-lg overflow-hidden bg-white/80 hover:scale-105`
      case 'columns':
        return `${baseClasses} bg-white/80 rounded-lg border border-accent/20 hover:border-primary/30`
      case 'timeline':
        return `${baseClasses} border-l-2 border-accent/20 hover:border-primary/50 bg-white/50 hover:bg-white/80`
      default: // gallery
        return `${baseClasses} bg-white/80 rounded-lg border border-accent/20 hover:border-primary/30 hover:scale-[1.02]`
    }
  }

  return (
    <div className={getCardClassName()} onClick={onClick}>
      {renderContent()}
    </div>
  )
}