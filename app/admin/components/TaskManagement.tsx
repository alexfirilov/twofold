"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemoryGroup } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckSquare,
  Clock,
  Unlock,
  Calendar,
  Image as ImageIcon,
  Video,
  Users,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface TaskManagementProps {
  memoryGroups: MemoryGroup[]
}

export default function TaskManagement({ memoryGroups }: TaskManagementProps) {
  const [unlockingIds, setUnlockingIds] = useState<string[]>([])
  const router = useRouter()

  // Filter for task-based locked memories
  const taskBasedMemories = memoryGroups.filter(group => 
    group.is_locked && 
    group.unlock_type === 'task_based' && 
    group.unlock_task
  )

  const pendingTasks = taskBasedMemories.filter(group => !group.task_completed)
  const completedTasks = taskBasedMemories.filter(group => group.task_completed)

  const handleUnlockMemory = async (memoryId: string) => {
    if (unlockingIds.includes(memoryId)) return
    
    setUnlockingIds(prev => [...prev, memoryId])

    try {
      const response = await fetch(`/api/memory-groups/${memoryId}/unlock`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to unlock memory')
      }

      router.refresh()
    } catch (error) {
      console.error('Error unlocking memory:', error)
      alert('Failed to unlock memory. Please try again.')
    } finally {
      setUnlockingIds(prev => prev.filter(id => id !== memoryId))
    }
  }

  const renderMemoryCard = (group: MemoryGroup, isPending: boolean) => {
    const coverMedia = group.media_items?.[0]
    const mediaCount = group.media_count || 0
    const imageCount = group.media_items?.filter(m => m.file_type && m.file_type.startsWith('image/')).length || 0
    const videoCount = group.media_items?.filter(m => m.file_type && m.file_type.startsWith('video/')).length || 0

    return (
      <Card key={group.id} className={`${isPending ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-accent/20 flex-shrink-0">
              {coverMedia ? (
                coverMedia.file_type && coverMedia.file_type.startsWith('image/') ? (
                  <img
                    src={coverMedia.s3_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
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
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-romantic text-lg text-primary truncate">
                    {group.title || 'Untitled Memory'}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(group.created_at), 'MMM d, yyyy')}
                    
                    <Users className="h-3 w-3 ml-2" />
                    {mediaCount}
                    
                    {imageCount > 0 && (
                      <>
                        <ImageIcon className="h-3 w-3 ml-2" />
                        {imageCount}
                      </>
                    )}
                    
                    {videoCount > 0 && (
                      <>
                        <Video className="h-3 w-3 ml-1" />
                        {videoCount}
                      </>
                    )}
                  </div>

                  <div className="mt-2 p-3 bg-white/80 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Task:</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {group.unlock_task}
                    </p>
                  </div>

                  {group.lock_visibility === 'public' && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Visible to user
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {isPending && (
                  <Button
                    onClick={() => handleUnlockMemory(group.id)}
                    disabled={unlockingIds.includes(group.id)}
                    className="ml-4 flex items-center gap-2"
                  >
                    {unlockingIds.includes(group.id) ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        Mark Complete & Unlock
                      </>
                    )}
                  </Button>
                )}

                {!isPending && (
                  <Badge variant="secondary" className="ml-4">
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Tasks */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-romantic text-primary">
            Pending Tasks ({pendingTasks.length})
          </h3>
        </div>
        
        {pendingTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending tasks! All task-based memories are completed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map(group => renderMemoryCard(group, true))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-romantic text-primary">
              Completed Tasks ({completedTasks.length})
            </h3>
          </div>
          
          <div className="space-y-4">
            {completedTasks.map(group => renderMemoryCard(group, false))}
          </div>
        </div>
      )}

      {/* No Task-Based Memories */}
      {taskBasedMemories.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No task-based memories created yet.</p>
            <p className="text-sm text-muted-foreground">
              Create memories with task-based unlocking in the Upload section.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}