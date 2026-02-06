'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLocket } from '@/contexts/LocketContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Dashboard from '@/(main)/components/Dashboard'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const { currentLocket, userLockets, loading: locketLoading } = useLocket()
  const router = useRouter()

  useEffect(() => {
    // Wait for both auth and locket context to finish loading
    if (authLoading || locketLoading) return

    // Not authenticated - redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Authenticated but no locket - redirect to locket creation
    if (!currentLocket && userLockets.length === 0) {
      router.push('/locket-create')
      return
    }
  }, [user, authLoading, currentLocket, userLockets, locketLoading, router])

  // Show loading while auth or locket context is loading
  if (authLoading || locketLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#221016]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  // Not authenticated - will redirect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#221016]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  // No locket - will redirect to locket creation
  if (!currentLocket && userLockets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#221016]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  // User has a locket - show dashboard
  return <Dashboard />
}
