'use client'

import { useAuth } from './contexts/AuthContext'
import { useCorner } from './contexts/CornerContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import EnhancedMediaGallery from './(gallery)/components/EnhancedMediaGallery'
import CornerSelector from './components/CornerSelector'
import type { MemoryGroup } from './lib/types'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { currentCorner, userCorners, loading: cornerLoading, error: cornerError } = useCorner()
  const router = useRouter()
  const [memoryGroups, setMemoryGroups] = useState<MemoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || cornerLoading) return // Wait for auth and corner to load

    if (!user) {
      router.push('/login')
      return
    }

    // If user has no corners, show corner selector
    if (userCorners.length === 0) {
      setIsLoading(false)
      return
    }

    // If no current corner selected but user has corners, this will be handled by CornerContext
    if (!currentCorner) {
      setIsLoading(false)
      return
    }

    // Fetch memory groups for the current corner
    const fetchMemoryGroups = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/memory-groups?cornerId=${currentCorner.id}&includeMedia=true&includeLocked=false`, {
          credentials: 'include',
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to load memories (${response.status})`)
        }
        
        const data = await response.json()
        setMemoryGroups(data.memoryGroups || [])
      } catch (error) {
        console.error('Error fetching memory groups:', error)
        setError(error instanceof Error ? error.message : 'Failed to load memories')
        setMemoryGroups([]) // Clear existing data on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchMemoryGroups()
  }, [user, currentCorner, userCorners, authLoading, cornerLoading, router])

  // Show loading while auth state is being determined
  if (authLoading || cornerLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your memories...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  // Show corner selector if user has no corners or no current corner selected
  if (userCorners.length === 0 || !currentCorner) {
    return <CornerSelector />
  }

  // Show error state if there's a corner error
  if (cornerError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Corner Access Error</h2>
          <p className="text-gray-600 mb-4">{cornerError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show error state if there's a memory loading error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Memories</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              // Re-trigger the effect to fetch data again
              if (currentCorner) {
                const fetchMemoryGroups = async () => {
                  setIsLoading(true)
                  setError(null)
                  try {
                    const response = await fetch(`/api/memory-groups?cornerId=${currentCorner.id}&includeMedia=true&includeLocked=false`, {
                      credentials: 'include',
                    })
                    
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}))
                      throw new Error(errorData.error || `Failed to load memories (${response.status})`)
                    }
                    
                    const data = await response.json()
                    setMemoryGroups(data.memoryGroups || [])
                  } catch (error) {
                    console.error('Error fetching memory groups:', error)
                    setError(error instanceof Error ? error.message : 'Failed to load memories')
                    setMemoryGroups([])
                  } finally {
                    setIsLoading(false)
                  }
                }
                fetchMemoryGroups()
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return <EnhancedMediaGallery memoryGroups={memoryGroups} />
}