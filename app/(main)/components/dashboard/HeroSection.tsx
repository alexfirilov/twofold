'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ImagePlus, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { LocketCover } from '@/lib/types';

interface HeroSectionProps {
  locketName: string;
  userName?: string;
  daysTogether?: number | null;
  anniversaryDate?: Date | string | null;
  locationOrigin?: string;
  coverPhotos: LocketCover[];
  fallbackCoverUrl?: string;
  onScrollDown?: () => void;
}

export function HeroSection({
  locketName,
  userName,
  daysTogether,
  anniversaryDate,
  locationOrigin,
  coverPhotos,
  fallbackCoverUrl,
  onScrollDown
}: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get all available images for slideshow
  const images = coverPhotos.length > 0
    ? coverPhotos.map(c => c.photo_url)
    : fallbackCoverUrl
      ? [fallbackCoverUrl]
      : [];

  // Auto-advance slideshow
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = userName?.split(' ')[0] || 'Love';

  // Format anniversary date
  const formattedAnniversary = anniversaryDate
    ? new Date(anniversaryDate).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className="relative h-[70dvh] min-h-[480px] max-h-[700px] w-full overflow-hidden">
      {/* Background Images with Ken Burns Effect */}
      <AnimatePresence mode="wait">
        {images.length > 0 ? (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.2, ease: 'easeInOut' },
              scale: { duration: 12, ease: 'linear' }
            }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentIndex]}
              alt={`${locketName} cover`}
              fill
              className="object-cover"
              priority={currentIndex === 0}
              sizes="100vw"
            />
          </motion.div>
        ) : (
          // Fallback gradient when no images
          <div className="absolute inset-0 bg-gradient-to-br from-[#221016] via-[#331922] to-[#221016]" />
        )}
      </AnimatePresence>

      {/* Dark Gradient Overlays */}
      <div className="absolute inset-0 bg-[#221016]/40 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#221016] via-[#221016]/30 to-[#221016]/20 opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#221016]/60 via-transparent to-transparent opacity-70" />

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-[env(safe-area-inset-top,12px)] mt-3">
        {/* Slideshow Indicators */}
        {images.length > 1 ? (
          <div className="flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/30 w-1.5 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        ) : (
          <div />
        )}

        {/* Settings Button */}
        <Link
          href="/settings"
          className="p-2.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/10"
          aria-label="Locket settings"
        >
          <Settings className="w-4 h-4 text-white/80" />
        </Link>
      </div>

      {/* Center Stage - Days Counter */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          {/* Greeting */}
          <p className="text-white/60 text-sm font-medium tracking-wide mb-6">
            {getGreeting()}, {firstName}
          </p>

          {/* Massive Days Counter */}
          {daysTogether !== null && daysTogether !== undefined && daysTogether > 0 ? (
            <>
              <h1 className="font-heading text-[5.5rem] md:text-[8rem] leading-none font-black text-white tracking-tight drop-shadow-2xl">
                {daysTogether.toLocaleString()}
              </h1>
              <p className="text-white/70 text-xl md:text-2xl font-heading font-light mt-2 tracking-wide">
                Days Together
              </p>
            </>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-2xl leading-tight">
                {locketName}
              </h1>
              <p className="text-white/60 text-lg font-heading font-light mt-2">
                Your shared world
              </p>
            </>
          )}

          {/* Anniversary Badge */}
          {formattedAnniversary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-5 py-2.5 mt-6 border border-white/10"
            >
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-white/80 text-sm font-medium">
                since {formattedAnniversary}
              </span>
            </motion.div>
          )}

          {/* Location */}
          {locationOrigin && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/40 text-xs mt-3 tracking-wide"
            >
              {locationOrigin}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Add Cover Photo Button (when no images) */}
      {images.length === 0 && (
        <Link
          href="/settings"
          className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-white/60 transition-colors group z-20"
        >
          <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors border border-white/10">
            <ImagePlus className="w-8 h-8" />
          </div>
          <span className="text-xs font-medium">Add cover photos</span>
        </Link>
      )}

      {/* Scroll Down Indicator */}
      <motion.button
        onClick={onScrollDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/30 hover:text-white/50 transition-colors"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Explore</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </motion.button>
    </div>
  );
}
