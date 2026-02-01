'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useLocket } from '../contexts/LocketContext'
import {
  Upload as UploadIcon,
  X,
  Calendar as CalendarIcon,
  Loader2,
  Image as ImageIcon,
  Plus,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import exifr from 'exifr'

interface FileWithPreview {
  file: File
  preview: string
  id: string
  latitude?: number
  longitude?: number
}

interface PlaceSuggestion {
  placeId: string
  name: string
  description: string
  fullText: string
}

export default function UploadMemory({ isMilestone = false }: { isMilestone?: boolean }) {
  const { user } = useAuth()
  const { currentLocket } = useLocket()
  const router = useRouter()

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dateAutoFilled, setDateAutoFilled] = useState(false)
  const [locationAutoFilled, setLocationAutoFilled] = useState(false)
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Get GPS coordinates from first file with location (for biasing autocomplete)
  const getLocationBias = useCallback(() => {
    const fileWithGps = files.find(f => f.latitude && f.longitude)
    if (fileWithGps) {
      return { lat: fileWithGps.latitude!, lng: fileWithGps.longitude! }
    }
    return undefined
  }, [files])

  // Fetch autocomplete suggestions
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
        body: JSON.stringify({
          input,
          locationBias: getLocationBias()
        })
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
  }, [getLocationBias])

  // Debounced location input handler
  const handleLocationChange = (value: string) => {
    setLocation(value)
    setLocationAutoFilled(false)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce autocomplete requests
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  // Handle suggestion selection
  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    // Use name + description for a nice format like "Mandoria, Rzgów"
    const locationText = suggestion.description
      ? `${suggestion.name}, ${suggestion.description}`
      : suggestion.name
    setLocation(locationText)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    processFiles(selectedFiles)
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const processFiles = async (newFiles: File[]) => {
    const imageFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))

    if (imageFiles.length === 0) {
      alert('Please upload image or video files')
      return
    }

    const newFileItems: FileWithPreview[] = imageFiles.map(file => ({
      file,
      preview: '',
      id: Math.random().toString(36).substring(7)
      // Removed latitude/longitude init here, will add dynamically
    }))

    // Generate previews
    newFileItems.forEach(item => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, preview: reader.result as string } : f
        ))
      }
      reader.readAsDataURL(item.file)
    })

    setFiles(prev => [...prev, ...newFileItems])

    // Extract EXIF metadata for all new images
    for (const item of newFileItems) {
      if (item.file.type.startsWith('image/')) {
        try {
          // @ts-ignore - exifr is not typed perfectly
          const metadata = await exifr.parse(item.file);
          if (metadata) {
            // Check for GPS
            let lat = metadata.latitude;
            let lon = metadata.longitude;

            if (lat && lon) {
              console.log(`GPS found for ${item.file.name}:`, lat, lon);

              // 1. Store GPS in file item structure in state
              setFiles(prev => prev.map(f =>
                f.id === item.id ? { ...f, latitude: lat, longitude: lon } : f
              ));

              // 2. Auto-fill visible location text if empty - use reverse geocoding
              if (!location && !locationAutoFilled) {
                setIsGeocodingLocation(true);
                try {
                  const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                  const token = await getCurrentUserToken();
                  console.log('[Geocode] Calling API with:', { latitude: lat, longitude: lon });

                  const geocodeRes = await fetch('/api/geocode', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ latitude: lat, longitude: lon })
                  });

                  const data = await geocodeRes.json();
                  console.log('[Geocode] Response:', geocodeRes.status, data);

                  if (geocodeRes.ok && data.success && data.location) {
                    console.log('[Geocode] Success! Location:', data.location);
                    setLocation(data.location);
                    setLocationAutoFilled(true);
                  } else {
                    // Fallback to formatted coordinates
                    console.log('[Geocode] Failed or no location, using coordinates. Error:', data.error);
                    const latStr = typeof lat === 'number' ? lat.toFixed(4) : lat;
                    const lonStr = typeof lon === 'number' ? lon.toFixed(4) : lon;
                    setLocation(`${latStr}, ${lonStr}`);
                    setLocationAutoFilled(true);
                  }
                } catch (geoError) {
                  console.error('[Geocode] Exception:', geoError);
                  // Fallback to formatted coordinates
                  const latStr = typeof lat === 'number' ? lat.toFixed(4) : lat;
                  const lonStr = typeof lon === 'number' ? lon.toFixed(4) : lon;
                  setLocation(`${latStr}, ${lonStr}`);
                  setLocationAutoFilled(true);
                } finally {
                  setIsGeocodingLocation(false);
                }
              }
            }

            // Auto-fill date from FIRST image if not set
            if (!dateAutoFilled) {
              let takenDate: Date | null = null;
              if (metadata.DateTimeOriginal) takenDate = metadata.DateTimeOriginal;
              else if (metadata.CreateDate) takenDate = metadata.CreateDate;

              if (takenDate) {
                setDate(takenDate.toISOString().split('T')[0]);
                setDateAutoFilled(true);
              }
            }
          }
        } catch (e) {
          console.log('EXIF extraction failed for', item.file.name, e);
        }
      }
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleUpload = async () => {
    if (files.length === 0 || !currentLocket) return

    setIsLoading(true)
    setUploadProgress(0)

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth')
      const token = await getCurrentUserToken()

      // 1. Create Memory Group first
      const groupRes = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locket_id: currentLocket.id,
          title: caption || undefined,
          description: undefined,
          date_taken: date,
          is_milestone: isMilestone
        })
      })

      if (!groupRes.ok) throw new Error('Failed to create memory group')
      const { data: group } = await groupRes.json()

      // 2. Upload each file
      const totalFiles = files.length
      let uploadedCount = 0

      for (const { file, latitude, longitude } of files as (FileWithPreview & { latitude?: number, longitude?: number })[]) {
        // Get Presigned URL
        const presignRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
            fileSize: file.size
          })
        })

        if (!presignRes.ok) throw new Error('Failed to get upload URL')
        const { uploadUrl, publicUrl, storageKey } = await presignRes.json()

        // Upload to GCS
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        })

        if (!uploadRes.ok) throw new Error('Failed to upload file')

        // Create Media Item
        const mediaRes = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            locket_id: currentLocket.id,
            memory_group_id: group.id,
            filename: file.name,
            storage_key: storageKey,
            storage_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            title: caption,
            date_taken: new Date(date),
            sort_order: uploadedCount,
            ...(location && { place_name: location }),
            // Add GPS coordinates if they exist
            ...(latitude && longitude && { latitude, longitude })
          })
        })

        if (!mediaRes.ok) throw new Error('Failed to save media metadata')

        uploadedCount++
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100))
      }

      router.push(isMilestone ? '/journey' : '/timeline')

    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload memory. Please try again.')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  if (!currentLocket) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Please select a Locket first.</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X className="w-6 h-6 text-[#181113] dark:text-white" />
        </button>
        <h1 className="font-display italic text-3xl text-[#181113] dark:text-white">
          {isMilestone ? 'Add a Milestone' : 'Add a Memory'}
        </h1>
      </div>

      <div className="flex flex-col gap-8">

        {/* Dropzone / Preview Grid */}
        {files.length === 0 ? (
          <div
            className={`
              aspect-[4/3] rounded-2xl border-2 border-dashed transition-all relative overflow-hidden flex flex-col items-center justify-center cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5' : 'border-black/10 dark:border-white/10 hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="font-display text-xl text-[#181113] dark:text-white mb-2">Tap to upload</p>
              <p className="text-[#875e69] dark:text-[#dcb8c3] text-sm">
                {isMilestone ? 'Add multiple photos to capture this moment' : 'or drag and drop here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map(({ id, preview, file }) => (
                <div key={id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all backdrop-blur-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {file.type.startsWith('video/') && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full backdrop-blur-md">
                      Video
                    </div>
                  )}
                  {/* @ts-ignore - custom property on file object */}
                  {files.find(f => f.id === id)?.latitude && (
                    <div className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-full backdrop-blur-md" title="Location found">
                      <MapPin size={12} />
                    </div>
                  )}
                </div>
              ))}

              {/* Add More Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 flex flex-col items-center justify-center transition-all"
              >
                <Plus className="w-8 h-8 text-primary/50 mb-1" />
                <span className="text-xs text-muted-foreground">Add more</span>
              </button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
        />

        {/* Details Form */}
        <div className="flex flex-col gap-6">

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">
              {isMilestone ? 'What milestone is this?' : 'Caption'}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={isMilestone ? "First trip together, Moving in, Anniversary..." : "What's the story behind this moment?"}
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-4 text-lg font-sans placeholder:text-black/20 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none h-32"
            />
          </div>

          {/* Date and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">Date {dateAutoFilled && <span className="text-xs text-primary/50 normal-case">(from photo)</span>}</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setDateAutoFilled(false); }}
                  className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-4 pl-12 text-lg font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#875e69] dark:text-[#dcb8c3] mb-2 font-display uppercase tracking-wider">
                Location {locationAutoFilled && <span className="text-xs text-primary/50 normal-case">(from photo)</span>}
              </label>
              <div className="relative">
                <input
                  ref={locationInputRef}
                  type="text"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={isGeocodingLocation ? "Finding location..." : "Where did this happen?"}
                  disabled={isGeocodingLocation}
                  autoComplete="off"
                  className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-4 pl-12 text-lg font-sans placeholder:text-black/20 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                />
                {isGeocodingLocation || isLoadingSuggestions ? (
                  <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 w-5 h-5 pointer-events-none animate-spin" />
                ) : (
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 w-5 h-5 pointer-events-none" />
                )}

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.placeId}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                          index === selectedIndex
                            ? 'bg-primary/10'
                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-primary/50 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-[#181113] dark:text-white truncate">
                            {suggestion.name}
                          </div>
                          {suggestion.description && (
                            <div className="text-sm text-[#875e69] dark:text-[#dcb8c3] truncate">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isLoading}
          className="h-16 text-lg font-medium rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading... {uploadProgress}%
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5 mr-2" />
              {isMilestone ? 'Save Milestone' : 'Add to Locket'}
            </>
          )}
        </Button>

      </div>
    </div>
  )
}
