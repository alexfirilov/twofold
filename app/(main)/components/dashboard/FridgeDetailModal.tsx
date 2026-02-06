'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Send, Loader2, Trash2, RefreshCw, PenLine, ImageIcon, Upload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';
import type { MemoryGroup } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  comment_type: 'comment' | 'activity';
  activity_action?: string;
  author_firebase_uid?: string;
  author_name?: string;
  author_avatar_url?: string;
  created_at: string;
}

// ─── FridgeDetailModal ──────────────────────────────────────────────

interface FridgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: MemoryGroup;
  onReplace: () => void;
}

export function FridgeDetailModal({ isOpen, onClose, memory, onReplace }: FridgeDetailModalProps) {
  const { currentLocket } = useLocket();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasImage = memory.media_items && memory.media_items.length > 0;
  const firstImage = hasImage ? memory.media_items?.[0] : null;

  useEffect(() => {
    if (isOpen && currentLocket) {
      fetchComments();
    }
  }, [isOpen, memory.id, currentLocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const fetchComments = async () => {
    if (!currentLocket) return;
    setIsLoading(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();
      const res = await fetch(
        `/api/memory-groups/${memory.id}/comments?locketId=${currentLocket.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim() || !currentLocket || isSending) return;
    setIsSending(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();
      const res = await fetch(`/api/memory-groups/${memory.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locket_id: currentLocket.id, content: newComment.trim() })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Failed to send comment:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentLocket) return;
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();
      const res = await fetch(
        `/api/memory-groups/${memory.id}/comments?commentId=${commentId}&locketId=${currentLocket.id}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-[#1a1216] text-[#181113] dark:text-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md h-[85vh] sm:h-[600px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-white/10">
          <h2 className="font-heading text-lg font-bold">The Fridge</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onReplace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Replace
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pinned content */}
        <div className="p-4 border-b border-rose-100 dark:border-white/10">
          {hasImage && firstImage ? (
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src={firstImage.storage_url}
                alt={memory.title || 'Pinned memory'}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="bg-[#FDF6F7] dark:bg-white/5 rounded-xl p-5">
              <p className="font-serif text-center text-truffle/70 dark:text-white/70 italic leading-relaxed">
                &ldquo;{memory.description || memory.title || 'A sweet note'}&rdquo;
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {memory.creator_name && `By ${memory.creator_name}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(memory.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Leave a note on the fridge!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isActivity = comment.comment_type === 'activity';
              const isOwnComment = comment.author_firebase_uid === user?.uid;

              if (isActivity) {
                return (
                  <div key={comment.id} className="flex justify-center py-1">
                    <span className="text-xs text-muted-foreground/70 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
                      {comment.author_name || 'Someone'} {comment.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={comment.id}
                  className={`flex items-end gap-2 group ${isOwnComment ? 'flex-row-reverse' : ''}`}
                >
                  {!isOwnComment && (
                    comment.author_avatar_url ? (
                      <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={comment.author_avatar_url} alt={comment.author_name || 'User'} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-medium text-rose-700 flex-shrink-0">
                        {comment.author_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )
                  )}
                  {isOwnComment && user?.photoURL && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={user.photoURL} alt="You" fill className="object-cover" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isOwnComment
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-white/10 rounded-bl-sm'
                  }`}>
                    {!isOwnComment && comment.author_name && (
                      <p className="text-xs font-medium text-primary mb-0.5">{comment.author_name}</p>
                    )}
                    <p className="text-sm break-words">{comment.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwnComment ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {formatTime(comment.created_at)}
                    </p>
                  </div>
                  {isOwnComment && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-rose-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 dark:bg-white/10 text-[#181113] dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSend}
              disabled={!newComment.trim() || isSending}
              className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ReplacePinModal ────────────────────────────────────────────────

interface ReplacePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  locketId: string;
  onPinned: () => void;
}

type TabId = 'note' | 'memory' | 'upload';

export function ReplacePinModal({ isOpen, onClose, locketId, onPinned }: ReplacePinModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('note');
  const [saving, setSaving] = useState(false);

  // Note tab state
  const [noteText, setNoteText] = useState('');

  // Memory tab state
  const [memories, setMemories] = useState<MemoryGroup[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesFetched, setMemoriesFetched] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch memories lazily when memory tab is activated
  useEffect(() => {
    if (activeTab === 'memory' && !memoriesFetched && isOpen) {
      fetchMemories();
    }
  }, [activeTab, isOpen]);

  // Clean up file preview on unmount
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const getToken = async () => {
    const { getCurrentUserToken } = await import('@/lib/firebase/auth');
    return getCurrentUserToken();
  };

  const fetchMemories = async () => {
    setMemoriesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/memory-groups?locketId=${locketId}&excludePinned=false`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memoryGroups || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setMemoriesLoading(false);
      setMemoriesFetched(true);
    }
  };

  const pinMemory = async (memoryId: string) => {
    const token = await getToken();
    const res = await fetch(`/api/lockets/${locketId}/pinned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ memory_id: memoryId })
    });
    if (!res.ok) throw new Error('Failed to pin memory');
  };

  const handleSubmitNote = async () => {
    if (!noteText.trim() || saving) return;
    setSaving(true);
    try {
      const token = await getToken();

      // Create memory group with note
      const createRes = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ locket_id: locketId, description: noteText.trim() })
      });
      if (!createRes.ok) throw new Error('Failed to create note');
      const createData = await createRes.json();
      const newGroupId = createData.data?.id;

      // Pin it
      await pinMemory(newGroupId);

      setNoteText('');
      onPinned();
      onClose();
    } catch (error) {
      console.error('Failed to pin note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePickMemory = async () => {
    if (!selectedMemoryId || saving) return;
    setSaving(true);
    try {
      await pinMemory(selectedMemoryId);
      onPinned();
      onClose();
    } catch (error) {
      console.error('Failed to pin memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleUploadAndPin = async () => {
    if (!selectedFile || saving) return;
    setSaving(true);
    setUploadProgress(10);

    try {
      const token = await getToken();

      // 1. Create memory group
      const createRes = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          locket_id: locketId,
          description: caption.trim() || undefined
        })
      });
      if (!createRes.ok) throw new Error('Failed to create memory group');
      const createData = await createRes.json();
      const newGroupId = createData.data?.id;
      setUploadProgress(20);

      // 2. Get signed upload URL
      const uploadUrlRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          filename: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size
        })
      });
      if (!uploadUrlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, storageKey, publicUrl } = await uploadUrlRes.json();
      setUploadProgress(30);

      // 3. Resumable upload: POST to initiate, then PUT the file
      const initiateRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': selectedFile.type,
          'Content-Length': '0',
          'x-goog-resumable': 'start'
        }
      });
      const sessionUrl = initiateRes.headers.get('Location');
      if (!sessionUrl) throw new Error('Failed to get resumable session URL');
      setUploadProgress(50);

      const putRes = await fetch(sessionUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile
      });
      if (!putRes.ok) throw new Error('Upload failed');
      setUploadProgress(80);

      // 4. Register media in DB
      const mediaRes = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          locket_id: locketId,
          memory_group_id: newGroupId,
          filename: selectedFile.name,
          storage_key: storageKey,
          storage_url: publicUrl,
          file_type: selectedFile.type,
          file_size: selectedFile.size
        })
      });
      if (!mediaRes.ok) throw new Error('Failed to register media');
      setUploadProgress(90);

      // 5. Pin the new memory
      await pinMemory(newGroupId);
      setUploadProgress(100);

      setSelectedFile(null);
      setCaption('');
      if (filePreview) URL.revokeObjectURL(filePreview);
      setFilePreview(null);
      onPinned();
      onClose();
    } catch (error) {
      console.error('Failed to upload and pin:', error);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'note', label: 'Write a Note', icon: <PenLine className="w-3.5 h-3.5" /> },
    { id: 'memory', label: 'Pick a Memory', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'upload', label: 'Upload Photo', icon: <Upload className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-[#1a1216] text-[#181113] dark:text-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md h-[80vh] sm:h-[550px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-white/10">
          <h2 className="font-heading text-lg font-bold">Replace Pin</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-rose-100 dark:border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ─── Write a Note ─── */}
          {activeTab === 'note' && (
            <div className="flex flex-col h-full">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a sweet note for the fridge..."
                className="flex-1 w-full resize-none rounded-xl border border-rose-200 dark:border-white/10 bg-[#FDF6F7] dark:bg-white/5 text-[#181113] dark:text-white p-4 text-sm font-serif focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-truffle/40 dark:placeholder:text-white/40 min-h-[200px]"
                autoFocus
              />
              <button
                onClick={handleSubmitNote}
                disabled={!noteText.trim() || saving}
                className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                Pin Note
              </button>
            </div>
          )}

          {/* ─── Pick a Memory ─── */}
          {activeTab === 'memory' && (
            <div className="flex flex-col h-full">
              {memoriesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : memories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No memories yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto">
                    {memories.map(mem => {
                      const thumb = mem.media_items?.[0];
                      const isSelected = selectedMemoryId === mem.id;
                      return (
                        <button
                          key={mem.id}
                          onClick={() => setSelectedMemoryId(isSelected ? null : mem.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          {thumb ? (
                            <Image
                              src={thumb.storage_url}
                              alt={mem.title || 'Memory'}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#FDF6F7] dark:bg-white/5 flex items-center justify-center p-2">
                              <p className="text-[10px] text-truffle/50 dark:text-white/50 line-clamp-3 font-serif italic text-center">
                                {mem.description || mem.title || '...'}
                              </p>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handlePickMemory}
                    disabled={!selectedMemoryId || saving}
                    className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Pin Selected
                  </button>
                </>
              )}
            </div>
          )}

          {/* ─── Upload Photo ─── */}
          {activeTab === 'upload' && (
            <div className="flex flex-col h-full">
              {!selectedFile ? (
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-rose-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-rose-50/50 dark:hover:bg-white/5 transition-colors min-h-[200px]">
                  <Upload className="w-8 h-8 text-primary/40 mb-2" />
                  <span className="text-sm text-muted-foreground">Tap to choose a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <>
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                    {filePreview && (
                      <Image src={filePreview} alt="Preview" fill className="object-cover" />
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (filePreview) URL.revokeObjectURL(filePreview);
                        setFilePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption (optional)"
                    className="w-full rounded-lg border border-rose-200 dark:border-white/10 bg-transparent text-[#181113] dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-truffle/40 dark:placeholder:text-white/40 mb-3"
                  />
                </>
              )}

              {saving && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <button
                onClick={handleUploadAndPin}
                disabled={!selectedFile || saving}
                className="mt-auto w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload & Pin
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
