'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Plus, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BucketListItem {
  id: string;
  title: string;
  status: 'active' | 'completed';
  category?: string;
}

interface BucketListWidgetProps {
  locketId: string;
}

export function BucketListWidget({ locketId }: BucketListWidgetProps) {
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDream, setNewDream] = useState('');
  const [addingDream, setAddingDream] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      try {
        const { getCurrentUserToken } = await import('@/lib/firebase/auth');
        const token = await getCurrentUserToken();

        const res = await fetch(`/api/bucket-list?locketId=${locketId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const activeItems = (data.items || [])
            .filter((i: BucketListItem) => i.status === 'active')
            .slice(0, 2);
          setItems(activeItems);
        }
      } catch (error) {
        console.error("Failed to fetch bucket list", error);
      } finally {
        setLoading(false);
      }
    }
    if (locketId) fetchItems();
  }, [locketId]);

  const handleToggleComplete = async (itemId: string) => {
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch(`/api/bucket-list/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'completed',
          locket_id: locketId
        })
      });

      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  };

  const handleAddDream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDream.trim() || addingDream) return;

    setAddingDream(true);
    try {
      const { getCurrentUserToken } = await import('@/lib/firebase/auth');
      const token = await getCurrentUserToken();

      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newDream.trim(),
          locket_id: locketId,
          category: 'other'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (items.length < 2) {
          setItems(prev => [...prev, data.item]);
        }
        setNewDream('');
      }
    } catch (error) {
      console.error('Failed to add dream:', error);
    } finally {
      setAddingDream(false);
    }
  };

  return (
    <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] relative overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold" />
          <h3 className="font-heading text-lg font-bold text-white">Bucket List</h3>
        </div>
        <Link
          href="/lists"
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
        >
          View <ArrowRight size={10} />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="flex items-start gap-3 group"
              >
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-white/20 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-colors flex-shrink-0 group-hover:border-primary/50"
                  aria-label="Mark as completed"
                >
                  <Check className="w-3 h-3 text-transparent group-hover:text-primary/30" />
                </button>
                <span className="text-sm text-white/70 leading-tight">{item.title}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && !loading && (
            <p className="text-sm text-white/40 text-center py-2">
              No dreams added yet
            </p>
          )}

          <form onSubmit={handleAddDream} className="mt-3 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newDream}
                  onChange={(e) => setNewDream(e.target.value)}
                  placeholder="Add a dream..."
                  className="w-full text-sm px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 placeholder:text-white/30"
                  disabled={addingDream}
                />
              </div>
              <button
                type="submit"
                disabled={!newDream.trim() || addingDream}
                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingDream ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
