'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import type { DashboardStats, AuditLog } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, Users, FileText } from 'lucide-react';
import { log } from '@/lib/logger';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getDashboardStats();
            setStats(data);
        } catch (err) {
            log.error('Failed to load dashboard stats', err);
            setError('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getCategoryColor = (category: number) => {
        const colors: Record<number, string> = {
            0: 'bg-blue-500/10 text-blue-500', // Authentication
            1: 'bg-green-500/10 text-green-500', // Account
            2: 'bg-purple-500/10 text-purple-500', // Group
            3: 'bg-yellow-500/10 text-yellow-500', // Watch
            4: 'bg-pink-500/10 text-pink-500', // Watchlist
            5: 'bg-indigo-500/10 text-indigo-500', // AI
            6: 'bg-orange-500/10 text-orange-500', // Privacy
            7: 'bg-red-500/10 text-red-500', // Security
            8: 'bg-gray-500/10 text-gray-500', // System
        };
        return colors[category] || 'bg-gray-500/10 text-gray-500';
    };

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="animate-pulse">
                                <div className="h-4 bg-muted rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded animate-pulse"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || 'Failed to load dashboard'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Audit Logs (24h)</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.auditLogsLast24Hours}</div>
                        <p className="text-xs text-muted-foreground">Events in last 24 hours</p>
                    </CardContent>
                </Card>

                <Link href="/admin/audit-logs?success=false">
                    <Card className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                        stats.errorsLast7Days > 0 ? 'border-destructive/50' : ''
                    }`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Errors (7d)</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${
                                stats.errorsLast7Days > 0 ? 'text-destructive' : 'text-green-500'
                            }`}>
                                {stats.errorsLast7Days}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {stats.errorsLast7Days > 0 ? (
                                    <span className="text-destructive">Click to view errors</span>
                                ) : (
                                    'No errors in last 7 days'
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeUsersLast7Days}</div>
                        <p className="text-xs text-muted-foreground">Unique users last 7 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">Healthy</div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Errors */}
            {stats.recentAuditLogs.filter(log => !log.success).length > 0 && (
                <Card className="border-red-500/50 mb-8">
                    <CardHeader>
                        <CardTitle className="text-destructive">Recent Errors</CardTitle>
                        <CardDescription>Failed operations in the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentAuditLogs
                                .filter(log => !log.success)
                                .map((log) => (
                                    <Link
                                        key={log.id}
                                        href={`/admin/audit-logs/${log.id}`}
                                        className="block"
                                    >
                                        <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg hover:bg-red-500/5 transition-colors">
                                            <div className="flex items-center gap-4 flex-1">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                                                        log.category
                                                    )}`}
                                                >
                                                    {log.eventType}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {log.username || 'Anonymous'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.ipAddress} · {log.action}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm">{formatTimestamp(log.timestamp)}</p>
                                                    <p className="text-xs text-destructive font-medium">
                                                        Failed
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Audit Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest audit log events</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.recentAuditLogs.map((log) => (
                            <Link
                                key={log.id}
                                href={`/admin/audit-logs/${log.id}`}
                                className="block"
                            >
                                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                                                log.category
                                            )}`}
                                        >
                                            {log.eventType}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">
                                                {log.username || 'Anonymous'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.ipAddress}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm">{formatTimestamp(log.timestamp)}</p>
                                            <p
                                                className={`text-xs ${
                                                    log.success
                                                        ? 'text-green-500'
                                                        : 'text-destructive'
                                                }`}
                                            >
                                                {log.success ? 'Success' : 'Failed'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/admin/audit-logs"
                            className="text-sm text-primary hover:underline"
                        >
                            View all audit logs →
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
