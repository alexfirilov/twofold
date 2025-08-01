import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getAllMemoryGroups } from '@/lib/db'
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard'

export default async function AdminPage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/login')
  }

  // Fetch memory groups for the admin view (include locked ones)
  const memoryGroups = await getAllMemoryGroups(true, true)

  return <EnhancedAdminDashboard memoryGroups={memoryGroups} />
}