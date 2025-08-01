"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemoryGroup } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  Home, 
  LogOut, 
  Settings, 
  BarChart3,
  Image as ImageIcon,
  Video,
  Heart,
  Calendar,
  HardDrive,
  Users,
  Lock,
  Unlock,
  Clock,
  FolderPlus
} from 'lucide-react'
import EnhancedUploadForm from './EnhancedUploadForm'
import MemoryGroupManagement from './MemoryGroupManagement'
import LockingControls from './LockingControls'

interface EnhancedAdminDashboardProps {
  memoryGroups: MemoryGroup[]
}

type ActiveTab = 'upload' | 'manage' | 'locking' | 'analytics'

export default function EnhancedAdminDashboard({ memoryGroups }: EnhancedAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload')
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Calculate comprehensive statistics
  const stats = {
    totalGroups: memoryGroups.length,
    totalMedia: memoryGroups.reduce((sum, group) => sum + (group.media_count || 0), 0),
    totalImages: memoryGroups.reduce((sum, group) => 
      sum + (group.media_items?.filter(m => m.file_type && m.file_type.startsWith('image/')).length || 0), 0
    ),
    totalVideos: memoryGroups.reduce((sum, group) => 
      sum + (group.media_items?.filter(m => m.file_type && m.file_type.startsWith('video/')).length || 0), 0
    ),
    totalSize: memoryGroups.reduce((sum, group) => 
      sum + (group.media_items?.reduce((mediaSum, m) => mediaSum + m.file_size, 0) || 0), 0
    ),
    lockedGroups: memoryGroups.filter(g => g.is_locked).length,
    scheduledUnlocks: memoryGroups.filter(g => g.unlock_date && g.unlock_date > new Date()).length,
    groupsWithNotes: memoryGroups.filter(g => 
      g.description || g.media_items?.some(m => m.note && m.note.trim().length > 0)
    ).length,
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const tabs = [
    {
      id: 'upload' as ActiveTab,
      label: 'Upload Memory',
      icon: Upload,
      description: 'Create new memories'
    },
    {
      id: 'manage' as ActiveTab,
      label: 'Manage',
      icon: Settings,
      description: 'Edit existing memories'
    },
    {
      id: 'locking' as ActiveTab,
      label: 'Lock Control',
      icon: Lock,
      description: 'Manage visibility & scheduling'
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'View statistics'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-accent/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary animate-heart-beat" />
              <div>
                <h1 className="text-2xl font-romantic text-primary">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground font-body">
                  {stats.totalGroups} memories • {stats.totalMedia} items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4 mr-2" />
                Gallery
              </Button>
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

          {/* Tab Navigation */}
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="font-body"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <FolderPlus className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.totalGroups}</div>
              <div className="text-xs text-muted-foreground">Memories</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.totalMedia}</div>
              <div className="text-xs text-muted-foreground">Items</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <ImageIcon className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.totalImages}</div>
              <div className="text-xs text-muted-foreground">Photos</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Video className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.totalVideos}</div>
              <div className="text-xs text-muted-foreground">Videos</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <HardDrive className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold text-primary">{formatFileSize(stats.totalSize)}</div>
              <div className="text-xs text-muted-foreground">Storage</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.lockedGroups}</div>
              <div className="text-xs text-muted-foreground">Locked</div>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{stats.scheduledUnlocks}</div>
              <div className="text-xs text-muted-foreground">Scheduled</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'upload' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-romantic text-primary mb-2">Create New Memory</h2>
                <p className="text-muted-foreground">
                  Upload photos and videos to create a beautiful memory. You can add multiple files to the same memory.
                </p>
              </div>
              <EnhancedUploadForm />
            </div>
          )}

          {activeTab === 'manage' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-romantic text-primary mb-2">Manage Memories</h2>
                <p className="text-muted-foreground">
                  Edit existing memories, update titles and descriptions, manage individual media items.
                </p>
              </div>
              <MemoryGroupManagement memoryGroups={memoryGroups} />
            </div>
          )}

          {activeTab === 'locking' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-romantic text-primary mb-2">Lock & Schedule Control</h2>
                <p className="text-muted-foreground">
                  Control visibility of memories. Lock them now and schedule automatic unlocking for special dates.
                </p>
              </div>
              <LockingControls memoryGroups={memoryGroups} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-romantic text-primary mb-2">Analytics & Statistics</h2>
                <p className="text-muted-foreground">
                  Overview of your memories collection and detailed statistics.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Memory Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Memories:</span>
                      <Badge variant="secondary">{stats.totalGroups}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">With Descriptions:</span>
                      <Badge variant="secondary">{stats.groupsWithNotes}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currently Locked:</span>
                      <Badge variant={stats.lockedGroups > 0 ? "default" : "secondary"}>
                        {stats.lockedGroups}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled Unlocks:</span>
                      <Badge variant={stats.scheduledUnlocks > 0 ? "default" : "secondary"}>
                        {stats.scheduledUnlocks}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Media Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Items:</span>
                      <Badge variant="secondary">{stats.totalMedia}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Photos:</span>
                      <Badge variant="secondary">{stats.totalImages}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Videos:</span>
                      <Badge variant="secondary">{stats.totalVideos}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg per Memory:</span>
                      <Badge variant="secondary">
                        {stats.totalGroups > 0 ? Math.round(stats.totalMedia / stats.totalGroups) : 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-primary" />
                      Storage Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Size:</span>
                      <Badge variant="secondary">{formatFileSize(stats.totalSize)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Memory Size:</span>
                      <Badge variant="secondary">
                        {formatFileSize(stats.totalGroups > 0 ? stats.totalSize / stats.totalGroups : 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Item Size:</span>
                      <Badge variant="secondary">
                        {formatFileSize(stats.totalMedia > 0 ? stats.totalSize / stats.totalMedia : 0)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}