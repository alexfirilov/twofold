'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { JournalCard } from './JournalCard';
import { LoveNoteCard } from './LoveNoteCard';
import { EditMemoryModal } from './EditMemoryModal';
import { CommentsPanel } from './CommentsPanel';
import { MemoryDetailModal } from './MemoryDetailModal';
import { Loader2 } from 'lucide-react';
import { useLocket } from '@/contexts/LocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface MediaItem {
    id: string;
    storage_url: string;
    storage_key: string;
    filename: string;
    file_type: string;
    date_taken?: string;
    place_name?: string;
    latitude?: number;
    longitude?: number;
}

interface MemoryGroup {
    id: string;
    title?: string;
    description?: string;
    date_taken?: string;
    created_at: string;
    is_milestone?: boolean;
    media_items?: MediaItem[];
    creator_name?: string;
    creator_avatar_url?: string;
}

type JournalItem = {
    id: string;
    type: 'journal';
    date: string;
    location?: string;
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    likes: number;
    isLiked: boolean;
    comments?: number;
    authorName?: string;
    authorAvatarUrl?: string;
    mediaItems: MediaItem[];
    rawGroup: MemoryGroup;
};

type NoteItem = {
    id: string;
    type: 'note';
    date: string;
    authorInitial?: string;
    authorName?: string;
    authorAvatarUrl?: string;
    note: string;
    rawGroup: MemoryGroup;
};

type TimelineItem = JournalItem | NoteItem;

interface LocketMember {
    id: string;
    display_name?: string;
    avatar_url?: string;
    firebase_uid: string;
}

