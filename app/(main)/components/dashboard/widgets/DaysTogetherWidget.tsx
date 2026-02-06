'use client';

import React from 'react';
import { Heart, MapPin } from 'lucide-react';

interface DaysTogetherWidgetProps {
  daysTogether: number;
  anniversaryDate: Date;
  locationOrigin?: string;
}

export function DaysTogetherWidget({ daysTogether, anniversaryDate, locationOrigin }: DaysTogetherWidgetProps) {
  const formattedDate = anniversaryDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary fill-primary" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Days Together</span>
        </div>

        <div className="text-center mb-4">
          <span className="text-5xl font-bold font-heading text-white tracking-tight">
            {daysTogether.toLocaleString()}
          </span>
          <p className="text-sm text-white/50 mt-1">days of love</p>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-white/60">
            Since <span className="font-medium text-white/80">{formattedDate}</span>
          </p>

          {locationOrigin && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-white/40">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationOrigin}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
