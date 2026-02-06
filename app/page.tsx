'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/(main)/components/Dashboard';
import { Navigation } from '@/components/Navigation';

export default function HomePage() {
    const { user, loading: authLoading, signInWithGoogle } = useAuth();
    const { currentLocket, userLockets, loading: locketLoading } = useLocket();
    const router = useRouter();
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            // Auth context will update, component will re-render
        } catch (error) {
            console.error('Login failed', error);
            setIsLoading(false);
        }
    };

    // Show loading state while checking auth status
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#221016]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        );
    }

    // Authenticated user - show Dashboard or redirect to locket-create
    if (user) {
        // Still loading locket data
        if (locketLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#221016]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-white/60">Loading your locket...</p>
                    </div>
                </div>
            );
        }

        // User has no locket - redirect to create page
        if (!currentLocket && userLockets.length === 0) {
            router.replace('/locket-create');
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#221016]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-white/60">Setting up your locket...</p>
                    </div>
                </div>
            );
        }

        // User has a locket - show Dashboard with Navigation
        return (
            <div className="min-h-screen bg-[#221016] text-white flex flex-col md:flex-row">
                <Navigation />
                <main className="flex-1 pb-20 md:pb-0 md:pl-64 min-h-screen relative">
                    <Dashboard />
                </main>
            </div>
        );
    }

    // Unauthenticated - show landing page

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteCode) {
            const code = inviteCode.split('/').pop();
            router.push(`/invite/${code}`);
        }
    };

    // NYC Map Tiles (Zoom 14, Centered on Manhattan)
    // Center Tile: x=4824, y=6156
    const mapTiles = [
        { x: 4823, y: 6155 }, { x: 4824, y: 6155 }, { x: 4825, y: 6155 },
        { x: 4823, y: 6156 }, { x: 4824, y: 6156 }, { x: 4825, y: 6156 },
        { x: 4823, y: 6157 }, { x: 4824, y: 6157 }, { x: 4825, y: 6157 },
    ];

    return (
        <div className="h-screen w-full overflow-hidden bg-background dark:bg-background-dark text-foreground dark:text-white font-display antialiased selection:bg-primary selection:text-white">
            <div className="h-full w-full flex flex-row md:flex-col overflow-x-auto md:overflow-x-hidden overflow-y-hidden md:overflow-y-auto snap-x md:snap-y snap-mandatory no-scrollbar scroll-smooth">

                {/* Hero Section */}
                <div className="snap-start w-screen h-screen shrink-0 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA')" }}></div>
                    <div className="absolute inset-0 bg-[#221016]/40 mix-blend-multiply"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#221016] via-transparent to-[#221016]/20 opacity-80"></div>
                    <div className="relative z-10 text-center px-6 max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-1000">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 shadow-[0_0_30px_rgba(186,74,104,0.3)]">
                                <span className="material-symbols-outlined text-4xl">favorite</span>
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 drop-shadow-xl">
                            A Digital Locket <br /><span className="text-primary">for Two.</span>
                        </h1>
                        <p className="text-xl text-white/80 font-medium max-w-lg mx-auto leading-relaxed drop-shadow-md">
                            Your private sanctuary to cherish moments, map your journey, and grow together.
                        </p>
                    </div>

                    {/* Arrow Indicator: Right for Mobile, Down for Desktop */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden animate-bounce-right z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">arrow_forward_ios</span>
                    </div>
                    <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">keyboard_arrow_down</span>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="snap-start w-screen h-screen shrink-0 relative flex items-center justify-center overflow-hidden bg-[#221016]">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 blur-sm scale-110" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA')" }}></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#221016] via-[#221016]/80 to-[#221016]"></div>
                    <div className="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="text-left order-2 md:order-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-bold uppercase tracking-wider mb-6 border border-accent/20">
                                <span className="material-symbols-outlined text-lg">history</span> Timeline
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                                Chronicle your <br /> lives together.
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed max-w-md">
                                Every date, every milestone, every small moment. Weaved into a beautiful tapestry of your shared history.
                            </p>
                        </div>
                        <div className="relative h-[500px] flex justify-center items-start pt-12 order-1 md:order-2">
                            <div className="absolute w-1 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full opacity-30 left-1/2 -translate-x-1/2"></div>
                            <div className="flex flex-col gap-12 items-center w-full relative z-10">
                                <div className="flex items-center gap-4 w-full justify-center scale-110">
                                    <div className="w-32 text-right text-accent font-mono font-bold">Today</div>
                                    <div className="w-5 h-5 rounded-full bg-white border-4 border-primary shadow-[0_0_20px_theme(colors.primary)] shrink-0 z-20"></div>
                                    <div className="w-48 bg-[#331922] p-4 rounded-xl border border-primary/30 shadow-xl">
                                        <div className="flex gap-2 mb-2">
                                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs">📸</div>
                                            <div className="flex-1 space-y-1">
                                                <div className="text-xs text-white font-medium">Trip to Paris</div>
                                                <div className="h-1.5 w-12 bg-white/10 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="h-24 w-full bg-primary/10 rounded overflow-hidden relative">
                                            <img className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA" alt="Paris" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full justify-center opacity-70">
                                    <div className="w-32 text-right text-slate-400 font-mono text-sm">Dec 2023</div>
                                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_theme(colors.primary)] shrink-0"></div>
                                    <div className="w-32 bg-[#331922] p-3 rounded-lg border border-[#673244]">
                                        <div className="text-xs text-slate-300 mb-1">Anniversary</div>
                                        <div className="h-2 w-20 bg-white/10 rounded"></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full justify-center opacity-40 scale-90">
                                    <div className="w-32 text-right text-slate-400 font-mono text-sm">Oct 2021</div>
                                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_theme(colors.primary)] shrink-0"></div>
                                    <div className="w-32 bg-[#331922] p-3 rounded-lg border border-[#673244]">
                                        <div className="h-2 w-16 bg-white/10 rounded mb-2"></div>
                                        <div className="h-12 w-full bg-white/5 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden animate-bounce-right z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">arrow_forward_ios</span>
                    </div>
                    <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">keyboard_arrow_down</span>
                    </div>
                </div>

                {/* Map/Discovery Section */}
                <div className="snap-start w-screen h-screen shrink-0 relative flex items-center justify-center overflow-hidden bg-[#221016]">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA')" }}></div>
                    <div className="absolute inset-0 bg-[#221016]/90"></div>
                    <div className="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="relative h-[450px] w-full bg-[#fdf6f7] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group order-2 md:order-1 ring-1 ring-white/5">

                            {/* Realistic Map Background using Tiles */}
                            <div className="absolute inset-0 w-full h-full bg-[#e3e3e3] grid grid-cols-3 grid-rows-3 opacity-90">
                                {mapTiles.map((tile, i) => (
                                    <img
                                        key={i}
                                        src={`https://a.basemaps.cartocdn.com/rastertiles/voyager/14/${tile.x}/${tile.y}.png`}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
                            </div>

                            <div className="absolute top-[38%] left-[58%] -translate-x-1/2 group/pin cursor-pointer z-10">
                                <div className="relative flex flex-col items-center">
                                    <span className="material-symbols-outlined text-[#4CAF50] text-4xl drop-shadow-xl group-hover/pin:scale-110 transition-transform duration-300">location_on</span>
                                    <div className="opacity-100 absolute -top-8 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">Central Park</div>
                                </div>
                            </div>
                            <div className="absolute top-[55%] left-[48%] group/pin cursor-pointer z-10 delay-75">
                                <div className="relative flex flex-col items-center">
                                    <span className="material-symbols-outlined text-primary text-4xl drop-shadow-xl group-hover/pin:scale-110 transition-transform duration-300">star</span>
                                    <div className="opacity-0 group-hover/pin:opacity-100 absolute -top-8 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Times Square</div>
                                </div>
                            </div>
                            <div className="absolute bottom-[20%] right-[10%] group/pin cursor-pointer z-10 delay-150">
                                <div className="relative flex flex-col items-center">
                                    <span className="material-symbols-outlined text-accent text-4xl drop-shadow-xl group-hover/pin:scale-110 transition-transform duration-300">location_on</span>
                                    <div className="opacity-0 group-hover/pin:opacity-100 absolute -top-8 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Brooklyn Bridge</div>
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4 z-20">
                                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">map</span>
                                    <span className="text-xs text-slate-700 font-mono tracking-wide">NYC MAP</span>
                                </div>
                            </div>
                            <div className="absolute bottom-1 right-1 z-20 text-[8px] text-slate-400 opacity-60 px-2 bg-white/50 rounded">
                                © Leaflet | © OpenStreetMap | © CARTO
                            </div>
                        </div>
                        <div className="text-left order-1 md:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-6 border border-primary/20">
                                <span className="material-symbols-outlined text-lg">explore</span> Discovery
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                                Explore your <br /> path.
                            </h2>
                            <p className="text-xl text-slate-300 leading-relaxed max-w-md">
                                Map out your favorite spots, dream destinations, and the places where your story unfolded.
                            </p>
                        </div>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden animate-bounce-right z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">arrow_forward_ios</span>
                    </div>
                    <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
                        <span className="material-symbols-outlined text-white/50 text-4xl">keyboard_arrow_down</span>
                    </div>
                </div>

                {/* Login/Signup Section */}
                <div className="snap-start w-screen h-screen shrink-0 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-110" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBfGZEUHQR6iriogrUa456GIpjsbWO3gQhXcCF9ns4X4Zlw3JfXc5YA0s8hqKqcEEUcsioBfZWtE63MHPYJG8XGFzyvqL0wr4L-Bx6i9g0FTxnsiRmqq6VpNmdTUotPMYXj19Ym6yd8fZvpVFugzBSmy61EJcRb79JF-_n_IXh3TV3g5RPo1bjbpxqeXjOjh46120YCUUWpbL0fHehVrxaFo_7E8y4QdTlJifmpHs9A18b3p5z7hGqZcqleYtpBPdF0rmqmCyshwyA')" }}></div>
                    <div className="absolute inset-0 bg-[#221016]/60 backdrop-blur-sm"></div>
                    <div className="relative z-10 w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="bg-white/95 dark:bg-[#2a161e]/95 backdrop-blur-xl border border-slate-200 dark:border-[#673244]/50 rounded-2xl shadow-2xl p-8 md:p-10 text-center">
                            <div className="flex flex-col items-center gap-4 mb-8">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                                    <span className="material-symbols-outlined text-3xl">favorite</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Twofold</h2>
                                <p className="text-slate-500 dark:text-slate-400">Your shared world awaits.</p>
                            </div>

                            <div className="flex flex-col gap-6">
                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading}
                                    className="group flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-6 bg-white dark:bg-[#331922] border border-slate-200 dark:border-[#673244] hover:bg-slate-50 dark:hover:bg-[#4a2431] hover:border-slate-300 dark:hover:border-primary/30 text-slate-700 dark:text-white text-base font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <span className="animate-spin material-symbols-outlined">progress_activity</span>
                                    ) : (
                                        <>
                                            <svg className="h-6 w-6 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"></path>
                                                <path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"></path>
                                                <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.652-3.342-11.303-8l-6.571,4.827C9.655,39.664,16.318,44,24,44z" fill="#4CAF50"></path>
                                                <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"></path>
                                            </svg>
                                            <span>Sign In with Google</span>
                                        </>
                                    )}
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-slate-200 dark:border-[#673244]"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Or</span>
                                    <div className="flex-grow border-t border-slate-200 dark:border-[#673244]"></div>
                                </div>

                                <form onSubmit={handleJoin} className="space-y-3 text-center">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="invite-link">Have an invite link?</label>
                                    <div className="relative">
                                        <input
                                            id="invite-link"
                                            type="text"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value)}
                                            placeholder="Paste your link here..."
                                            className="w-full bg-slate-50 dark:bg-[#331922] border-slate-200 dark:border-[#673244] rounded-xl px-4 py-3.5 pl-11 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                        />
                                        <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500 text-[20px]">link</span>
                                        <button
                                            type="submit"
                                            className="absolute right-2 top-2 bottom-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Join
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <p className="mt-8 text-center text-white/40 text-sm">
                                By joining, you agree to our Terms of Service & Privacy Policy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
