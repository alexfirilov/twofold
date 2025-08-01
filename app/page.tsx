import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getAllMemoryGroups } from '@/lib/db'
import EnhancedMediaGallery from './(gallery)/components/EnhancedMediaGallery'

export default async function HomePage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/login')
  }

  // Fetch memory groups for the gallery (exclude locked ones for main view)
  const memoryGroups = await getAllMemoryGroups(true, false)

  return <EnhancedMediaGallery memoryGroups={memoryGroups} />
}