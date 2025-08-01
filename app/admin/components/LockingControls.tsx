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
} from '@/components/ui/dialog'
import { 
  Lock, 
  Unlock, 
  Clock, 
  Calendar,
  Eye,
  EyeOff,
  Timer,
  Settings,
  Heart,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { format, isAfter, isBefore } from 'date-fns'

interface LockingControlsProps {
  memoryGroups: MemoryGroup[]
}

export default function LockingControls({ memoryGroups }: LockingControlsProps) {
  const [schedulingGroup, setSchedulingGroup] = useState<MemoryGroup | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [bulkAction, setBulkAction] = useState<'lock' | 'unlock' | null>(null)
  
  const router = useRouter()

  // Categorize groups
  const lockedGroups = memoryGroups.filter(g => g.is_locked)
  const unlockedGroups = memoryGroups.filter(g => !g.is_locked)
  const scheduledGroups = memoryGroups.filter(g => g.unlock_date && g.unlock_date > new Date())
  const pastScheduledGroups = memoryGroups.filter(g => g.unlock_date && g.unlock_date <= new Date())

  const toggleLock = async (group: MemoryGroup) => {
    try {
      const updates: UpdateMemoryGroup = {
        is_locked: !group.is_locked,
        unlock_date: !group.is_locked ? undefined : group.unlock_date // Clear unlock date when unlocking
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.id, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to update memory group')
      }

      router.refresh()
      
    } catch (error) {
      console.error('Toggle lock error:', error)
      alert('Failed to update memory. Please try again.')
    }
  }

  const handleSchedule = (group: MemoryGroup) => {
    setSchedulingGroup(group)
    setScheduleDate(group.unlock_date ? format(group.unlock_date, 'yyyy-MM-dd') : '')
    setScheduleTime(group.unlock_date ? format(group.unlock_date, 'HH:mm') : '')
    setIsScheduling(true)
  }

  const saveSchedule = async () => {
    if (!schedulingGroup) return

    try {
      const unlockDate = (scheduleDate && scheduleTime) 
        ? new Date(`${scheduleDate}T${scheduleTime}`) 
        : undefined

      const updates: UpdateMemoryGroup = {
        is_locked: true, // Always lock when scheduling
        unlock_date: unlockDate
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedulingGroup.id, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to schedule memory')
      }

      setIsScheduling(false)
      setSchedulingGroup(null)
      setScheduleDate('')
      setScheduleTime('')
      router.refresh()
      
    } catch (error) {
      console.error('Schedule error:', error)
      alert('Failed to schedule memory. Please try again.')
    }
  }

  const clearSchedule = async (group: MemoryGroup) => {
    try {
      const updates: UpdateMemoryGroup = {
        unlock_date: undefined
      }

      const response = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.id, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to clear schedule')
      }

      router.refresh()
      
    } catch (error) {
      console.error('Clear schedule error:', error)
      alert('Failed to clear schedule. Please try again.')
    }
  }

  const handleBulkAction = async (action: 'lock' | 'unlock') => {
    const groupsToUpdate = action === 'lock' ? unlockedGroups : lockedGroups
    
    if (groupsToUpdate.length === 0) return
    
    if (!confirm(`Are you sure you want to ${action} ${groupsToUpdate.length} memories?`)) {
      return
    }

    try {
      setBulkAction(action)
      
      const promises = groupsToUpdate.map(group => 
        fetch('/api/memory-groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: group.id, 
            is_locked: action === 'lock',
            unlock_date: action === 'unlock' ? undefined : group.unlock_date
          })
        })
      )

      await Promise.all(promises)
      router.refresh()
      
    } catch (error) {
      console.error('Bulk action error:', error)
      alert(`Failed to ${action} memories. Please try again.`)
    } finally {
      setBulkAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Eye className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{unlockedGroups.length}</div>
            <div className="text-xs text-muted-foreground">Visible</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Lock className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{lockedGroups.length}</div>
            <div className="text-xs text-muted-foreground">Locked</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{scheduledGroups.length}</div>
            <div className="text-xs text-muted-foreground">Scheduled</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">{pastScheduledGroups.length}</div>
            <div className="text-xs text-muted-foreground">Auto-unlocked</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Bulk Actions
          </CardTitle>
          <CardDescription>
            Quickly lock or unlock multiple memories at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => handleBulkAction('lock')}
              disabled={unlockedGroups.length === 0 || bulkAction !== null}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Lock All Visible ({unlockedGroups.length})
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleBulkAction('unlock')}
              disabled={lockedGroups.length === 0 || bulkAction !== null}
              className="flex items-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Unlock All Locked ({lockedGroups.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Unlocks */}
      {scheduledGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Scheduled Unlocks
            </CardTitle>
            <CardDescription>
              Memories that will automatically unlock on specific dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                  <div className="flex-1">
                    <h4 className="font-medium">{group.title || 'Untitled Memory'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Unlocks on {format(group.unlock_date!, 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSchedule(group)}
                    >
                      <Timer className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearSchedule(group)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Memories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            All Memories
          </CardTitle>
          <CardDescription>
            Manage lock status and scheduling for individual memories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memoryGroups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{group.title || 'Untitled Memory'}</h4>
                    
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
                    
                    {group.unlock_date && group.unlock_date > new Date() && (
                      <Badge variant="default" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(group.unlock_date, 'MMM d')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{group.media_count || 0} items</span>
                    <span>{format(new Date(group.created_at), 'MMM d, yyyy')}</span>
                    
                    {group.unlock_date && group.unlock_date <= new Date() && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Auto-unlocked
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSchedule(group)}
                    title="Schedule unlock"
                  >
                    <Timer className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock(group)}
                    title={group.is_locked ? 'Unlock now' : 'Lock now'}
                  >
                    {group.is_locked ? (
                      <Unlock className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Unlock</DialogTitle>
            <DialogDescription>
              Set when "{schedulingGroup?.title || 'this memory'}" should automatically unlock
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="romantic-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="romantic-input"
                />
              </div>
            </div>
            
            {scheduleDate && scheduleTime && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  This memory will unlock on {format(new Date(`${scheduleDate}T${scheduleTime}`), 'EEEE, MMM d, yyyy • h:mm a')}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsScheduling(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveSchedule}
              disabled={!scheduleDate || !scheduleTime}
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule Unlock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}