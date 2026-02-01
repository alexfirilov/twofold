'use client';

import { cn } from '@/lib/utils';
import { Newsreader } from 'next/font/google';

const newsreader = Newsreader({
    subsets: ['latin'],
    style: 'italic',
    variable: '--font-newsreader'
});

interface LoveNoteCardProps {
    date: string;
    note: string;
    authorInitial?: string;
    authorAvatarUrl?: string;
    className?: string;
    align?: 'left' | 'right';
}

export function LoveNoteCard({
    date,
    note,
    authorInitial,
    authorAvatarUrl,
    className,
    align = 'left'
}: LoveNoteCardProps) {
    return (
        <div className={cn("group w-full max-w-md", className)}>
            <div
                className={cn(
                    "relative p-6 rounded-2xl transition-all duration-500",
                    "glass-card-note",
                    "hover:border-[#C8A659] hover:shadow-[0_0_30px_-5px_rgba(200,166,89,0.3)]",
                    "hover:-translate-y-1",
                    align === 'left' ? "rotate-1 hover:rotate-0" : "-rotate-1 hover:rotate-0",
                )}
            >
                {/* Decorative gold accent at top */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-[#C8A659]/60 to-transparent rounded-full" />

                <div className="mb-4 text-center">
                    <span className="text-[10px] tracking-widest uppercase text-white/40 font-medium flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit_note</span>
                        {date}
                    </span>
                </div>

                <div className="relative">
                    <span className="material-symbols-outlined absolute -top-1 -left-1 text-[#C8A659]/30" style={{ fontSize: '24px' }}>format_quote</span>
                    <p className={`${newsreader.className} text-xl md:text-2xl text-white/90 leading-relaxed text-center px-6 py-2`}>
                        {note}
                    </p>
                    <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-[#C8A659]/30 rotate-180" style={{ fontSize: '24px' }}>format_quote</span>
                </div>

                <div className="mt-6 flex justify-center items-center">
                    {authorAvatarUrl ? (
                        <img
                            src={authorAvatarUrl}
                            alt={authorInitial || "User"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#673244] shadow-lg"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[#331922] flex items-center justify-center text-[#C8A659] font-heading font-bold text-sm border border-[#673244]">
                            {authorInitial || (
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
            </div>

            <style jsx>{`
                .glass-card-note {
                    background: rgba(42, 22, 30, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(200, 166, 89, 0.2);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </div>
    );
}
