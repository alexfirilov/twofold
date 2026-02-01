'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
    label: string;
    href: string;
    icon: string;
    primary?: boolean;
}

export function Navigation() {
    const pathname = usePathname();

    const navItems: NavItem[] = [
        {
            label: 'Home',
            href: '/',
            icon: 'home',
        },
        {
            label: 'Timeline',
            href: '/timeline',
            icon: 'favorite',
        },
        {
            label: 'Upload',
            href: '/upload',
            icon: 'add_circle',
            primary: true,
        },
        {
            label: 'Journey',
            href: '/journey',
            icon: 'map',
        },
        {
            label: 'Profile',
            href: '/profile',
            icon: 'person',
        },
    ];

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a0d12]/95 backdrop-blur-xl border-t border-[#673244]/50 pb-safe md:hidden">
                <div className="flex justify-between items-end h-16 px-4 pb-2 relative">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

                        if (item.primary) {
                            return (
                                <div key={item.href} className="relative -top-5 mx-auto">
                                    <Link
                                        href={item.href}
                                        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 border-4 border-[#221016] transition-transform active:scale-95"
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                                        >
                                            {item.icon}
                                        </span>
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-14 space-y-1 transition-colors duration-200 py-1",
                                    isActive
                                        ? "text-primary font-medium"
                                        : "text-white/40 hover:text-primary/70"
                                )}
                            >
                                <span
                                    className={cn("material-symbols-outlined transition-transform duration-300", isActive && "scale-110")}
                                    style={{
                                        fontSize: '24px',
                                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"
                                    }}
                                >
                                    {item.icon}
                                </span>
                                <span className={cn("text-[10px] tracking-wide transition-opacity", isActive ? "opacity-100" : "opacity-80")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Sidebar Navigation */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[#1a0d12] border-r border-[#673244]/50 p-6 z-50">
                <div className="mb-10 pl-2 flex items-center gap-2">
                    <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                    >
                        favorite
                    </span>
                    <h1 className="font-heading text-3xl text-white font-bold">Twofold</h1>
                </div>

                <div className="space-y-2 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary/20 text-primary font-medium"
                                        : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <span
                                    className={cn("material-symbols-outlined transition-transform group-hover:scale-110", isActive && "text-primary")}
                                    style={{
                                        fontSize: '22px',
                                        fontVariationSettings: isActive && !item.primary ? "'FILL' 1" : "'FILL' 0"
                                    }}
                                >
                                    {item.icon}
                                </span>
                                <span className="text-base">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