export function TimelineFeed() {
    const { currentLocket } = useLocket();
    const { user } = useAuth();
    const [items, setItems] = React.useState<TimelineItem[]>([]);
    const [members, setMembers] = React.useState<LocketMember[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Modal state
    const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
    const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
    const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
    const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });

    const fetchData = React.useCallback(async () => {
        if (!currentLocket || !user) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const [membersRes, timelineRes] = await Promise.all([
                fetch(`/api/lockets/${currentLocket.id}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/memory-groups?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (membersRes.ok) {
                const membersData = await membersRes.json();
                setMembers(membersData.users || []);
            }

            if (timelineRes.ok) {
                const data = await timelineRes.json();
                const memoryGroups = data.memoryGroups || [];

                const mappedItems: TimelineItem[] = memoryGroups.map((group: MemoryGroup) => {
                    const hasMedia = group.media_items && group.media_items.length > 0;
                    const creatorName = group.creator_name || '';
                    const creatorAvatar = group.creator_avatar_url || '';
                    const authorInitial = creatorName ? creatorName.charAt(0).toUpperCase() : '?';

                    if (hasMedia) {
                        const firstMedia = group.media_items![0];
                        return {
                            id: group.id,
                            type: 'journal',
                            date: new Date(firstMedia.date_taken || group.date_taken || group.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            location: firstMedia.place_name,
                            imageUrl: firstMedia.storage_url,
                            caption: group.title || group.description || '',
                            likes: 0,
                            isLiked: false,
                            comments: 0,
                            authorName: creatorName,
                            authorAvatarUrl: creatorAvatar,
                            mediaItems: group.media_items!,
                            rawGroup: group
                        } as JournalItem;
                    } else {
                        return {
                            id: group.id,
                            type: 'note',
                            date: new Date(group.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }),
                            authorInitial,
                            authorName: creatorName,
                            authorAvatarUrl: creatorAvatar,
                            note: group.description || group.title || 'No content',
                            rawGroup: group
                        } as NoteItem;
                    }
                });
                setItems(mappedItems);
            }
        } catch (err) {
            console.error("Error fetching timeline", err);
        } finally {
            setLoading(false);
        }
    }, [currentLocket, user]);

    React.useEffect(() => {
        if (currentLocket) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [currentLocket, fetchData]);

    const handleEditSaved = () => {
        fetchData();
    };

    const handleViewMemory = async (group: MemoryGroup) => {
        setViewingMemory(group);

        if (currentLocket) {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/memory-groups/${group.id}/like?locketId=${currentLocket.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
                }
            } catch (error) {
                console.error('Failed to fetch like status:', error);
            }
        }
    };

    const handleViewMemoryLike = async () => {
        if (!viewingMemory || !currentLocket) return;

        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            const res = await fetch(`/api/memory-groups/${viewingMemory.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ locket_id: currentLocket.id })
            });

            if (res.ok) {
                const data = await res.json();
                setViewingMemoryLike({ isLiked: data.liked, likeCount: data.likeCount });
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#221016]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#221016] relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#221016] via-[#2a161e] to-[#221016]" />

                {/* Subtle timeline line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
                    {/* Header avatars */}
                    <div className="relative mb-6">
                        <div className="flex -space-x-4">
                            {members.length > 0 ? (
                                members.slice(0, 2).map((member, index) => (
                                    member.avatar_url ? (
                                        <div key={member.id} className="w-16 h-16 rounded-full border-4 border-[#221016] overflow-hidden relative ring-2 ring-primary/30">
                                            <Image
                                                src={member.avatar_url}
                                                alt={member.display_name || 'Partner'}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            key={member.id}
                                            className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary font-serif text-xl ring-2 ring-primary/30"
                                        >
                                            {member.display_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    )
                                ))
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary/50 ring-2 ring-primary/30">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary/50 ring-2 ring-primary/30">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#331922] px-3 py-1 rounded-full border border-[#673244] flex items-center gap-1.5 whitespace-nowrap">
                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Together Forever</span>
                        </div>
                    </div>

                    <h1 className="font-serif italic text-4xl text-white mb-3">Our Timeline</h1>
                    <p className="text-white/40 text-sm mb-8">{currentLocket?.name || 'Your Story'}</p>

                    <div className="glass-card p-8 rounded-2xl max-w-sm">
                        <span className="material-symbols-outlined text-5xl text-white/20 mb-4 block">photo_library</span>
                        <p className="text-white/60 mb-2">No memories yet</p>
                        <p className="text-white/40 text-sm">Time to make some memories!</p>
                    </div>
                </div>

                <style jsx>{`
                    .glass-card {
                        background: rgba(42, 22, 30, 0.75);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#221016] relative overflow-x-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#221016] via-[#2a161e] to-[#221016] pointer-events-none" />

            {/* Central timeline line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                <div className="absolute inset-0 bg-primary/20 blur-sm" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8">

                {/* Header Section */}
                <div className="flex flex-col items-center justify-center mb-16 pt-8">
                    <div className="relative mb-6">
                        <div className="flex -space-x-4">
                            {members.length > 0 ? (
                                members.slice(0, 2).map((member, index) => (
                                    member.avatar_url ? (
                                        <div key={member.id} className="w-16 h-16 rounded-full border-4 border-[#221016] overflow-hidden relative ring-2 ring-primary/30 shadow-lg shadow-primary/20">
                                            <Image
                                                src={member.avatar_url}
                                                alt={member.display_name || 'Partner'}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            key={member.id}
                                            className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary font-serif text-xl ring-2 ring-primary/30 shadow-lg shadow-primary/20"
                                        >
                                            {member.display_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    )
                                ))
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary/50 ring-2 ring-primary/30">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div className="w-16 h-16 rounded-full border-4 border-[#221016] bg-[#331922] flex items-center justify-center text-primary/50 ring-2 ring-primary/30">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#331922] px-3 py-1 rounded-full border border-[#673244] flex items-center gap-1.5 whitespace-nowrap shadow-lg">
                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Together Forever</span>
                        </div>
                    </div>
                    <h1 className="font-serif italic text-4xl md:text-5xl text-white mb-3 text-center">Our Timeline</h1>
                    <p className="text-white/40 text-sm tracking-wide">{currentLocket?.name || 'Our Story'}</p>
                </div>

                {/* Timeline Items */}
                <div className="space-y-12 md:space-y-20 relative">
                    {items.map((item, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <div
                                key={item.id}
                                className={`flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} gap-8 md:gap-12`}
                                style={{
                                    animation: `fadeSlideIn 0.6s ease-out ${index * 0.1}s both`
                                }}
                            >
                                {/* Content Card */}
                                <div className="w-full md:w-5/12 flex justify-center">
                                    {item.type === 'journal' ? (
                                        <JournalCard
                                            id={item.id}
                                            date={item.date}
                                            location={item.location}
                                            imageUrl={item.imageUrl}
                                            caption={item.caption}
                                            likes={item.likes}
                                            isLiked={item.isLiked}
                                            comments={item.comments}
                                            authorAvatarUrl={item.authorAvatarUrl}
                                            mediaItems={item.mediaItems}
                                            align={isEven ? 'right' : 'left'}
                                            className="transform-gpu"
                                            onEdit={() => setEditingMemory(item.rawGroup)}
                                            onComment={() => setCommentingMemory({
                                                id: item.id,
                                                title: item.caption || 'Memory'
                                            })}
                                            onImageClick={() => handleViewMemory(item.rawGroup)}
                                        />
                                    ) : (
                                        <LoveNoteCard
                                            {...item}
                                            align={isEven ? 'right' : 'left'}
                                            className="transform-gpu"
                                        />
                                    )}
                                </div>

                                {/* Center Marker on Timeline */}
                                <div className="hidden md:flex w-2/12 justify-center relative">
                                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-[#221016] shadow-lg shadow-primary/50 z-10 animate-pulse" />
                                    <div className="absolute top-8 text-xs font-bold text-white/40 bg-[#331922]/80 px-2 py-0.5 rounded-full border border-[#673244]/50">
                                        {item.date.split(',')[0]}
                                    </div>
                                </div>

                                {/* Empty Space for Balance */}
                                <div className="hidden md:block w-5/12" />
                            </div>
                        );
                    })}
                </div>

                {/* Load More Indicator */}
                {items.length > 5 && (
                    <div className="mt-20 flex justify-center pb-20">
                        <div className="h-10 w-1 rounded-full bg-gradient-to-b from-primary/50 to-transparent" />
                    </div>
                )}
            </div>

            {/* Edit Memory Modal */}
            {editingMemory && (
                <EditMemoryModal
                    isOpen={true}
                    onClose={() => setEditingMemory(null)}
                    memoryId={editingMemory.id}
                    initialTitle={editingMemory.title || ''}
                    initialDescription={editingMemory.description}
                    initialDate={editingMemory.date_taken ? editingMemory.date_taken.split('T')[0] : undefined}
                    mediaItems={editingMemory.media_items?.map(m => ({
                        id: m.id,
                        storage_url: m.storage_url,
                        storage_key: m.storage_key,
                        filename: m.filename,
                        file_type: m.file_type,
                        date_taken: m.date_taken,
                        place_name: m.place_name,
                        latitude: m.latitude,
                        longitude: m.longitude
                    }))}
                    onSaved={handleEditSaved}
                />
            )}

            {/* Comments Panel */}
            {commentingMemory && (
                <CommentsPanel
                    isOpen={true}
                    onClose={() => setCommentingMemory(null)}
                    memoryId={commentingMemory.id}
                    memoryTitle={commentingMemory.title}
                />
            )}

            {/* Memory Detail Modal */}
            {viewingMemory && (
                <MemoryDetailModal
                    isOpen={true}
                    onClose={() => setViewingMemory(null)}
                    memory={viewingMemory}
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

            {/* Animation keyframes */}
            <style jsx global>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
