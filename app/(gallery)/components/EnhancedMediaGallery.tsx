"use client"

import { useState, useMemo } from 'react'
import { MemoryGroup, ViewMode, SortOptions, MediaFilters } from '@/lib/db'
import MemoryGroupCard from './MemoryGroupCard'
import MemoryGroupDetailModal from './MemoryGroupDetailModal'
import ViewControls from './ViewControls'
import FilterControls from './FilterControls'
import SortControls from './SortControls'
import { Heart, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface EnhancedMediaGalleryProps {
  memoryGroups: MemoryGroup[]
}

export default function EnhancedMediaGallery({ memoryGroups }: EnhancedMediaGalleryProps) {
  const [selectedGroup, setSelectedGroup] = useState<MemoryGroup | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('gallery')
  const [filters, setFilters] = useState<MediaFilters>({})
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'created_at', direction: 'desc' })
  const router = useRouter()

  // Filter and sort memory groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = memoryGroups.filter(group => {
      // Search filter
      if (filters.search_term) {
        const searchLower = filters.search_term.toLowerCase()
        const matchesTitle = group.title?.toLowerCase().includes(searchLower)
        const matchesDescription = group.description?.toLowerCase().includes(searchLower)
        const matchesMediaNotes = group.media_items?.some(media => 
          media.title?.toLowerCase().includes(searchLower) ||
          media.note?.toLowerCase().includes(searchLower) ||
          media.original_name.toLowerCase().includes(searchLower)
        )
        
        if (!matchesTitle && !matchesDescription && !matchesMediaNotes) {
          return false
        }
      }

      // File type filter
      if (filters.file_type && filters.file_type !== 'all') {
        const hasMatchingFiles = group.media_items?.some(media => 
          media.file_type && media.file_type.startsWith(filters.file_type!)
        )
        if (!hasMatchingFiles) return false
      }

      // Date range filter
      if (filters.date_from || filters.date_to) {
        const groupDate = new Date(group.created_at)
        if (filters.date_from && groupDate < filters.date_from) return false
        if (filters.date_to && groupDate > filters.date_to) return false
      }

      return true
    })

    // Sort groups
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortOptions.field) {
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'title':
          aValue = a.title || ''
          bValue = b.title || ''
          break
        case 'date_taken':
          // Use the earliest date_taken from media items
          aValue = a.media_items?.reduce((earliest, media) => {
            if (!media.date_taken) return earliest
            const mediaDate = new Date(media.date_taken)
            return !earliest || mediaDate < earliest ? mediaDate : earliest
          }, null as Date | null) || new Date(a.created_at)
          bValue = b.media_items?.reduce((earliest, media) => {
            if (!media.date_taken) return earliest
            const mediaDate = new Date(media.date_taken)
            return !earliest || mediaDate < earliest ? mediaDate : earliest
          }, null as Date | null) || new Date(b.created_at)
          break
        default:
          aValue = a.created_at
          bValue = b.created_at
      }

      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [memoryGroups, filters, sortOptions])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getTotalCounts = () => {
    const totalMedia = memoryGroups.reduce((sum, group) => sum + (group.media_count || 0), 0)
    const totalImages = memoryGroups.reduce((sum, group) => 
      sum + (group.media_items?.filter(m => m.file_type && m.file_type.startsWith('image/')).length || 0), 0
    )
    const totalVideos = memoryGroups.reduce((sum, group) => 
      sum + (group.media_items?.filter(m => m.file_type && m.file_type.startsWith('video/')).length || 0), 0
    )
    
    return { totalMedia, totalImages, totalVideos, totalGroups: memoryGroups.length }
  }

  const counts = getTotalCounts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-accent/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary animate-heart-beat" />
              <div>
                <h1 className="text-2xl font-romantic text-primary">Our Little Corner</h1>
                <p className="text-sm text-muted-foreground font-body">
                  {counts.totalGroups} memories • {counts.totalMedia} items 💕
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

          {/* Controls */}
          <div className="space-y-4">
            {/* View Controls */}
            <ViewControls 
              currentView={viewMode} 
              onViewChange={setViewMode}
            />

            {/* Filter and Sort Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <FilterControls 
                filters={filters}
                onFiltersChange={setFilters}
                totalCounts={counts}
              />
              <SortControls 
                sortOptions={sortOptions}
                onSortChange={setSortOptions}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {filteredAndSortedGroups.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-primary/40 mx-auto mb-4" />
            <h2 className="text-2xl font-romantic text-primary mb-2">
              {Object.keys(filters).some(key => filters[key as keyof MediaFilters]) 
                ? 'No memories found' 
                : 'No memories yet'}
            </h2>
            <p className="text-muted-foreground font-body mb-6">
              {Object.keys(filters).some(key => filters[key as keyof MediaFilters])
                ? 'Try adjusting your filters or search terms.'
                : 'Start creating beautiful memories together! 💖'
              }
            </p>
            {Object.keys(filters).some(key => filters[key as keyof MediaFilters]) && (
              <Button
                onClick={() => setFilters({})}
                variant="outline"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          // Memory Groups Grid
          <div className={`memory-groups-grid ${viewMode}`}>
            {filteredAndSortedGroups.map((group) => (
              <MemoryGroupCard
                key={group.id}
                memoryGroup={group}
                viewMode={viewMode}
                onClick={() => setSelectedGroup(group)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedGroup && (
        <MemoryGroupDetailModal
          memoryGroup={selectedGroup}
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Floating Admin Button */}
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