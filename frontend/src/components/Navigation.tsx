'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Film, User } from 'lucide-react';

export function Navigation() {
    const { user, loading } = useAuth();

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Brand */}
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Film className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">SceneStack</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-4">
                        {loading ? (
                            // Loading state
                            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
                        ) : user ? (
                            // Authenticated
                            <>
                                <Link href="/watched">
                                    <Button variant="ghost">
                                        My Watches
                                    </Button>
                                </Link>
                                <Link href="/profile">
                                    <Button variant="ghost" className="gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="hidden sm:inline">{user.username}</span>
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            // Not authenticated
                            <>
                                <Link href="/login">
                                    <Button variant="ghost">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button>
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}