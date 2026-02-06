'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WidgetCarouselProps {
  children: React.ReactNode;
}

export function WidgetCarousel({ children }: WidgetCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.85;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative group">
      {/* Scroll Buttons (Desktop) */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md shadow-lg border border-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100 group-hover:-translate-x-1"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md shadow-lg border border-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth no-scrollbar"
      >
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className="min-w-[75%] sm:min-w-[60%] md:min-w-[calc(33.333%-8px)] snap-start flex-shrink-0"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
