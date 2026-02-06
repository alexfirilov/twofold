'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, Loader2, Clock } from 'lucide-react';
import type { MemoryGroup, SpotlightMemory } from '@/lib/types';

interface SpotlightCardProps {
  locketId: string;
  onViewMemory?: (memory: MemoryGroup) => void;
}

export function SpotlightCard({ locketId, onViewMemory }: SpotlightCardProps) {
  const [spotlight, setSpotlight] = useState<SpotlightMemory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpotlight() {
      try {
        const { getCurrentUserToken } = await import('@/lib/firebase/auth');
        const token = await getCurrentUserToken();

        const res = await fetch(`/api/memories/spotlight?locketId=${locketId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setSpotlight(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch spotlight memory:', error);
      } finally {
        setLoading(false);
      }
    }

    if (locketId) fetchSpotlight();
  }, [locketId]);

  if (loading) {
    return (
      <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!spotlight || spotlight.type === 'none' || !spotlight.memory) {
    return (
      <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-lg font-bold text-white">On This Day</h3>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4 text-center py-8 border border-white/[0.05]">
          <Clock className="w-8 h-8 mx-auto text-white/15 mb-3" />
          <p className="text-white/40 text-sm">
            Your memories will appear here — both &ldquo;On This Day&rdquo; flashbacks and random highlights.
          </p>
          <p className="text-xs text-white/25 mt-1">
            Keep adding memories to unlock spotlights!
          </p>
        </div>
      </div>
    );
  }

  const memory = spotlight.memory;
  const hasMedia = memory.media_items && memory.media_items.length > 0;
  const firstImage = hasMedia ? memory.media_items?.[0] : null;
  const isOnThisDay = spotlight.type === 'on_this_day';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden group"
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnThisDay ? (
            <>
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg font-bold text-white">On This Day</h3>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="font-heading text-lg font-bold text-white">Memory Spotlight</h3>
            </>
          )}
        </div>

        {isOnThisDay && spotlight.years_ago && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 bg-gold/20 text-gold px-2.5 py-1 rounded-full text-xs font-bold"
          >
            {spotlight.years_ago} {spotlight.years_ago === 1 ? 'year' : 'years'} ago
          </motion.span>
        )}
      </div>

      {/* Content */}
      <button
        onClick={() => onViewMemory?.(memory)}
        className="block w-full text-left"
      >
        {hasMedia && firstImage ? (
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={firstImage.storage_url}
              alt={memory.title || 'Memory'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12">
              {memory.title && (
                <h4 className="font-heading text-white font-bold text-lg leading-tight mb-1">
                  {memory.title}
                </h4>
              )}
              {memory.description && (
                <p className="text-white/80 text-sm line-clamp-2">
                  {memory.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 pt-0">
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-xl p-5 border border-white/[0.05]">
              <p className="font-serif text-white/70 italic text-center leading-relaxed">
                &ldquo;{memory.description || memory.title || 'A cherished moment'}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-white/40">
            {new Date(memory.date_taken || memory.created_at).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          <span className="text-xs text-primary font-medium group-hover:underline">
            View memory
          </span>
        </div>
      </button>
    </motion.div>
  );
}
