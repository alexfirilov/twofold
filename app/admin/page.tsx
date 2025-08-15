'use client'

import { useAuth } from '../contexts/AuthContext'
import { useCorner } from '../contexts/CornerContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MemoryGroup } from '../lib/types'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentCorner, userRole, loading: cornerLoading } = useCorner()
  const router = useRouter()
  const [memoryGroups, setMemoryGroups] = useState<MemoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading || cornerLoading) return // Wait for auth and corner to load

    if (!user) {
      router.push('/login?from=/admin')
      return
    }

    if (!currentCorner) {
      router.push('/') // Redirect to corner selector
      return
    }

    if (userRole !== 'admin') {
      setIsLoading(false)
      return // Show unauthorized message
    }

    // Fetch memory groups for admin when user has admin access
    const fetchMemoryGroups = async () => {
      try {
        const response = await fetch(`/api/memory-groups?cornerId=${currentCorner.id}&includeLocked=true`, {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          setMemoryGroups(data.memoryGroups || [])
        }
      } catch (error) {
        console.error('Error fetching memory groups:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMemoryGroups()
  }, [user, currentCorner, userRole, authLoading, cornerLoading, router])

  // Show loading while auth state is being determined
  if (authLoading || cornerLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user || !currentCorner) {
    return null
  }

  // Show unauthorized message if user is not admin
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md romantic-card border-accent/30 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-romantic text-primary">Access Denied</CardTitle>
            <CardDescription className="font-body">
              You need admin privileges to access this area of <strong>{currentCorner.name}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground font-body mb-6">
              Current role: <span className="capitalize font-medium">{userRole}</span>
            </p>
            
            <Button
              onClick={() => router.push('/')}
              variant="romantic"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gallery
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <EnhancedAdminDashboard memoryGroups={memoryGroups} />
}