'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ImmersiveHome } from './dashboard/ImmersiveHome';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';

export default function Dashboard() {
    const { user } = useAuth();
    const { currentLocket, loading: locketLoading } = useLocket();

    if (locketLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#221016]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!currentLocket) {
        return (
            <div className="min-h-screen pb-20 md:pb-8 bg-[#221016] flex flex-col items-center justify-center p-4">
                <div className="max-w-md text-center">
                    {/* Welcome Animation */}
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full animate-pulse" />
                        <div className="absolute inset-2 bg-[#2a161e] rounded-full flex items-center justify-center border border-white/[0.08]">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-primary/30 border-2 border-[#2a161e]" />
                                <div className="w-8 h-8 rounded-full bg-gold/30 border-2 border-[#2a161e]" />
                            </div>
                        </div>
                    </div>

                    <h1 className="font-heading text-3xl text-white mb-2">Welcome to Twofold</h1>
                    <p className="text-lg text-white/60 mb-1">Hey, {user?.displayName?.split(' ')[0] || 'there'}!</p>
                    <p className="text-white/40 mb-8">
                        Your digital locket awaits. Create one to start capturing your story together.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/locket-create"
                            className="block w-full bg-primary text-white px-6 py-4 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
                        >
                            Create Your Locket
                        </Link>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/[0.08]" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-[#221016] px-4 text-sm text-white/40">or</span>
                            </div>
                        </div>

                        <p className="text-sm text-white/30">
                            Have an invite code? Enter it on the invite page or ask your partner to share their link.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Render ImmersiveHome with locket and user
    return (
        <ImmersiveHome
            locket={currentLocket}
            user={{
                uid: user?.uid || '',
                displayName: user?.displayName
            }}
        />
    );
}
