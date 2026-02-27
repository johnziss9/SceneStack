'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Film, User, Users, BarChart2, Menu, X, Eye, LogIn, UserPlus, Bookmark } from 'lucide-react';

export function Navigation() {
    const { user, loading } = useAuth();
    const { count: watchlistCount } = useWatchlist();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const closeMenu = () => setIsMenuOpen(false);

    // Close menu on Escape key press
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMenu();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    // Focus management: focus first menu item when opening, return focus to button when closing
    useEffect(() => {
        if (isMenuOpen && mobileMenuRef.current) {
            // Focus first focusable element in menu
            const firstFocusable = mobileMenuRef.current.querySelector<HTMLElement>(
                'a, button, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
        } else if (!isMenuOpen && menuButtonRef.current) {
            // Return focus to menu button when closing
            menuButtonRef.current.focus();
        }
    }, [isMenuOpen]);

    // Focus trap: keep focus within mobile menu when open
    useEffect(() => {
        if (!isMenuOpen || !mobileMenuRef.current) return;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !mobileMenuRef.current) return;

            const focusableElements = mobileMenuRef.current.querySelectorAll<HTMLElement>(
                'a, button, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: if on first element, wrap to last
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab: if on last element, wrap to first
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
    }, [isMenuOpen]);

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Brand — always visible */}
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={closeMenu}>
                        <Film className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">SceneStack</span>
                    </Link>

                    {loading ? (
                        <div className="h-9 w-24 bg-muted animate-pulse rounded" />
                    ) : (
                        <>
                            {/* Desktop nav — hidden on mobile */}
                            <div className="hidden md:flex items-center gap-1">
                                {user ? (
                                    <>
                                        <Link href="/watched">
                                            <Button variant="ghost" className="gap-2">
                                                <Eye className="h-4 w-4" />
                                                My Watches
                                            </Button>
                                        </Link>
                                        <Link href="/watchlist">
                                            <Button variant="ghost" className="gap-2 relative">
                                                <Bookmark className="h-4 w-4" />
                                                Watchlist
                                                {watchlistCount > 0 && (
                                                    <Badge variant="default" className="ml-1 px-1.5 py-0 h-5 min-w-[1.25rem] text-[10px]">
                                                        {watchlistCount}
                                                    </Badge>
                                                )}
                                            </Button>
                                        </Link>
                                        <Link href="/groups">
                                            <Button variant="ghost" className="gap-2">
                                                <Users className="h-4 w-4" />
                                                Groups
                                            </Button>
                                        </Link>
                                        <Link href="/stats">
                                            <Button variant="ghost" className="gap-2">
                                                <BarChart2 className="h-4 w-4" />
                                                Stats
                                            </Button>
                                        </Link>
                                        <Link href="/profile">
                                            <Button variant="ghost" className="gap-2">
                                                <User className="h-4 w-4" />
                                                {user.username}
                                            </Button>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login">
                                            <Button variant="ghost">Sign In</Button>
                                        </Link>
                                        <Link href="/register">
                                            <Button>Sign Up</Button>
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Hamburger — visible on mobile only */}
                            <button
                                ref={menuButtonRef}
                                className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={isMenuOpen}
                            >
                                {isMenuOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Backdrop overlay */}
            <div
                className={`
                    fixed inset-0 bg-black/50 md:hidden z-30
                    transition-opacity duration-300 ease-in-out
                    ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                onClick={closeMenu}
                aria-hidden="true"
            />

            {/* Mobile menu dropdown */}
            <div
                ref={mobileMenuRef}
                className={`
                    md:hidden border-t bg-background absolute left-0 right-0 z-40
                    transform transition-all duration-300 ease-in-out origin-top
                    ${isMenuOpen
                        ? 'translate-y-0 opacity-100 scale-y-100'
                        : '-translate-y-2 opacity-0 scale-y-95 pointer-events-none'
                    }
                `}
                role="navigation"
                aria-label="Mobile navigation menu"
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
                    {user ? (
                        <>
                            <Link href="/watched" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <Eye className="h-4 w-4" />
                                    My Watches
                                </Button>
                            </Link>
                            <Link href="/watchlist" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <Bookmark className="h-4 w-4" />
                                    Watchlist
                                    {watchlistCount > 0 && (
                                        <Badge variant="default" className="ml-auto px-1.5 py-0 h-5 min-w-[1.25rem] text-[10px]">
                                            {watchlistCount}
                                        </Badge>
                                    )}
                                </Button>
                            </Link>
                            <Link href="/groups" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <Users className="h-4 w-4" />
                                    Groups
                                </Button>
                            </Link>
                            <Link href="/stats" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <BarChart2 className="h-4 w-4" />
                                    Stats
                                </Button>
                            </Link>
                            <Link href="/profile" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <User className="h-4 w-4" />
                                    {user.username}
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={closeMenu}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <LogIn className="h-4 w-4" />
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/register" onClick={closeMenu}>
                                <Button className="w-full justify-start gap-3">
                                    <UserPlus className="h-4 w-4" />
                                    Sign Up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
