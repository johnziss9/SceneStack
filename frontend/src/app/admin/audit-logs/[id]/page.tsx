'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import type { AuditLog } from '@/types/admin';
import { AuditEventCategory } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Globe, Shield, FileText } from 'lucide-react';
import { log } from '@/lib/logger';

export default function AuditLogDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAuditLog();
    }, [params.id]);

    const loadAuditLog = async () => {
        try {
            setLoading(true);
            setError(null);
            const id = parseInt(params.id as string);
            const data = await adminApi.getAuditLogById(id);
            setAuditLog(data);
        } catch (err) {
            log.error('Failed to load audit log detail', err);
            setError('Failed to load audit log details');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
        });
    };

    const getCategoryName = (cat: AuditEventCategory): string => {
        const names: Record<AuditEventCategory, string> = {
            [AuditEventCategory.Authentication]: 'Authentication',
            [AuditEventCategory.Account]: 'Account',
            [AuditEventCategory.Group]: 'Group',
            [AuditEventCategory.Watch]: 'Watch',
            [AuditEventCategory.Watchlist]: 'Watchlist',
            [AuditEventCategory.AI]: 'AI',
            [AuditEventCategory.Privacy]: 'Privacy',
            [AuditEventCategory.Security]: 'Security',
            [AuditEventCategory.System]: 'System',
        };
        return names[cat];
    };

    const getCategoryColor = (cat: number) => {
        const colors: Record<number, string> = {
            0: 'bg-blue-500/10 text-blue-500',
            1: 'bg-green-500/10 text-green-500',
            2: 'bg-purple-500/10 text-purple-500',
            3: 'bg-yellow-500/10 text-yellow-500',
            4: 'bg-pink-500/10 text-pink-500',
            5: 'bg-indigo-500/10 text-indigo-500',
            6: 'bg-orange-500/10 text-orange-500',
            7: 'bg-red-500/10 text-red-500',
            8: 'bg-gray-500/10 text-gray-500',
        };
        return colors[cat] || 'bg-gray-500/10 text-gray-500';
    };

    const formatJson = (jsonString: string | null) => {
        if (!jsonString) return null;
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return jsonString;
        }
    };

    if (loading) {
        return (
            <div>
                <Button variant="ghost" onClick={() => router.push('/admin/audit-logs')} className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Audit Logs
                </Button>
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading audit log details...</p>
                </div>
            </div>
        );
    }

    if (error || !auditLog) {
        return (
            <div>
                <Button variant="ghost" onClick={() => router.push('/admin/audit-logs')} className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Audit Logs
                </Button>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error || 'Audit log not found'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push('/admin/audit-logs')} className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Audit Logs
            </Button>

            <div className="space-y-6">
                {/* Header Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span
                                    className={`px-3 py-1.5 rounded text-sm font-medium ${getCategoryColor(
                                        auditLog.category
                                    )}`}
                                >
                                    {auditLog.eventType}
                                </span>
                                <div>
                                    <CardTitle>{auditLog.action}</CardTitle>
                                    <CardDescription>
                                        {getCategoryName(auditLog.category)} Event
                                    </CardDescription>
                                </div>
                            </div>
                            <div
                                className={`px-4 py-2 rounded-md font-medium ${
                                    auditLog.success
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-red-500/10 text-red-500'
                                }`}
                            >
                                {auditLog.success ? 'Success' : 'Failed'}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Event Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Timestamp</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatTimestamp(auditLog.timestamp)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">User</p>
                                        <p className="text-sm text-muted-foreground">
                                            {auditLog.username || 'Anonymous'}
                                        </p>
                                        {auditLog.userId && (
                                            <p className="text-xs text-muted-foreground">ID: {auditLog.userId}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">IP Address</p>
                                        <p className="text-sm text-muted-foreground">{auditLog.ipAddress}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {auditLog.entityType && (
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Entity</p>
                                            <p className="text-sm text-muted-foreground">
                                                {auditLog.entityType}
                                                {auditLog.entityId && ` (ID: ${auditLog.entityId})`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">User Agent</p>
                                        <p className="text-sm text-muted-foreground break-all">
                                            {auditLog.userAgent}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Event ID</p>
                                        <p className="text-sm text-muted-foreground">{auditLog.id}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error Message */}
                {!auditLog.success && auditLog.errorMessage && (
                    <Card className="border-red-500/50">
                        <CardHeader>
                            <CardTitle className="text-red-500">Error Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-red-500/10 p-4 rounded-md text-sm overflow-x-auto">
                                {auditLog.errorMessage}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* Old Values */}
                {auditLog.oldValues && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Previous Values</CardTitle>
                            <CardDescription>State before this event</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                                {formatJson(auditLog.oldValues)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* New Values */}
                {auditLog.newValues && (
                    <Card>
                        <CardHeader>
                            <CardTitle>New Values</CardTitle>
                            <CardDescription>State after this event</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                                {formatJson(auditLog.newValues)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* Additional Data */}
                {auditLog.additionalData && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                                {formatJson(auditLog.additionalData)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
