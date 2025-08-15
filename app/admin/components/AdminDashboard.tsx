"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MediaItem } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  HardDrive
} from 'lucide-react'
import UploadForm from './UploadForm'
import MediaManagement from './MediaManagement'

interface AdminDashboardProps {
  mediaItems: MediaItem[]
}

type ActiveTab = 'upload' | 'manage' | 'analytics'

export default function AdminDashboard({ mediaItems }: AdminDashboardProps) {
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

  // Calculate statistics
  const stats = {
    total: mediaItems.length,
    images: mediaItems.filter(m => m.file_type.startsWith('image/')).length,
    videos: mediaItems.filter(m => m.file_type.startsWith('video/')).length,
    totalSize: mediaItems.reduce((sum, m) => sum + m.file_size, 0),
    withNotes: mediaItems.filter(m => m.note && m.note.trim().length > 0).length,
  }

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-romantic text-primary">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground font-body">
                  Manage your memories and content
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
                className="font-body"
              >
                <Home className="h-4 w-4 mr-2" />
                View Gallery
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

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={activeTab === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('upload')}
              className="font-body"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
            <Button
              variant={activeTab === 'manage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('manage')}
              className="font-body"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Content
            </Button>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analytics')}
              className="font-body"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-romantic text-primary mb-2">Upload New Memory</h2>
              <p className="text-muted-foreground font-body">
                Add photos and videos with beautiful notes to your romantic gallery.
              </p>
            </div>
            <UploadForm />
          </div>
        )}

        {activeTab === 'manage' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-romantic text-primary mb-2">Manage Your Memories</h2>
              <p className="text-muted-foreground font-body">
                Edit, organize, and delete your existing memories.
              </p>
            </div>
            <MediaManagement mediaItems={mediaItems} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-romantic text-primary mb-2">Gallery Analytics</h2>
              <p className="text-muted-foreground font-body">
                Overview of your romantic collection and storage usage.
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-body font-medium">Total Memories</CardTitle>
                  <Heart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground font-body">
                    {stats.withNotes} with notes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-body font-medium">Photos</CardTitle>
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.images}</div>
                  <p className="text-xs text-muted-foreground font-body">
                    {stats.total > 0 ? Math.round((stats.images / stats.total) * 100) : 0}% of collection
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-body font-medium">Videos</CardTitle>
                  <Video className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.videos}</div>
                  <p className="text-xs text-muted-foreground font-body">
                    {stats.total > 0 ? Math.round((stats.videos / stats.total) * 100) : 0}% of collection
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-body font-medium">Storage Used</CardTitle>
                  <HardDrive className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                  <p className="text-xs text-muted-foreground font-body">
                    Across {stats.total} files
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="font-romantic text-primary">Recent Uploads</CardTitle>
                <CardDescription className="font-body">
                  Your latest memories added to the gallery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mediaItems.slice(0, 5).map((media) => (
                    <div key={media.id} className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        {media.file_type.startsWith('video/') ? (
                          <Video className="h-6 w-6 text-primary" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium truncate">
                          {media.title || media.original_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(media.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{formatFileSize(media.file_size)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {mediaItems.length === 0 && (
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                      <p className="text-muted-foreground font-body">No memories uploaded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}