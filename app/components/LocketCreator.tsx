'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocket } from '../contexts/LocketContext'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function LocketCreator() {
  const { user, updateProfile } = useAuth()
  const { createLocket, inviteUser } = useLocket()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [nickname, setNickname] = useState(user?.displayName || '')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return user?.photoURL || null

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: avatarFile.name,
          fileType: avatarFile.type,
          fileSize: avatarFile.size
        })
      })

      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await res.json()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': avatarFile.type },
        body: avatarFile
      })

      if (!uploadRes.ok) throw new Error('Failed to upload image')

      return publicUrl
    } catch (error) {
      console.error('Avatar upload failed:', error)
      return null
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCloseModal = () => {
    setShowInviteModal(false)
    router.push('/')
  }

  const handleSetup = async (action: 'create' | 'skip' | 'link') => {
    setIsLoading(true)
    setError(null)

    try {
      const photoURL = await uploadAvatar()
      if (nickname !== user?.displayName || photoURL !== user?.photoURL) {
        await updateProfile({
          displayName: nickname || user?.displayName || 'User',
          photoURL: photoURL || undefined
        })
      }

      const newLocket = await createLocket({
        name: "Our Locket",
        admin_firebase_uid: user!.uid,
      })

      if (action === 'create' && partnerEmail) {
        await inviteUser({
          locket_id: newLocket.id,
          email: partnerEmail,
          invited_by_firebase_uid: user!.uid,
          role: 'admin'
        })
        router.push('/')

      } else if (action === 'link') {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const inviteUrl = `${origin}/invite/${newLocket.invite_code}`
        setInviteLink(inviteUrl)
        setShowInviteModal(true)

      } else {
        router.push('/')
      }

    } catch (err) {
      console.error('Setup failed details:', err)
      const message = err instanceof Error ? err.message : 'Failed to create your locket. Please try again.';
      setError(`${message} (Please check console for details)`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Custom styles for glassmorphism */}
      <style jsx global>{`
        .glass-card {
          background: rgba(42, 22, 30, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .input-gradient-focus:focus-within {
          border-color: #C8A659 !important;
          box-shadow: 0 0 0 1px #C8A659, 0 0 15px rgba(200, 166, 89, 0.1);
        }

        .bg-romantic-overlay {
          background: linear-gradient(to bottom, rgba(34, 16, 22, 0.7), rgba(34, 16, 22, 0.9));
        }
      `}</style>

      <div className="bg-[#221016] font-display text-white antialiased overflow-hidden h-screen w-full relative">
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 z-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9SOxeh7o9RmjZeAAN2jojATEE6Wp_0bKcBrSlpPb0jPzhuWEfzhCv1KZ7PpCTcLv6ebQTDOg-hX2ex6Uq0EAPyN8WNwz-7ZwSF6Hshab2zypHym4HRjmFhpOjb9sPDuly_swIFuTuBFlcHiSqyBNgTpvWMcbWPcgeTaDE89WWJ_mYvkYF8Hg5jsB1hQt_9hwIkPzKxoIpTQTVGqH_OR8-AWAKxpZY99aIg45xbUUGo0QGRXwyld3z9AxZ4TgX8x_mKlf3LHFK3ibl')",
            filter: 'blur(8px)'
          }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 z-0 bg-romantic-overlay" />

        {/* Main Layout Container */}
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8">

          {/* Glass Card */}
          <div className="glass-card w-full max-w-[480px] rounded-2xl p-8 md:p-10 flex flex-col items-center">

            {/* Icon Header */}
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-10">
              <h1 className="font-serif italic text-3xl md:text-4xl text-white mb-3 tracking-wide leading-tight">
                Every story needs a beginning
              </h1>
              <p className="text-white/60 text-sm font-medium tracking-wide uppercase">
                Let's set up your side of the locket
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="w-full mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 text-red-300">
                <span className="material-symbols-outlined text-xl flex-shrink-0">error</span>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Avatar Upload */}
            <div className="mb-10 relative group cursor-pointer">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="relative h-28 w-28 rounded-full border-2 border-dashed border-white/20 hover:border-[#C8A659]/50 transition-colors duration-300 flex items-center justify-center bg-[#331922] overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-white/20 text-4xl group-hover:text-white/40 transition-colors">add_a_photo</span>
                  )}
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    ref={fileInputRef}
                  />
                </div>
              </label>

              {/* Edit Pencil Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload photo"
                className="absolute bottom-0 right-0 translate-x-1 translate-y-1 h-9 w-9 rounded-full bg-[#C8A659] text-[#221016] flex items-center justify-center shadow-lg hover:bg-[#dabb70] transition-colors border-2 border-[#2a161e]"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>

            {/* Form Fields */}
            <form className="w-full space-y-5" onSubmit={(e) => e.preventDefault()}>

              {/* Nickname Input */}
              <div className="group input-gradient-focus relative rounded-lg bg-[#331922] border border-[#673244] transition-all duration-300">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#C8A659] transition-colors">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <input
                  type="text"
                  placeholder="Your Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-transparent py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-0 border-none font-medium text-[15px]"
                />
              </div>

              {/* Partner Email Input */}
              <div className="group input-gradient-focus relative rounded-lg bg-[#331922] border border-[#673244] transition-all duration-300">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">volunteer_activism</span>
                </div>
                <input
                  type="email"
                  placeholder="Partner's Email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  className="w-full bg-transparent py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-0 border-none font-medium text-[15px]"
                />
              </div>

              {/* Main Button */}
              <button
                type="button"
                onClick={() => handleSetup('create')}
                disabled={isLoading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-3.5 text-white shadow-lg transition-all duration-300 hover:bg-[#a03d58] hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="font-bold tracking-wide text-sm">Create Locket</span>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Secondary Links */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => handleSetup('link')}
                disabled={isLoading}
                className="text-sm font-medium text-[#C8A659] hover:text-[#dabb70] hover:underline decoration-[#C8A659]/40 underline-offset-4 transition-colors disabled:opacity-50"
              >
                Generate invite link instead
              </button>
              <button
                type="button"
                onClick={() => handleSetup('skip')}
                disabled={isLoading}
                className="text-xs text-white/40 hover:text-white/60 transition-colors font-medium disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>

          {/* Footer / Branding */}
          <div className="absolute bottom-6 text-white/10 text-xs font-medium tracking-widest uppercase pointer-events-none">
            Twofold © 2024
          </div>
        </div>

        {/* Invite Link Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="sm:max-w-md bg-[#2a161e] border-[#673244]">
            <DialogHeader>
              <DialogTitle className="font-display text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C8A659]">share</span>
                Share Your Locket
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Send this link to your partner so they can join your locket.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 mt-4">
              <div className="flex-1 bg-[#331922] border border-[#673244] rounded-lg px-4 py-3">
                <p className="text-sm text-white truncate font-mono">
                  {inviteLink}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 bg-[#331922] border-[#673244] hover:bg-[#4a2431] text-white"
                variant="outline"
              >
                {copied ? (
                  <span className="material-symbols-outlined text-green-400">check</span>
                ) : (
                  <span className="material-symbols-outlined">content_copy</span>
                )}
              </Button>
            </div>
            <DialogFooter className="mt-6">
              <Button onClick={handleCloseModal} className="w-full sm:w-auto bg-primary hover:bg-[#a03d58]">
                Continue to Locket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
