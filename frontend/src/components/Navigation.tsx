'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Film, User, Users, BarChart2, Menu, X, Eye, LogIn, UserPlus } from 'lucide-react';

export function Navigation() {
    const { user, loading } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

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
                                className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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

            {/* Mobile menu dropdown */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-background">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
                        {user ? (
                            <>
                                <Link href="/watched" onClick={closeMenu}>
                                    <Button variant="ghost" className="w-full justify-start gap-3">
                                        <Eye className="h-4 w-4" />
                                        My Watches
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
            )}
        </nav>
    );
}
