'use client'

import { Navigation } from '@/components/Navigation'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#221016] text-white flex flex-col md:flex-row">
      <Navigation />

      <main className="flex-1 pb-20 md:pb-0 md:pl-64 min-h-screen relative">
        {children}
      </main>
    </div>
  )
}
