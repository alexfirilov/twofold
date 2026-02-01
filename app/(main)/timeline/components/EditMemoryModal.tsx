'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Loader2, Calendar, MapPin, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocket } from '@/contexts/LocketContext';

interface PlaceSuggestion {
  placeId: string;
  name: string;
  description: string;
  fullText: string;
}

interface MediaItem {
  id: string;
  storage_url: string;
  storage_key: string;
  filename: string;
  file_type: string;
  date_taken?: string;
  place_name?: string;
  latitude?: number;
  longitude?: number;
}

interface EditMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryId: string;
  initialTitle: string;
  initialDescription?: string;
  initialDate?: string;
  initialLocation?: string;
  mediaItems?: MediaItem[];
  onSaved?: () => void;
}

export function EditMemoryModal({
  isOpen,
  onClose,
  memoryId,
  initialTitle,
  initialDescription = '',
  initialDate,
  initialLocation = '',
  mediaItems = [],
  onSaved
}: EditMemoryModalProps) {
  const { currentLocket } = useLocket();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [date, setDate] = useState(initialDate || '');
  const [location, setLocation] = useState(initialLocation);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>(mediaItems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get GPS coordinates from media items for location bias
  const getLocationBias = useCallback(() => {
    const itemWithGps = media.find(m => m.latitude && m.longitude);
    if (itemWithGps) {
      return { lat: itemWithGps.latitude!, lng: itemWithGps.longitude! };
    }
    return undefined;
  }, [media]);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

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
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions?.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [getLocationBias]);

  // Debounced location input handler
  const handleLocationChange = (value: string) => {
    setLocation(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    const locationText = suggestion.description
      ? `${suggestion.name}, ${suggestion.description}`
      : suggestion.name;
    setLocation(locationText);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      // Use initialDate, or fallback to first media item's date
      const effectiveDate = initialDate ||
        (mediaItems.length > 0 && mediaItems[0].date_taken
          ? mediaItems[0].date_taken.split('T')[0]
          : '');
      setDate(effectiveDate);
      // Use initialLocation, or fallback to first media item's place_name
      const effectiveLocation = initialLocation ||
        (mediaItems.length > 0 && mediaItems[0].place_name
          ? mediaItems[0].place_name
          : '');
      setLocation(effectiveLocation);
      setMedia(mediaItems);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialTitle, initialDescription, initialDate, initialLocation, mediaItems]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!currentLocket) return;
    setIsSaving(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      // Update memory group (title, description, date, location)
      // The API handles updating location on all media items and logging activity
      const res = await fetch('/api/memory-groups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: memoryId,
          locket_id: currentLocket.id,
          title: (title || '').trim() || undefined,
          description: (description || '').trim() || undefined,
          date_taken: date || undefined,
          place_name: (location || '').trim() || undefined,
        })
      });

      if (!res.ok) throw new Error('Failed to save memory group');

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentLocket) return;
    setIsDeleting(true);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups?id=${memoryId}&locket_id=${currentLocket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete');

      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !currentLocket) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      for (const file of files) {
        // Get presigned URL
        const presignRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
            fileSize: file.size
          })
        });

        if (!presignRes.ok) continue;
        const { uploadUrl, publicUrl, storageKey } = await presignRes.json();

        // Upload to GCS
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) continue;

        // Create media item
        await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            locket_id: currentLocket.id,
            memory_group_id: memoryId,
            filename: file.name,
            storage_key: storageKey,
            storage_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          })
        });
      }

      // Refresh and close
      onSaved?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (mediaId: string) => {
    if (!currentLocket) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/media?id=${mediaId}&locket_id=${currentLocket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
        onSaved?.();
      }
    } catch (error) {
      console.error('Remove photo failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1216] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-white/10">
          <h2 className="font-display text-xl text-[#181113] dark:text-white">Edit Memory</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Give this memory a title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Caption</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Add a caption..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
            <div className="relative">
              <input
                ref={locationInputRef}
                type="text"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
                className="w-full bg-white dark:bg-[#2a1d21] border border-black/10 dark:border-white/10 rounded-xl p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Where was this?"
              />
              {isLoadingSuggestions ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                      className={`w-full px-3 py-2 text-left flex items-start gap-2 transition-colors ${
                        index === selectedIndex
                          ? 'bg-primary/10'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-primary/50 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-[#181113] dark:text-white truncate">
                          {suggestion.name}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-muted-foreground truncate">
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

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Photos</label>
            <div className="grid grid-cols-3 gap-2">
              {media.map((item) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <img
                    src={item.storage_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemovePhoto(item.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Add</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleAddPhotos}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rose-100 dark:border-white/10 space-y-3">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">Delete this memory?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
