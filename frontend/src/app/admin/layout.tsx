'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Terminal,
    Activity,
    ExternalLink,
} from 'lucide-react';
import { log } from '@/lib/logger';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                log.warn('Non-authenticated user attempted to access admin area');
                router.push('/login');
                return;
            }

            // Check if user has admin role by decoding JWT token
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('auth_token='))
                ?.split('=')[1];

            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

                    const hasAdminRole = Array.isArray(roles)
                        ? roles.includes('Admin')
                        : roles === 'Admin';

                    if (hasAdminRole) {
                        setIsAdmin(true);
                    } else {
                        log.warn('Non-admin user attempted to access admin area', {
                            userId: user.id,
                            username: user.username,
                        });
                        router.push('/');
                    }
                } catch (error) {
                    log.error('Failed to decode JWT token for admin check', error);
                    router.push('/');
                }
            } else {
                router.push('/login');
            }

            setCheckingAccess(false);
        }
    }, [user, loading, router]);

    if (loading || checkingAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    const navItems = [
        { href: '/admin', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
        { href: '/admin/logs', label: 'Application Logs', icon: Terminal },
        { href: '/admin/system', label: 'System Health', icon: Activity },
    ];

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 border-r bg-card min-h-screen p-6 fixed left-0 top-0">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold">Admin</h1>
                        <p className="text-sm text-muted-foreground">SceneStack Dashboard</p>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}

                        <a
                            href="https://sentry.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <ExternalLink className="h-5 w-5" />
                            <span>Sentry Dashboard</span>
                        </a>
                    </nav>

                    <div className="mt-8 pt-8 border-t">
                        <Link
                            href="/"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Back to App
                        </Link>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 ml-64 p-8 min-w-0 max-w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
