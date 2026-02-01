'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocket } from '../contexts/LocketContext'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, ArrowLeft, ArrowRight, Check, Move, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const TOTAL_STEPS = 4

interface PlaceSuggestion {
  placeId: string
  name: string
  description: string
  fullText: string
}

export default function LocketCreator() {
  const { user, updateProfile } = useAuth()
  const { createLocket, inviteUser } = useLocket()
  const router = useRouter()

  // Step state
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Profile
  const [nickname, setNickname] = useState(user?.displayName || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Locket Details
  const [locketName, setLocketName] = useState('Our Locket')
  const [anniversaryMonth, setAnniversaryMonth] = useState('')
  const [anniversaryYear, setAnniversaryYear] = useState('')
  const [anniversaryDay, setAnniversaryDay] = useState('')
  const [exactDayUnknown, setExactDayUnknown] = useState(false)
  const [locationOrigin, setLocationOrigin] = useState('')

  // Places autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Step 3: Cover Photo
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [coverPhotoPosition, setCoverPhotoPosition] = useState({ x: 50, y: 50 })
  const [coverPhotoZoom, setCoverPhotoZoom] = useState(100) // 100 = fit, higher = zoom in
  const [coverPhotoDimensions, setCoverPhotoDimensions] = useState<{ width: number; height: number; isPortrait: boolean } | null>(null)
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const coverPhotoInputRef = useRef<HTMLInputElement>(null)
  const coverContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 })

  // Step 4: Invite
  const [partnerEmail, setPartnerEmail] = useState('')

  // Global state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Step navigation
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  // Generate years for dropdown (100 years back)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  // Get days in selected month
  const getDaysInMonth = () => {
    if (!anniversaryMonth || !anniversaryYear) return 31
    return new Date(parseInt(anniversaryYear), parseInt(anniversaryMonth), 0).getDate()
  }

  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1)

  // Format anniversary date for API
  const getFormattedAnniversaryDate = () => {
    if (!anniversaryMonth || !anniversaryYear) return undefined
    const day = exactDayUnknown ? '01' : anniversaryDay.padStart(2, '0')
    return `${anniversaryYear}-${anniversaryMonth}-${day}`
  }

  // Places autocomplete
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth')
      const token = await getCurrentUserToken()

      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input })
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions?.length > 0)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Autocomplete error:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [])

  const handleLocationChange = (value: string) => {
    setLocationOrigin(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    const locationText = suggestion.description
      ? `${suggestion.name}, ${suggestion.description}`
      : suggestion.name
    setLocationOrigin(locationText)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cover photo drag handlers
  const handleCoverMouseDown = (e: React.MouseEvent) => {
    if (!coverPhotoPreview) return
    e.preventDefault()
    setIsDraggingCover(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: coverPhotoPosition.x,
      posY: coverPhotoPosition.y
    }
  }

  const handleCoverTouchStart = (e: React.TouchEvent) => {
    if (!coverPhotoPreview) return
    const touch = e.touches[0]
    setIsDraggingCover(true)
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: coverPhotoPosition.x,
      posY: coverPhotoPosition.y
    }
  }

  // Calculate pan bounds based on zoom level and image dimensions
  const getPanBounds = useCallback(() => {
    // Base panning for aspect ratio mismatch (portrait can pan vertically, landscape horizontally)
    // At 100% zoom: allow panning in the "overflow" direction based on aspect ratio
    // At higher zoom: allow more panning in all directions
    const zoomFactor = coverPhotoZoom / 100

    // Allow panning even at 100% zoom for the dimension that overflows
    // At 100% zoom, image fills one dimension, so 25-30% pan range in overflow direction
    // At higher zoom, more panning is available
    const basePan = 25 // Base pan amount at 100% zoom for overflow direction
    const zoomPan = Math.max(0, (zoomFactor - 1) * 50) // Additional pan from zoom
    const maxPan = basePan + zoomPan

    return { min: 50 - maxPan, max: 50 + maxPan }
  }, [coverPhotoZoom])

  useEffect(() => {
    if (!isDraggingCover || !coverPhotoDimensions) return

    const bounds = getPanBounds()

    const handleMouseMove = (e: MouseEvent) => {
      const container = coverContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const zoomFactor = coverPhotoZoom / 100

      // Allow panning based on zoom level
      if (coverPhotoDimensions.isPortrait || zoomFactor > 1) {
        const deltaY = (e.clientY - dragStartRef.current.y) / rect.height * 100 / zoomFactor
        const newY = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posY - deltaY))

        if (zoomFactor > 1) {
          // When zoomed in, allow both directions
          const deltaX = (e.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
          const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
          setCoverPhotoPosition({ x: newX, y: newY })
        } else {
          setCoverPhotoPosition(prev => ({ x: 50, y: newY }))
        }
      } else {
        const deltaX = (e.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
        const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
        setCoverPhotoPosition(prev => ({ x: newX, y: 50 }))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const container = coverContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const zoomFactor = coverPhotoZoom / 100

      if (coverPhotoDimensions.isPortrait || zoomFactor > 1) {
        const deltaY = (touch.clientY - dragStartRef.current.y) / rect.height * 100 / zoomFactor
        const newY = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posY - deltaY))

        if (zoomFactor > 1) {
          const deltaX = (touch.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
          const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
          setCoverPhotoPosition({ x: newX, y: newY })
        } else {
          setCoverPhotoPosition(prev => ({ x: 50, y: newY }))
        }
      } else {
        const deltaX = (touch.clientX - dragStartRef.current.x) / rect.width * 100 / zoomFactor
        const newX = Math.max(bounds.min, Math.min(bounds.max, dragStartRef.current.posX - deltaX))
        setCoverPhotoPosition(prev => ({ x: newX, y: 50 }))
      }
    }

    const handleEnd = () => setIsDraggingCover(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleEnd)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDraggingCover, coverPhotoDimensions, coverPhotoZoom, getPanBounds])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverPhotoFile(file)
      setCoverPhotoPosition({ x: 50, y: 50 }) // Reset position for new image
      setCoverPhotoZoom(100) // Reset zoom for new image
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setCoverPhotoPreview(result)
        // Get image dimensions to determine if portrait or landscape
        const img = new Image()
        img.onload = () => {
          const containerAspect = 16 / 9 // aspect-video
          const imageAspect = img.width / img.height
          setCoverPhotoDimensions({
            width: img.width,
            height: img.height,
            isPortrait: imageAspect < containerAspect
          })
        }
        img.src = result
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        })
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await res.json()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      if (!uploadRes.ok) throw new Error('Failed to upload file')
      return publicUrl
    } catch (error) {
      console.error('File upload failed:', error)
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

  const handleComplete = async (action: 'create' | 'skip' | 'link') => {
    setIsLoading(true)
    setError(null)

    try {
      let avatarUrl = user?.photoURL || null
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile)
      }

      if (nickname !== user?.displayName || avatarUrl !== user?.photoURL) {
        await updateProfile({
          displayName: nickname || user?.displayName || 'User',
          photoURL: avatarUrl || undefined
        })
      }

      let coverPhotoUrl: string | undefined
      if (coverPhotoFile) {
        coverPhotoUrl = await uploadFile(coverPhotoFile) || undefined
      }

      const newLocket = await createLocket({
        name: locketName || 'Our Locket',
        admin_firebase_uid: user!.uid,
        anniversary_date: getFormattedAnniversaryDate(),
        cover_photo_url: coverPhotoUrl,
        location_origin: locationOrigin || undefined,
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
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const inviteUrl = `${origin}/invite/${newLocket.invite_code}`
        setInviteLink(inviteUrl)
        setShowInviteModal(true)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Setup failed details:', err)
      const message = err instanceof Error ? err.message : 'Failed to create your locket. Please try again.'
      setError(`${message} (Please check console for details)`)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step < currentStep
                ? 'bg-[#C8A659] text-[#221016]'
                : step === currentStep
                ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-[#2a161e]'
                : 'bg-[#331922] text-white/40 border border-white/10'
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < TOTAL_STEPS && (
            <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${step < currentStep ? 'bg-[#C8A659]' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <h2 className="font-serif italic text-2xl md:text-3xl text-white mb-2">Let's start with you</h2>
        <p className="text-white/60 text-sm">How should we call you?</p>
      </div>

      <div className="mb-8 relative group cursor-pointer flex justify-center">
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <div className="relative h-28 w-28 rounded-full border-2 border-dashed border-white/20 hover:border-[#C8A659]/50 transition-colors duration-300 flex items-center justify-center bg-[#331922] overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-white/20 text-4xl group-hover:text-white/40 transition-colors">add_a_photo</span>
            )}
            <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} ref={avatarInputRef} />
          </div>
        </label>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="absolute bottom-0 right-1/2 translate-x-[56px] translate-y-1 h-9 w-9 rounded-full bg-[#C8A659] text-[#221016] flex items-center justify-center shadow-lg hover:bg-[#dabb70] transition-colors border-2 border-[#2a161e]"
        >
          <span className="material-symbols-outlined text-lg">edit</span>
        </button>
      </div>

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

      <button
        type="button"
        onClick={nextStep}
        className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-3.5 text-white shadow-lg transition-all duration-300 hover:bg-[#a03d58] hover:shadow-primary/25 active:scale-[0.99]"
      >
        <span className="font-bold tracking-wide text-sm">Continue</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  )

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <h2 className="font-serif italic text-2xl md:text-3xl text-white mb-2">Tell us about your love</h2>
        <p className="text-white/60 text-sm">These details help personalize your experience</p>
      </div>

      <div className="space-y-4">
        {/* Locket Name */}
        <div className="group input-gradient-focus relative rounded-lg bg-[#331922] border border-[#673244] transition-all duration-300">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#C8A659] transition-colors">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <input
            type="text"
            placeholder="Locket Name (e.g., Our Story)"
            value={locketName}
            onChange={(e) => setLocketName(e.target.value)}
            className="w-full bg-transparent py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-0 border-none font-medium text-[15px]"
          />
        </div>

        {/* Anniversary Date - Custom Month/Year/Day Selectors */}
        <div className="space-y-2">
          <label className="text-white/60 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">event</span>
            When did it start?
          </label>
          <div className="flex gap-2">
            {/* Month */}
            <select
              value={anniversaryMonth}
              onChange={(e) => setAnniversaryMonth(e.target.value)}
              className="flex-1 bg-[#331922] border border-[#673244] rounded-lg py-3 px-3 text-white focus:outline-none focus:border-[#C8A659] transition-colors [color-scheme:dark] cursor-pointer"
            >
              <option value="" className="bg-[#331922]">Month</option>
              {months.map(m => (
                <option key={m.value} value={m.value} className="bg-[#331922]">{m.label}</option>
              ))}
            </select>

            {/* Day */}
            {!exactDayUnknown && (
              <select
                value={anniversaryDay}
                onChange={(e) => setAnniversaryDay(e.target.value)}
                className="w-20 bg-[#331922] border border-[#673244] rounded-lg py-3 px-3 text-white focus:outline-none focus:border-[#C8A659] transition-colors [color-scheme:dark] cursor-pointer"
              >
                <option value="" className="bg-[#331922]">Day</option>
                {days.map(d => (
                  <option key={d} value={String(d)} className="bg-[#331922]">{d}</option>
                ))}
              </select>
            )}

            {/* Year */}
            <select
              value={anniversaryYear}
              onChange={(e) => setAnniversaryYear(e.target.value)}
              className="w-24 bg-[#331922] border border-[#673244] rounded-lg py-3 px-3 text-white focus:outline-none focus:border-[#C8A659] transition-colors [color-scheme:dark] cursor-pointer"
            >
              <option value="" className="bg-[#331922]">Year</option>
              {years.map(y => (
                <option key={y} value={String(y)} className="bg-[#331922]">{y}</option>
              ))}
            </select>
          </div>

          {/* Exact day unknown checkbox */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={exactDayUnknown}
              onChange={(e) => {
                setExactDayUnknown(e.target.checked)
                if (e.target.checked) setAnniversaryDay('')
              }}
              className="w-4 h-4 rounded border-[#673244] bg-[#331922] text-primary focus:ring-primary/30 cursor-pointer"
            />
            <span className="text-white/40 text-xs group-hover:text-white/60 transition-colors">I don't remember the exact day</span>
          </label>
        </div>

        {/* Location Origin with Autocomplete */}
        <div className="relative">
          <div className="group input-gradient-focus relative rounded-lg bg-[#331922] border border-[#673244] transition-all duration-300">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined">location_on</span>
            </div>
            <input
              ref={locationInputRef}
              type="text"
              placeholder="Where did you meet?"
              value={locationOrigin}
              onChange={(e) => handleLocationChange(e.target.value)}
              onKeyDown={handleLocationKeyDown}
              onFocus={() => locationOrigin.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full bg-transparent py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-0 border-none font-medium text-[15px]"
            />
            {isLoadingSuggestions && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-[#2a161e] border border-[#673244] rounded-lg shadow-xl overflow-hidden"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#331922] transition-colors flex items-start gap-3 ${
                    index === selectedIndex ? 'bg-[#331922]' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-white/40 text-lg mt-0.5">place</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{suggestion.name}</p>
                    {suggestion.description && (
                      <p className="text-white/40 text-xs truncate">{suggestion.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center justify-center gap-1 px-4 py-3.5 rounded-lg bg-[#331922] border border-[#673244] text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="group relative flex-1 flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-3.5 text-white shadow-lg transition-all duration-300 hover:bg-[#a03d58] hover:shadow-primary/25 active:scale-[0.99]"
        >
          <span className="font-bold tracking-wide text-sm">Continue</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <button type="button" onClick={nextStep} className="mt-4 w-full text-xs text-white/40 hover:text-white/60 transition-colors font-medium">
        Skip for now
      </button>
    </div>
  )

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <h2 className="font-serif italic text-2xl md:text-3xl text-white mb-2">Set the vibe</h2>
        <p className="text-white/60 text-sm">Add a cover photo for your locket's dashboard</p>
      </div>

      {/* Cover Photo Upload with Drag to Reposition */}
      <div className="mb-6">
        <div
          ref={coverContainerRef}
          onClick={() => !coverPhotoPreview && coverPhotoInputRef.current?.click()}
          onMouseDown={coverPhotoPreview ? handleCoverMouseDown : undefined}
          onTouchStart={coverPhotoPreview ? handleCoverTouchStart : undefined}
          className={`relative w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
            coverPhotoPreview
              ? 'border-[#C8A659]/50 cursor-move'
              : 'border-white/20 hover:border-[#C8A659]/50 cursor-pointer'
          } bg-[#331922] flex items-center justify-center select-none`}
        >
          {coverPhotoPreview ? (
            <>
              <img
                src={coverPhotoPreview}
                alt="Cover preview"
                className="absolute max-w-none pointer-events-none transition-transform duration-75"
                style={coverPhotoDimensions?.isPortrait ? {
                  // Portrait: fill width, allow vertical positioning
                  width: `${coverPhotoZoom}%`,
                  height: 'auto',
                  left: '50%',
                  top: `${coverPhotoPosition.y}%`,
                  transform: `translate(-50%, -${coverPhotoPosition.y}%)`
                } : {
                  // Landscape or square: fill height, allow horizontal positioning
                  width: 'auto',
                  height: `${coverPhotoZoom}%`,
                  top: '50%',
                  left: `${coverPhotoPosition.x}%`,
                  transform: `translate(-${coverPhotoPosition.x}%, -50%)`
                }}
                draggable={false}
              />
              {/* Drag hint overlay */}
              <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center transition-opacity ${isDraggingCover ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`}>
                <Move className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Drag to reposition</span>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <span className="material-symbols-outlined text-white/20 text-5xl group-hover:text-white/40 transition-colors block mb-2">add_photo_alternate</span>
              <p className="text-white/40 text-sm">Click to upload a cover photo</p>
              <p className="text-white/20 text-xs mt-1">This will appear as a hero on your dashboard</p>
            </div>
          )}
          <input
            type="file"
            id="cover-photo-upload"
            className="hidden"
            accept="image/*"
            onChange={handleCoverPhotoChange}
            ref={coverPhotoInputRef}
          />
        </div>

        {/* Zoom slider and change photo button when photo exists */}
        {coverPhotoPreview && (
          <div className="mt-4 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCoverPhotoZoom(prev => Math.max(100, prev - 10))}
                className="p-1.5 rounded-lg bg-[#331922] border border-[#673244] text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="100"
                  max="200"
                  value={coverPhotoZoom}
                  onChange={(e) => setCoverPhotoZoom(Number(e.target.value))}
                  className="w-full h-2 bg-[#331922] rounded-lg appearance-none cursor-pointer accent-[#C8A659] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C8A659] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>
              <button
                type="button"
                onClick={() => setCoverPhotoZoom(prev => Math.min(200, prev + 10))}
                className="p-1.5 rounded-lg bg-[#331922] border border-[#673244] text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-white/40 text-xs w-12 text-right">{coverPhotoZoom}%</span>
            </div>

            <button
              type="button"
              onClick={() => coverPhotoInputRef.current?.click()}
              className="w-full text-sm text-[#C8A659] hover:text-[#dabb70] transition-colors font-medium"
            >
              Choose a different photo
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center justify-center gap-1 px-4 py-3.5 rounded-lg bg-[#331922] border border-[#673244] text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="group relative flex-1 flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-3.5 text-white shadow-lg transition-all duration-300 hover:bg-[#a03d58] hover:shadow-primary/25 active:scale-[0.99]"
        >
          <span className="font-bold tracking-wide text-sm">Continue</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <button type="button" onClick={nextStep} className="mt-4 w-full text-xs text-white/40 hover:text-white/60 transition-colors font-medium">
        Skip for now
      </button>
    </div>
  )

  const renderStep4 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <h2 className="font-serif italic text-2xl md:text-3xl text-white mb-2">Invite your partner</h2>
        <p className="text-white/60 text-sm">Every locket needs two hearts</p>
      </div>

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

      <button
        type="button"
        onClick={() => handleComplete('create')}
        disabled={isLoading}
        className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary py-3.5 text-white shadow-lg transition-all duration-300 hover:bg-[#a03d58] hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span className="font-bold tracking-wide text-sm">Create Locket</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => handleComplete('link')}
          disabled={isLoading}
          className="text-sm font-medium text-[#C8A659] hover:text-[#dabb70] hover:underline decoration-[#C8A659]/40 underline-offset-4 transition-colors disabled:opacity-50"
        >
          Generate invite link instead
        </button>
        <button
          type="button"
          onClick={() => handleComplete('skip')}
          disabled={isLoading}
          className="text-xs text-white/40 hover:text-white/60 transition-colors font-medium disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <button
        type="button"
        onClick={prevStep}
        disabled={isLoading}
        className="mt-4 w-full flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors font-medium disabled:opacity-50"
      >
        <ArrowLeft className="w-3 h-3" />
        Back
      </button>
    </div>
  )

  return (
    <>
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

      <div className="bg-[#221016] font-display text-white antialiased overflow-hidden min-h-screen w-full relative">
        <div
          className="absolute inset-0 z-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9SOxeh7o9RmjZeAAN2jojATEE6Wp_0bKcBrSlpPb0jPzhuWEfzhCv1KZ7PpCTcLv6ebQTDOg-hX2ex6Uq0EAPyN8WNwz-7ZwSF6Hshab2zypHym4HRjmFhpOjb9sPDuly_swIFuTuBFlcHiSqyBNgTpvWMcbWPcgeTaDE89WWJ_mYvkYF8Hg5jsB1hQt_9hwIkPzKxoIpTQTVGqH_OR8-AWAKxpZY99aIg45xbUUGo0QGRXwyld3z9AxZ4TgX8x_mKlf3LHFK3ibl')",
            filter: 'blur(8px)'
          }}
        />
        <div className="absolute inset-0 z-0 bg-romantic-overlay" />

        <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="glass-card w-full max-w-[480px] rounded-2xl p-8 md:p-10 flex flex-col items-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
            </div>

            {renderStepIndicator()}

            {error && (
              <div className="w-full mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 text-red-300">
                <span className="material-symbols-outlined text-xl flex-shrink-0">error</span>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form className="w-full" onSubmit={(e) => e.preventDefault()}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </form>
          </div>

          <div className="absolute bottom-6 text-white/10 text-xs font-medium tracking-widest uppercase pointer-events-none">
            Twofold © 2024
          </div>
        </div>

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
                <p className="text-sm text-white truncate font-mono">{inviteLink}</p>
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
