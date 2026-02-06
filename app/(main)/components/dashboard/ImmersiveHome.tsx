'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpotlightCard } from './SpotlightCard';
import { PinnedNote } from './PinnedNote';
import { WidgetCarousel } from './WidgetCarousel';
import { BucketListWidget } from './widgets/BucketListWidget';
import { CountdownWidget } from '@/(main)/profile/components/CountdownWidget';
import { EditMemoryModal } from '@/(main)/timeline/components/EditMemoryModal';
import { CommentsPanel } from '@/(main)/timeline/components/CommentsPanel';
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal';
import type { Locket, MemoryGroup, MediaItem as MediaItemType } from '@/lib/types';

interface ImmersiveHomeProps {
  locket: Locket;
  user: {
    uid: string;
    displayName?: string | null;
  };
}

export function ImmersiveHome({ locket, user }: ImmersiveHomeProps) {
  // Modal states (still used by SpotlightCard)
  const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
  const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
  const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
  const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

  // Calculate days together
  const daysTogether = locket.anniversary_date
    ? Math.floor((Date.now() - new Date(locket.anniversary_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate countdown target
  const targetDate = locket.next_countdown_date
    ? new Date(locket.next_countdown_date)
    : locket.anniversary_date
      ? new Date(
          new Date().getFullYear() +
            (new Date(locket.anniversary_date).setFullYear(new Date().getFullYear()) < Date.now() ? 1 : 0),
          new Date(locket.anniversary_date).getMonth(),
          new Date(locket.anniversary_date).getDate()
        )
      : null;

  const countdownTitle = locket.next_countdown_event_name || (locket.anniversary_date ? 'Anniversary' : 'Next Milestone');

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user.displayName?.split(' ')[0] || 'Love';

  const formattedAnniversary = locket.anniversary_date
    ? new Date(locket.anniversary_date).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const handleViewMemory = async (group: MemoryGroup) => {
    setViewingMemory(group);

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups/${group.id}/like?locketId=${locket.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (error) {
      console.error('Failed to fetch like status:', error);
    }
  };

  const handleViewMemoryLike = async () => {
    if (!viewingMemory) return;

    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/memory-groups/${viewingMemory.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locket_id: locket.id })
      });

      if (res.ok) {
        const data = await res.json();
        setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#221016] pb-24 md:pb-8">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* 1. Header: Greeting + Settings */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pt-6 pb-2"
        >
          <div>
            <p className="text-white/50 text-sm font-medium">
              {getGreeting()}, {firstName}
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white leading-tight">
              {locket.name}
            </h1>
          </div>
          <Link
            href="/settings"
            className="p-2.5 bg-white/[0.07] backdrop-blur-md rounded-full hover:bg-white/[0.12] transition-colors border border-white/[0.08]"
            aria-label="Locket settings"
          >
            <Settings className="w-4 h-4 text-white/70" />
          </Link>
        </motion.div>

        {/* 2. Days Together Counter */}
        {daysTogether !== null && daysTogether > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/[0.07] backdrop-blur-md rounded-full px-4 py-2 border border-white/[0.08]">
                <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
                <span className="font-heading font-bold text-white text-lg">
                  {daysTogether.toLocaleString()}
                </span>
                <span className="text-white/50 text-sm">days together</span>
              </div>
              {formattedAnniversary && (
                <span className="text-white/30 text-xs hidden sm:inline">
                  since {formattedAnniversary}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* 3. Pinned Fridge (standalone, centered) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start justify-center py-4 mb-6"
        >
          <PinnedNote
            locketId={locket.id}
            partnerName="your partner"
          />
        </motion.div>

        {/* 4. Spotlight / On This Day (full-width) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <SpotlightCard locketId={locket.id} onViewMemory={handleViewMemory} />
        </motion.div>

        {/* 5. Widget Carousel (Countdown + BucketList) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <WidgetCarousel>
            {targetDate ? (
              <CountdownWidget targetDate={targetDate} title={countdownTitle} />
            ) : (
              <div className="bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-xl rounded-2xl p-6 text-white relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[180px] border border-white/[0.08]">
                <p className="font-heading text-xl mb-2">Set a Date</p>
                <p className="text-white/60 text-sm mb-4">
                  Add your anniversary or next trip to see a countdown here.
                </p>
                <Link
                  href="/settings"
                  className="bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold transition-colors border border-white/10"
                >
                  Configure Locket
                </Link>
              </div>
            )}
            <BucketListWidget locketId={locket.id} />
          </WidgetCarousel>
        </motion.div>
      </div>

      {/* Modals (used by SpotlightCard) */}
      {editingMemory && (
        <EditMemoryModal
          isOpen={true}
          onClose={() => setEditingMemory(null)}
          memoryId={editingMemory.id}
          initialTitle={editingMemory.title || ''}
          initialDescription={editingMemory.description}
          initialDate={editingMemory.date_taken ? String(editingMemory.date_taken).split('T')[0] : undefined}
          mediaItems={editingMemory.media_items?.map((m: MediaItemType) => ({
            id: m.id,
            storage_url: m.storage_url,
            storage_key: m.storage_key,
            filename: m.filename,
            file_type: m.file_type,
            date_taken: m.date_taken ? String(m.date_taken) : undefined,
            place_name: m.place_name
          }))}
          onSaved={() => {}}
        />
      )}

      {commentingMemory && (
        <CommentsPanel
          isOpen={true}
          onClose={() => setCommentingMemory(null)}
          memoryId={commentingMemory.id}
          memoryTitle={commentingMemory.title}
        />
      )}

      {viewingMemory && (
        <MemoryDetailModal
          isOpen={true}
          onClose={() => setViewingMemory(null)}
          memory={{
            ...viewingMemory,
            date_taken: viewingMemory.date_taken ? String(viewingMemory.date_taken) : undefined,
            created_at: String(viewingMemory.created_at),
            media_items: viewingMemory.media_items?.map(m => ({
              ...m,
              date_taken: m.date_taken ? String(m.date_taken) : undefined
            }))
          }}
          isLiked={viewingMemoryLike.isLiked}
          likeCount={viewingMemoryLike.likeCount}
          onLike={handleViewMemoryLike}
          onEdit={() => {
            setViewingMemory(null);
            setEditingMemory(viewingMemory);
          }}
          onComment={() => {
            setViewingMemory(null);
            setCommentingMemory({
              id: viewingMemory.id,
              title: viewingMemory.title || 'Memory'
            });
          }}
        />
      )}
    </div>
  );
}
