"use client"

import { SortOptions } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  Clock,
  Type
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SortControlsProps {
  sortOptions: SortOptions
  onSortChange: (options: SortOptions) => void
}

const sortFields = [
  {
    value: 'created_at' as const,
    label: 'Date Created',
    icon: Calendar
  },
  {
    value: 'date_taken' as const,
    label: 'Date Taken',
    icon: Clock
  },
  {
    value: 'title' as const,
    label: 'Title',
    icon: Type
  }
]

export default function SortControls({ sortOptions, onSortChange }: SortControlsProps) {
  const currentField = sortFields.find(field => field.value === sortOptions.field)
  const CurrentIcon = currentField?.icon || Calendar

  const toggleDirection = () => {
    onSortChange({
      ...sortOptions,
      direction: sortOptions.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const changeField = (field: SortOptions['field']) => {
    onSortChange({
      ...sortOptions,
      field
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Sort:</span>
      
      {/* Sort Field Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-body">
            <CurrentIcon className="h-4 w-4 mr-2" />
            {currentField?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border shadow-lg">
          {sortFields.map((field) => {
            const Icon = field.icon
            return (
              <DropdownMenuItem
                key={field.value}
                onClick={() => changeField(field.value)}
                className={sortOptions.field === field.value ? 'bg-accent' : ''}
              >
                <Icon className="h-4 w-4 mr-2" />
                {field.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Direction */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        className="font-body"
        title={`Sort ${sortOptions.direction === 'asc' ? 'ascending' : 'descending'}`}
      >
        {sortOptions.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}