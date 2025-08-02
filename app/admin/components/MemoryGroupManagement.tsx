"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation' 
import { MemoryGroup, UpdateMemoryGroup } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Calendar,
  Users,
  Lock,
  Unlock,
  Eye,
  Settings,
  FolderOpen,
  MoreVertical
} from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import { format } from 'date-fns'

interface MemoryGroupManagementProps {
  memoryGroups: MemoryGroup[]
}

export default function MemoryGroupManagement({ memoryGroups }: MemoryGroupManagementProps) {
  const [editingGroup, setEditingGroup] = useState<MemoryGroup | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocked, setFilterLocked] = useState<'all' | 'locked' | 'unlocked'>('all')
  
  const router = useRouter()

  // Filter memory groups
  const filteredGroups = memoryGroups.filter(group => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())

    // Lock filter
    const matchesLockFilter = filterLocked === 'all' ||
      (filterLocked === 'locked' && group.is_locked) ||
      (filterLocked === 'unlocked' && !group.is_locked)

    return matchesSearch && matchesLockFilter
  })

  const handleEdit = (group: MemoryGroup) => {
    setEditingGroup(group)
    setEditTitle(group.title || '')
    setEditDescription(group.description || '')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editingGroup) return

    try {
      const updates: UpdateMemoryGroup = {
        title: editTitle || undefined,
        description: editDescription || undefined
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGroup.id, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to update memory group')
      }

      // Reset state
      setIsEditing(false)
      setEditingGroup(null)
      setEditTitle('')
      setEditDescription('')
      
      // Refresh the page
      router.refresh()
      
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update memory. Please try again.')
    }
  }

  const handleDelete = async (group: MemoryGroup) => {
    if (!confirm(`Are you sure you want to delete "${group.title || 'Untitled Memory'}"? This will permanently delete the memory and all its media files.`)) {
      return
    }

    try {
      const response = await fetch(`/api/memory-groups?id=${group.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete memory group')
      }

      // Refresh the page
      router.refresh()
      
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete memory. Please try again.')
    }
  }

  const toggleLock = async (group: MemoryGroup) => {
    try {
      const updates: UpdateMemoryGroup = {
        is_locked: !group.is_locked
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.id, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to update memory group')
      }

      // Refresh the page
      router.refresh()
      
    } catch (error) {
      console.error('Toggle lock error:', error)
      alert('Failed to update memory. Please try again.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search memories by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="romantic-input"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterLocked === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLocked('all')}
              >
                All ({memoryGroups.length})
              </Button>
              <Button
                variant={filterLocked === 'unlocked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLocked('unlocked')}
              >
                <Unlock className="h-4 w-4 mr-1" />
                Visible ({memoryGroups.filter(g => !g.is_locked).length})
              </Button>
              <Button
                variant={filterLocked === 'locked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLocked('locked')}
              >
                <Lock className="h-4 w-4 mr-1" />
                Locked ({memoryGroups.filter(g => g.is_locked).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Groups List */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterLocked !== 'all' 
                ? 'No memories match your filters' 
                : 'No memories created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const totalSize = group.media_items?.reduce((sum, media) => sum + media.file_size, 0) || 0
            const imageCount = group.media_items?.filter(m => m.file_type && m.file_type.startsWith('image/')).length || 0
            const videoCount = group.media_items?.filter(m => m.file_type && m.file_type.startsWith('video/')).length || 0
            
            return (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left side - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-romantic text-lg text-primary truncate">
                          {group.title || 'Untitled Memory'}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          {group.is_locked ? (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Visible
                            </Badge>
                          )}
                          
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {group.media_count || 0}
                          </Badge>
                        </div>
                      </div>

                      {group.description && (
                        <div 
                          className="text-sm text-muted-foreground mb-3 line-clamp-2 prose prose-sm"
                          dangerouslySetInnerHTML={{ __html: group.description }}
                        />
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(group.created_at), 'MMM d, yyyy')}
                        </span>
                        
                        {imageCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            {imageCount}
                          </span>
                        )}
                        
                        {videoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Video className="h-4 w-4" />
                            {videoCount}
                          </span>
                        )}
                        
                        <span>{formatFileSize(totalSize)}</span>
                        
                        {group.unlock_date && group.unlock_date > new Date() && (
                          <Badge variant="outline" className="text-xs">
                            Unlocks {format(group.unlock_date, 'MMM d')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLock(group)}
                        title={group.is_locked ? 'Unlock memory' : 'Lock memory'}
                      >
                        {group.is_locked ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Media Preview */}
                  {group.media_items && group.media_items.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto">
                      {group.media_items.slice(0, 6).map((media) => (
                        <div key={media.id} className="relative w-12 h-12 rounded overflow-hidden bg-accent/20 flex-shrink-0">
                          {media.file_type && media.file_type.startsWith('image/') ? (
                            <img
                              src={media.s3_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {group.media_items.length > 6 && (
                        <div className="w-12 h-12 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            +{group.media_items.length - 6}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
            <DialogDescription>
              Update the title and description for this memory
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Memory title..."
                className="romantic-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <RichTextEditor
                value={editDescription}
                onChange={setEditDescription}
                placeholder="Memory description..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}