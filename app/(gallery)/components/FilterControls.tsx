"use client"

import { MediaFilters } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Calendar, 
  Image as ImageIcon, 
  Video, 
  X,
  Filter
} from 'lucide-react'
import { useState } from 'react'

interface FilterControlsProps {
  filters: MediaFilters
  onFiltersChange: (filters: MediaFilters) => void
  totalCounts: {
    totalGroups: number
    totalMedia: number
    totalImages: number
    totalVideos: number
  }
}

export default function FilterControls({ 
  filters, 
  onFiltersChange, 
  totalCounts 
}: FilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const updateFilter = (key: keyof MediaFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof MediaFilters] !== undefined
  )

  return (
    <div className="flex-1 space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search memories, notes, or filenames..."
          value={filters.search_term || ''}
          onChange={(e) => updateFilter('search_term', e.target.value)}
          className="pl-10 romantic-input"
        />
        {filters.search_term && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilter('search_term', '')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.file_type === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter('file_type', undefined)}
          className="font-body"
        >
          <Calendar className="h-4 w-4 mr-2" />
          All ({totalCounts.totalGroups})
        </Button>
        <Button
          variant={filters.file_type === 'image' ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter('file_type', filters.file_type === 'image' ? undefined : 'image')}
          className="font-body"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Photos ({totalCounts.totalImages})
        </Button>
        <Button
          variant={filters.file_type === 'video' ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter('file_type', filters.file_type === 'video' ? undefined : 'video')}
          className="font-body"
        >
          <Video className="h-4 w-4 mr-2" />
          Videos ({totalCounts.totalVideos})
        </Button>

        {/* Advanced Filters Toggle */}
        <Button
          variant={isExpanded ? "default" : "outline"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="font-body"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground font-body"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="p-4 bg-white/50 rounded-lg border border-accent/20 space-y-3">
          <h4 className="font-medium text-foreground">Advanced Filters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date From</label>
              <Input
                type="date"
                value={filters.date_from ? filters.date_from.toISOString().split('T')[0] : ''}
                onChange={(e) => updateFilter('date_from', e.target.value ? new Date(e.target.value) : undefined)}
                className="romantic-input"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date To</label>
              <Input
                type="date"
                value={filters.date_to ? filters.date_to.toISOString().split('T')[0] : ''}
                onChange={(e) => updateFilter('date_to', e.target.value ? new Date(e.target.value) : undefined)}
                className="romantic-input"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}