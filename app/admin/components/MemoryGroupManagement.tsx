"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation' 
import { MemoryGroup, UpdateMemoryGroup } from '@/lib/types'
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
import MediaEditor from './MediaEditor'
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
  
  // Extended editing states for full memory control
  const [editIsLocked, setEditIsLocked] = useState(false)
  const [editUnlockDate, setEditUnlockDate] = useState('')
  const [editUnlockTime, setEditUnlockTime] = useState('')
  const [editLockVisibility, setEditLockVisibility] = useState<'public' | 'private'>('private')
  const [editShowDateHint, setEditShowDateHint] = useState(false)
  const [editShowImagePreview, setEditShowImagePreview] = useState(false)
  const [editBlurPercentage, setEditBlurPercentage] = useState(95)
  const [editUnlockHint, setEditUnlockHint] = useState('')
  const [editShowTitle, setEditShowTitle] = useState(false)
  const [editShowDescription, setEditShowDescription] = useState(false)
  const [editShowMediaCount, setEditShowMediaCount] = useState(false)
  const [editShowCreationDate, setEditShowCreationDate] = useState(false)
  const [editUnlockType, setEditUnlockType] = useState<'scheduled' | 'task_based'>('scheduled')
  const [editUnlockTask, setEditUnlockTask] = useState('')
  const [mediaEditingGroup, setMediaEditingGroup] = useState<MemoryGroup | null>(null)
  
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
    
    // Set all extended options
    setEditIsLocked(group.is_locked || false)
    setEditUnlockDate(group.unlock_date ? new Date(group.unlock_date).toISOString().slice(0, 10) : '')
    setEditUnlockTime(group.unlock_date ? new Date(group.unlock_date).toISOString().slice(11, 16) : '')
    setEditLockVisibility(group.lock_visibility || 'private')
    setEditShowDateHint(group.show_date_hint || false)
    setEditShowImagePreview(group.show_image_preview || false)
    setEditBlurPercentage(group.blur_percentage || 95)
    setEditUnlockHint(group.unlock_hint || '')
    setEditShowTitle(group.show_title || false)
    setEditShowDescription(group.show_description || false)
    setEditShowMediaCount(group.show_media_count || false)
    setEditShowCreationDate(group.show_creation_date || false)
    setEditUnlockType(group.unlock_type || 'scheduled')
    setEditUnlockTask(group.unlock_task || '')
    
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editingGroup) return

    try {
      const updates: UpdateMemoryGroup = {
        title: editTitle || undefined,
        description: editDescription || undefined,
        is_locked: editIsLocked,
        unlock_date: (editUnlockDate && editUnlockTime) 
          ? new Date(`${editUnlockDate}T${editUnlockTime}`) 
          : null, // Explicitly set to null to clear the field
        lock_visibility: editLockVisibility,
        show_date_hint: editShowDateHint,
        show_image_preview: editShowImagePreview,
        blur_percentage: editBlurPercentage,
        unlock_hint: editUnlockHint || undefined,
        show_title: editShowTitle,
        show_description: editShowDescription,
        show_media_count: editShowMediaCount,
        show_creation_date: editShowCreationDate,
        unlock_type: editUnlockType,
        unlock_task: editUnlockTask || undefined
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        method: 'DELETE',
        credentials: 'include'
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
                        onClick={() => setMediaEditingGroup(group)}
                        title="Edit media"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>

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
                        title="Edit memory settings"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group)}
                        className="text-destructive hover:text-destructive"
                        title="Delete memory"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
            <DialogDescription>
              Update all aspects of this memory including content, privacy settings, and visibility options
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <RichTextEditor
                value={editTitle}
                onChange={setEditTitle}
                placeholder="Memory title..."
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

            {/* Privacy & Locking Settings */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Privacy & Locking Settings</h3>
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={editIsLocked ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditIsLocked(!editIsLocked)}
                  className="flex items-center gap-2"
                >
                  {editIsLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  {editIsLocked ? 'Locked' : 'Visible'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {editIsLocked ? 'Memory is hidden from gallery' : 'Memory is visible in gallery'}
                </span>
              </div>

              {editIsLocked && (
                <div className="space-y-4 p-4 bg-accent/10 rounded-lg">
                  <div className="space-y-2">
                    <Label>Visibility When Locked</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={editLockVisibility === 'private' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditLockVisibility('private')}
                      >
                        Private (Hidden)
                      </Button>
                      <Button
                        type="button"
                        variant={editLockVisibility === 'public' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditLockVisibility('public')}
                      >
                        Public (Visible but Locked)
                      </Button>
                    </div>
                  </div>

                  {/* Unlock Scheduling */}
                  <div className="space-y-2">
                    <Label>Schedule Unlock (Optional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="date"
                          value={editUnlockDate}
                          onChange={(e) => setEditUnlockDate(e.target.value)}
                          className="romantic-input"
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          value={editUnlockTime}
                          onChange={(e) => setEditUnlockTime(e.target.value)}
                          className="romantic-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Public Lock Options */}
                  {editLockVisibility === 'public' && (
                    <div className="space-y-4 border-t border-accent/20 pt-4">
                      <div className="text-sm font-medium">Public Lock Settings</div>
                      
                      {/* Visibility Controls */}
                      <div className="space-y-3 p-3 bg-accent/5 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Show to users when locked:</div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-show-title"
                            checked={editShowTitle}
                            onChange={(e) => setEditShowTitle(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="edit-show-title" className="text-sm">Title</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-show-description"
                            checked={editShowDescription}
                            onChange={(e) => setEditShowDescription(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="edit-show-description" className="text-sm">Description</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-show-media-count"
                            checked={editShowMediaCount}
                            onChange={(e) => setEditShowMediaCount(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="edit-show-media-count" className="text-sm">Media count</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-show-creation-date"
                            checked={editShowCreationDate}
                            onChange={(e) => setEditShowCreationDate(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="edit-show-creation-date" className="text-sm">Creation date</Label>
                        </div>
                      </div>
                      
                      {/* Date Hint */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-show-date-hint"
                          checked={editShowDateHint}
                          onChange={(e) => setEditShowDateHint(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="edit-show-date-hint" className="text-sm">Show date when memory was created</Label>
                      </div>

                      {/* Image Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-show-image-preview"
                            checked={editShowImagePreview}
                            onChange={(e) => setEditShowImagePreview(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="edit-show-image-preview" className="text-sm">Show blurred preview image</Label>
                        </div>
                        
                        {editShowImagePreview && (
                          <div className="ml-6 space-y-2">
                            <Label htmlFor="edit-blur-percentage" className="text-sm">Blur intensity: {editBlurPercentage}%</Label>
                            <input
                              type="range"
                              id="edit-blur-percentage"
                              min="50"
                              max="98"
                              value={editBlurPercentage}
                              onChange={(e) => setEditBlurPercentage(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>

                      {/* Unlock Hint */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-unlock-hint">Hint Text (Optional)</Label>
                        <Input
                          id="edit-unlock-hint"
                          placeholder="e.g., 'A special surprise awaits...'"
                          value={editUnlockHint}
                          onChange={(e) => setEditUnlockHint(e.target.value)}
                          className="romantic-input"
                        />
                      </div>

                      {/* Task Assignment - Only for public locked memories without schedule */}
                      {editLockVisibility === 'public' && !editUnlockDate && (
                        <div className="space-y-4 border-t border-accent/20 pt-4">
                          <div className="text-sm font-medium">Task-Based Unlocking</div>
                          
                          <div className="space-y-2">
                            <Label>Unlock Method</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={editUnlockType === 'scheduled' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditUnlockType('scheduled')}
                              >
                                Time-Based
                              </Button>
                              <Button
                                type="button"
                                variant={editUnlockType === 'task_based' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditUnlockType('task_based')}
                              >
                                Task-Based
                              </Button>
                            </div>
                          </div>

                          {editUnlockType === 'task_based' && (
                            <div className="space-y-2">
                              <Label htmlFor="edit-unlock-task">Task Assignment</Label>
                              <Input
                                id="edit-unlock-task"
                                placeholder="e.g., 'Complete your first week of exercise' or 'Send me a photo of your smile'"
                                value={editUnlockTask}
                                onChange={(e) => setEditUnlockTask(e.target.value)}
                                className="romantic-input"
                              />
                              <p className="text-xs text-muted-foreground">
                                Describe the task that needs to be completed to unlock this memory
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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

      {/* Media Editor */}
      {mediaEditingGroup && (
        <MediaEditor
          memoryGroup={mediaEditingGroup}
          isOpen={!!mediaEditingGroup}
          onClose={() => setMediaEditingGroup(null)}
          onUpdate={() => {
            setMediaEditingGroup(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}