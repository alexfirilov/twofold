'use client';

import React from 'react';
import { Cloud, Sun } from 'lucide-react';

interface WeatherWidgetProps {
  location?: string;
}

export function WeatherWidget({ location = 'Your City' }: WeatherWidgetProps) {
  return (
    <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-sky-400/20 flex items-center justify-center">
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-300/80">Weather</span>
        </div>

        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Cloud className="w-8 h-8 text-sky-300/60" />
            <span className="text-3xl font-bold text-white">--</span>
          </div>
          <p className="text-sm text-white/50">{location}</p>
          <p className="text-xs text-white/30 mt-2">Weather integration coming soon</p>
        </div>
      </div>
    </div>
  );
}
