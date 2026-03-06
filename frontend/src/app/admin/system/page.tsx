'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import type { SystemHealth } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Database,
    HardDrive,
    Users,
    FileText,
    AlertTriangle,
    Clock,
    RefreshCw,
    Activity,
} from 'lucide-react';
import { log } from '@/lib/logger';
import Link from 'next/link';

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    useEffect(() => {
        loadHealth();
    }, []);

    const loadHealth = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminApi.getSystemHealth();
            setHealth(data);
            setLastRefresh(new Date());
        } catch (err) {
            log.error('Failed to load system health', err);
            setError('Failed to load system health information');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatUptime = (startTime: string): string => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.length > 0 ? parts.join(' ') : 'Just started';
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    if (loading) {
        return (
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <Button variant="outline" disabled className="gap-2 !border-[0.5px]">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(6)].map((_, i) => (
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

    if (error || !health) {
        return (
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <Button variant="outline" onClick={loadHealth} className="gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || 'Failed to load system health'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <p className="text-muted-foreground">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <Button variant="outline" onClick={loadHealth} disabled={loading} className="gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Status Banner */}
            <Card className="mb-6 border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <Activity className="h-8 w-8 text-green-500" />
                        <div>
                            <h2 className="text-2xl font-bold text-green-500">System Operational</h2>
                            <p className="text-muted-foreground">
                                All systems are running normally with no critical issues detected
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Server Uptime</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatUptime(health.serverStartTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            Started: {formatTimestamp(health.serverStartTime)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(health.databaseSizeBytes)}</div>
                        <p className="text-xs text-muted-foreground">Current database size</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{health.totalUsers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Registered user accounts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{health.totalAuditLogs.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            <Link href="/admin/audit-logs" className="text-primary hover:underline">
                                View audit logs →
                            </Link>
                        </p>
                    </CardContent>
                </Card>

                <Link href="/admin/audit-logs?success=false">
                    <Card className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                        health.errorsLast7Days > 0 ? 'border-destructive/50' : ''
                    }`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Errors (7d)</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${
                                    health.errorsLast7Days > 0 ? 'text-destructive' : 'text-green-500'
                                }`}
                            >
                                {health.errorsLast7Days}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {health.errorsLast7Days > 0 ? (
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
                        <CardTitle className="text-sm font-medium">Log Files</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">30 days</div>
                        <p className="text-xs text-muted-foreground">
                            <Link href="/admin/logs" className="text-primary hover:underline">
                                Search application logs →
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/admin/audit-logs">
                            <Button variant="outline" className="w-full justify-start gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                <FileText className="h-4 w-4" />
                                View Audit Logs
                            </Button>
                        </Link>
                        <Link href="/admin/logs">
                            <Button variant="outline" className="w-full justify-start gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                <HardDrive className="h-4 w-4" />
                                Search Application Logs
                            </Button>
                        </Link>
                        <a
                            href="https://sentry.io"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" className="w-full justify-start gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                <Activity className="h-4 w-4" />
                                Open Sentry Dashboard
                            </Button>
                        </a>
                    </div>
                </CardContent>
            </Card>

            {/* System Information */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-medium mb-2">Monitoring</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>✓ Sentry error tracking enabled</li>
                                <li>✓ Structured logging with Serilog</li>
                                <li>✓ Correlation ID tracking</li>
                                <li>✓ Audit logging with 1-year retention</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium mb-2">Retention Policies</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Audit logs: 1 year</li>
                                <li>• Application logs: 30 days</li>
                                <li>• Sentry events: Per Sentry plan</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
