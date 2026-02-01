'use client'

import { useAuth } from '../contexts/AuthContext'
import { useLocket } from '../contexts/LocketContext'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import LocketCreator from '../components/LocketCreator'

export default function LocketCreatePage() {
  const { user, loading: authLoading } = useAuth()
  const { currentLocket, userLockets, loading: locketLoading } = useLocket()
  const router = useRouter()

  // Track if we've started the creation process - once started, don't redirect
  const hasStartedCreation = useRef(false)
  // Track initial locket count to detect if user already had a locket on page load
  const initialLocketCount = useRef<number | null>(null)

  useEffect(() => {
    // Wait for both auth and locket context to load
    if (authLoading || locketLoading) return

    // Not authenticated - redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Store initial locket count on first load
    if (initialLocketCount.current === null) {
      initialLocketCount.current = userLockets.length
    }

    // Only redirect if user ALREADY had a locket when they arrived at this page
    // Don't redirect if they just created one (that's handled by LocketCreator)
    if (initialLocketCount.current > 0) {
      router.replace('/')
      return
    }
  }, [user, authLoading, userLockets, locketLoading, router])

  // Show loading while auth/locket state is being determined
  if (authLoading || locketLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#221016]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  // User already had a locket when they arrived - show loading while redirect happens
  if (initialLocketCount.current !== null && initialLocketCount.current > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#221016]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return <LocketCreator />
}
