"use client"

import { useState } from 'react'
import { MediaItem } from '@/lib/types'
import MediaCard from './MediaCard'
import MediaDetailModal from './MediaDetailModal'
import { Heart, Search, Calendar, Image as ImageIcon, Video, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface MediaGalleryProps {
  mediaItems: MediaItem[]
}

export default function MediaGallery({ mediaItems }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all')
  const router = useRouter()

  // Note: This component receives pre-filtered mediaItems from parent
  // The parent component should ensure mediaItems are already filtered by corner

  // Filter media based on search term and type
  const filteredMedia = mediaItems.filter(media => {
    const matchesSearch = searchTerm === '' || 
      media.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      media.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      media.original_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' ||
      (filterType === 'image' && media.file_type.startsWith('image/')) ||
      (filterType === 'video' && media.file_type.startsWith('video/'))

    return matchesSearch && matchesType
  })

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getTypeCount = (type: 'all' | 'image' | 'video') => {
    if (type === 'all') return mediaItems.length
    if (type === 'image') return mediaItems.filter(m => m.file_type.startsWith('image/')).length
    if (type === 'video') return mediaItems.filter(m => m.file_type.startsWith('video/')).length
    return 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-accent/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary animate-heart-beat" />
              <div>
                <h1 className="text-2xl font-romantic text-primary">Our Little Corner</h1>
                <p className="text-sm text-muted-foreground font-body">
                  {mediaItems.length} precious memories 💕
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memories by title, note, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 romantic-input"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="font-body"
              >
                <Calendar className="h-4 w-4 mr-2" />
                All ({getTypeCount('all')})
              </Button>
              <Button
                variant={filterType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('image')}
                className="font-body"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Photos ({getTypeCount('image')})
              </Button>
              <Button
                variant={filterType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('video')}
                className="font-body"
              >
                <Video className="h-4 w-4 mr-2" />
                Videos ({getTypeCount('video')})
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredMedia.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-primary/40 mx-auto mb-4" />
            <h2 className="text-2xl font-romantic text-primary mb-2">
              {searchTerm || filterType !== 'all' ? 'No memories found' : 'No memories yet'}
            </h2>
            <p className="text-muted-foreground font-body mb-6">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter settings.'
                : 'Start creating beautiful memories together! 💖'
              }
            </p>
            {searchTerm || filterType !== 'all' ? (
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('all')
                }}
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          // Masonry Grid
          <div className="masonry-grid">
            {filteredMedia.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                onClick={() => setSelectedMedia(media)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* Floating Admin Button (hidden, accessible via direct URL) */}
      <div className="fixed bottom-6 right-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <Button
          onClick={() => router.push('/admin')}
          variant="outline" 
          size="sm"
          className="bg-white/80 backdrop-blur-sm"
        >
          Admin
        </Button>
      </div>
    </div>
  )
}