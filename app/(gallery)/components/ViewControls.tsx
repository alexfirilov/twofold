"use client"

import { ViewMode } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { 
  Grid, 
  List, 
  Columns, 
  Clock,
  LayoutGrid
} from 'lucide-react'

interface ViewControlsProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

const viewOptions = [
  {
    value: 'gallery' as ViewMode,
    label: 'Gallery',
    icon: Grid,
    description: 'Masonry grid layout'
  },
  {
    value: 'icons' as ViewMode,
    label: 'Icons',
    icon: LayoutGrid,
    description: 'Large icon grid'
  },
  {
    value: 'list' as ViewMode,
    label: 'List',
    icon: List,
    description: 'Detailed list view'
  },
  {
    value: 'columns' as ViewMode,
    label: 'Columns',
    icon: Columns,
    description: 'Column layout'
  },
  {
    value: 'timeline' as ViewMode,
    label: 'Timeline',
    icon: Clock,
    description: 'Chronological timeline'
  }
]

export default function ViewControls({ currentView, onViewChange }: ViewControlsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-white/50 rounded-lg border border-accent/20">
      <span className="text-sm font-medium text-muted-foreground px-2">View:</span>
      {viewOptions.map((option) => {
        const Icon = option.icon
        return (
          <Button
            key={option.value}
            variant={currentView === option.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(option.value)}
            className="flex items-center gap-2 font-body"
            title={option.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}