'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import type { AuditLogListResponse, AuditLog } from '@/types/admin';
import { AuditEventCategory } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { log } from '@/lib/logger';
import Link from 'next/link';
import { exportAuditLogsToCSV, getCategoryName } from '@/lib/utils/audit-logs';

export default function AuditLogsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const successParam = searchParams.get('success');

    const [data, setData] = useState<AuditLogListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [category, setCategory] = useState<AuditEventCategory | undefined>();
    const [eventType, setEventType] = useState('');
    const [username, setUsername] = useState('');
    const [successFilter, setSuccessFilter] = useState<string>(
        successParam === 'false' ? 'failed' : successParam === 'true' ? 'success' : 'all'
    );

    useEffect(() => {
        loadLogs();
    }, [page]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await adminApi.getAuditLogs({
                page,
                pageSize,
                category,
                eventType: eventType || undefined,
                username: username || undefined,
                success: successFilter === 'all' ? undefined : successFilter === 'success',
            });
            setData(response);
        } catch (err) {
            log.error('Failed to load audit logs', err);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadLogs();
    };

    const handleClearFilters = async () => {
        setCategory(undefined);
        setEventType('');
        setUsername('');
        setSuccessFilter('all');
        setPage(1);

        // Clear URL parameters
        router.replace('/admin/audit-logs');

        // Immediately load logs with cleared filters
        try {
            setLoading(true);
            setError(null);
            const response = await adminApi.getAuditLogs({
                page: 1,
                pageSize,
                category: undefined,
                eventType: undefined,
                username: undefined,
                success: undefined,
            });
            setData(response);
        } catch (err) {
            log.error('Failed to load audit logs', err);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (value: string) => {
        setSuccessFilter(value);

        // Update URL based on status filter
        if (value === 'failed') {
            router.replace('/admin/audit-logs?success=false');
        } else if (value === 'success') {
            router.replace('/admin/audit-logs?success=true');
        } else {
            router.replace('/admin/audit-logs');
        }
    };

    const handleExportCSV = () => {
        if (!data || data.logs.length === 0) {
            return;
        }
        exportAuditLogsToCSV(data.logs);
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
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

    const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        {data ? `${data.totalCount} total events` : 'Loading...'}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={!data || data.logs.length === 0}
                    className="gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Filters</CardTitle>
                        <Button variant="outline" onClick={handleClearFilters} className="gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                            <X className="h-4 w-4" />
                            Clear Filters
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <Select
                                value={category?.toString() || 'all'}
                                onValueChange={(value) =>
                                    setCategory(value === 'all' ? undefined : parseInt(value) as AuditEventCategory)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {Object.values(AuditEventCategory)
                                        .filter((v) => typeof v === 'number')
                                        .map((cat) => (
                                            <SelectItem key={cat} value={cat.toString()}>
                                                {getCategoryName(cat as AuditEventCategory)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={successFilter} onValueChange={handleStatusChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="success">Success Only</SelectItem>
                                    <SelectItem value="failed">Failed Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Event Type</label>
                            <Input
                                placeholder="e.g., Login.Success"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Username</label>
                            <Input
                                placeholder="e.g., johnpremium"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button onClick={handleSearch} className="w-full gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-muted-foreground">Loading audit logs...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">{error}</div>
                    ) : data && data.logs.length > 0 ? (
                        <>
                            <div className="space-y-2">
                                {data.logs.map((auditLog) => (
                                    <Link
                                        key={auditLog.id}
                                        href={`/admin/audit-logs/${auditLog.id}`}
                                        className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                                                        auditLog.category
                                                    )}`}
                                                >
                                                    {auditLog.eventType}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {auditLog.username || 'Anonymous'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {auditLog.ipAddress} · {auditLog.action}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">
                                                    {formatTimestamp(auditLog.timestamp)}
                                                </p>
                                                <p
                                                    className={`text-xs ${
                                                        auditLog.success
                                                            ? 'text-green-500'
                                                            : 'text-destructive'
                                                    }`}
                                                >
                                                    {auditLog.success ? 'Success' : 'Failed'}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages} ({data.totalCount} total events)
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No audit logs found
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
