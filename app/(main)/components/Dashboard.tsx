'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, Calendar, Loader2, Heart, MapPin } from 'lucide-react';
import { CountdownWidget } from '@/(main)/profile/components/CountdownWidget';
import { JournalCard } from '@/(main)/timeline/components/JournalCard';
import { LoveNoteCard } from '@/(main)/timeline/components/LoveNoteCard';
import { EditMemoryModal } from '@/(main)/timeline/components/EditMemoryModal';
import { CommentsPanel } from '@/(main)/timeline/components/CommentsPanel';
import { MemoryDetailModal } from '@/(main)/timeline/components/MemoryDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';

interface MediaItem {
    id: string;
    storage_url: string;
    storage_key: string;
    filename: string;
    file_type: string;
    date_taken?: string;
    place_name?: string;
}

interface MemoryGroup {
    id: string;
    title?: string;
    description?: string;
    date_taken?: string;
    created_at: string;
    media_items?: MediaItem[];
    creator_name?: string;
    creator_avatar_url?: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const { currentLocket, loading: locketLoading } = useLocket();

    // Modal states
    const [editingMemory, setEditingMemory] = useState<MemoryGroup | null>(null);
    const [commentingMemory, setCommentingMemory] = useState<{ id: string; title: string } | null>(null);
    const [viewingMemory, setViewingMemory] = useState<MemoryGroup | null>(null);
    const [viewingMemoryLike, setViewingMemoryLike] = useState({ isLiked: false, likeCount: 0 });
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEditSaved = () => {
        setRefreshKey(prev => prev + 1);
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

    if (locketLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!currentLocket) {
        return (
            <div className="min-h-screen pb-20 md:pb-8 bg-background-light flex flex-col items-center justify-center p-4">
                <div className="max-w-md text-center">
                    {/* Welcome Animation */}
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-rose-200 rounded-full animate-pulse" />
                        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-rose-200 border-2 border-white" />
                                <div className="w-8 h-8 rounded-full bg-indigo-200 border-2 border-white" />
                            </div>
                        </div>
                    </div>

                    <h1 className="font-heading text-3xl text-primary mb-2">Welcome to Twofold</h1>
                    <p className="text-lg text-truffle mb-1">Hey, {user?.displayName?.split(' ')[0] || 'there'}!</p>
                    <p className="text-muted-foreground mb-8">
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
                                <div className="w-full border-t border-rose-100" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-background-light px-4 text-sm text-muted-foreground">or</span>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Have an invite code? Enter it on the invite page or ask your partner to share their link.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate days together from anniversary date
    const daysTogether = currentLocket.anniversary_date
        ? Math.floor((Date.now() - new Date(currentLocket.anniversary_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Determine target date (Anniversary or next countdown or default)
    // Default to New Year if nothing set
    const targetDate = currentLocket.next_countdown_date
        ? new Date(currentLocket.next_countdown_date)
        : currentLocket.anniversary_date
            ? new Date(new Date().getFullYear() + (new Date(currentLocket.anniversary_date).setFullYear(new Date().getFullYear()) < Date.now() ? 1 : 0), new Date(currentLocket.anniversary_date).getMonth(), new Date(currentLocket.anniversary_date).getDate())
            : null;

    const countdownTitle = currentLocket.next_countdown_event_name || (currentLocket.anniversary_date ? "Anniversary" : "Next Milestone");

    return (
        <div className="min-h-screen pb-20 md:pb-8 bg-background-light">
            <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">

                {/* Days Together Badge */}
                {daysTogether !== null && daysTogether > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="bg-primary/10 rounded-full px-4 py-2 flex items-center gap-2">
                            <Heart className="w-4 h-4 text-primary fill-primary" />
                            <span className="font-heading text-lg font-bold text-primary">{daysTogether.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">days together</span>
                        </div>
                        {currentLocket.location_origin && (
                            <div className="bg-truffle/5 rounded-full px-4 py-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-truffle" />
                                <span className="text-sm text-truffle">{currentLocket.location_origin}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Welcome Header */}
                <header className="mb-6 md:mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="font-heading text-2xl md:text-4xl text-primary font-bold">Good Morning, {user?.displayName?.split(' ')[0] || 'Love'}</h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-1">Here's what's happening in <strong>{currentLocket.name}</strong> today.</p>
                    </div>
                    <Link href="/upload" className="hidden md:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors">
                        <Plus size={18} />
                        <span>Add Memory</span>
                    </Link>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Left Column: Widgets (Horizontal Scroll on Mobile) */}
                    <div className="md:col-span-5">
                        {/* Mobile: Horizontal Scroll Container */}
                        <div className="flex md:block overflow-x-auto pb-4 md:pb-0 gap-4 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:space-y-6 no-scrollbar">

                            {/* Countdown Widget */}
                            <div className="min-w-[85%] md:min-w-0 snap-center">
                                {targetDate ? (
                                    <CountdownWidget targetDate={targetDate} title={countdownTitle} />
                                ) : (
                                    <div className="bg-gradient-to-br from-primary to-rose-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[200px]">
                                        <p className="font-heading text-xl mb-2">Set a Date</p>
                                        <p className="text-rose-100 text-sm mb-4">Add your anniversary or next trip to see a countdown here.</p>
                                        <Link href="/settings" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                                            Configure Locket
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* On This Day Widget (Placeholder/Future) */}
                            <div className="min-w-[85%] md:min-w-0 snap-center bg-white rounded-2xl p-5 shadow-sm border border-rose-100 h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-heading text-lg font-bold text-truffle flex items-center gap-2">
                                        <Calendar size={18} className="text-primary" />
                                        On This Day
                                    </h3>
                                </div>
                                <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-50/50 text-center py-8">
                                    <p className="text-muted-foreground text-sm">No memories from previous years today.</p>
                                </div>
                            </div>

                            {/* Quick Bucket List Widget */}
                            <div className="min-w-[85%] md:min-w-0 snap-center bg-gradient-to-br from-[#FDF6F7] to-white rounded-2xl p-5 shadow-sm border border-rose-100 h-full">
                                <BucketListWidget locketId={currentLocket.id} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <Link href="/upload" className="md:hidden fixed bottom-20 right-4 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center animate-in zoom-in duration-300">
                        <Plus size={24} />
                    </Link>

                    <RecentMemories
                        key={refreshKey}
                        locketId={currentLocket.id}
                        onEdit={setEditingMemory}
                        onComment={(id, title) => setCommentingMemory({ id, title })}
                        onView={handleViewMemory}
                    />

                </div>
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
                        place_name: m.place_name
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
        </div>
    );
}

function BucketListWidget({ locketId }: { locketId: string }) {
    const [items, setItems] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchItems() {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/bucket-list?locketId=${locketId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Take top 3 active items
                    const activeItems = (data.items || [])
                        .filter((i: any) => i.status === 'active')
                        .slice(0, 3);
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

    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-truffle">Bucket List</h3>
                <Link href="/lists" className="text-xs font-bold text-primary hover:underline flex items-center">
                    View <ArrowRight size={10} className="ml-0.5" />
                </Link>
            </div>
            {loading ? (
                <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            ) : items.length > 0 ? (
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-sm border-2 border-rose-200 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                    <p>No dreams added yet.</p>
                </div>
            )}
        </>
    );
}

interface RecentMemoriesProps {
    locketId: string;
    onEdit: (group: MemoryGroup) => void;
    onComment: (id: string, title: string) => void;
    onView: (group: MemoryGroup) => void;
}

function RecentMemories({ locketId, onEdit, onComment, onView }: RecentMemoriesProps) {
    const [memories, setMemories] = React.useState<MemoryGroup[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function fetchMemories() {
            try {
                const { getCurrentUserToken } = await import('@/lib/firebase/auth');
                const token = await getCurrentUserToken();

                const res = await fetch(`/api/memory-groups?locketId=${locketId}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setMemories(data.memoryGroups || []);
                }
            } catch (error) {
                console.error("Failed to fetch memories", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMemories();
    }, [locketId]);

    if (loading) return <div className="md:col-span-7 flex justify-center py-12"><Loader2 className="animate-spin text-primary/50" /></div>;

    if (memories.length === 0) {
        return (
            <div className="md:col-span-7">
                <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
                    <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
                </div>
                <div className="bg-white rounded-2xl p-8 text-center border dashed border-rose-200">
                    <p className="text-muted-foreground mb-4">No memories yet.</p>
                    <Link href="/upload" className="text-primary font-medium hover:underline">Start adding some!</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="md:col-span-7">
            <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
                <h2 className="font-heading text-xl md:text-2xl text-truffle">Recent Memories</h2>
                <Link href="/timeline" className="text-sm text-primary font-medium hover:underline">View Timeline</Link>
            </div>

            <div className="space-y-4">
                {memories.map((group) => {
                    const hasMedia = group.media_items && group.media_items.length > 0;
                    const creatorInitial = group.creator_name?.charAt(0).toUpperCase() || '?';

                    if (!hasMedia) {
                        // This is a love note (no media)
                        return (
                            <div key={group.id}>
                                <LoveNoteCard
                                    date={new Date(group.created_at).toLocaleDateString()}
                                    note={group.description || group.title || 'A sweet note'}
                                    authorInitial={creatorInitial}
                                    authorAvatarUrl={group.creator_avatar_url}
                                    className="w-full max-w-full"
                                />
                            </div>
                        );
                    }

                    return (
                        <div key={group.id}>
                            <JournalCard
                                id={group.id}
                                date={new Date(group.date_taken || group.created_at).toLocaleDateString()}
                                location={group.media_items?.[0]?.place_name || undefined}
                                imageUrl={group.media_items?.[0]?.storage_url}
                                caption={group.title || group.description || ''}
                                likes={0}
                                mediaItems={group.media_items}
                                className="w-full max-w-full"
                                onEdit={() => onEdit(group)}
                                onComment={() => onComment(group.id, group.title || 'Memory')}
                                onImageClick={() => onView(group)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
