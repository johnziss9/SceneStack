'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Copy, Check, X } from 'lucide-react';
import { log } from '@/lib/logger';

export default function ApplicationLogsPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [correlationId, setCorrelationId] = useState('');
    const [level, setLevel] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [message, setMessage] = useState('');
    const [limit, setLimit] = useState('100');

    const handleSearch = async () => {
        try {
            setLoading(true);
            setError(null);
            const results = await adminApi.searchLogs({
                correlationId: correlationId || undefined,
                level: level === 'all' ? undefined : level,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                message: message || undefined,
                limit: parseInt(limit) || 100,
            });
            setLogs(results);
        } catch (err) {
            log.error('Failed to search logs', err);
            setError('Failed to search application logs');
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setCorrelationId('');
        setLevel('all');
        setDateFrom('');
        setDateTo('');
        setMessage('');
        setLimit('100');
        setLogs([]);
        setError(null);
    };

    const handleCopyLogs = async () => {
        try {
            await navigator.clipboard.writeText(logs.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            log.error('Failed to copy logs to clipboard', err);
        }
    };

    const handleDownloadLogs = () => {
        const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scenestack-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getLogLevelColor = (logLine: string) => {
        if (logLine.includes('[ERR]') || logLine.includes('[Error]')) {
            return 'text-red-500';
        } else if (logLine.includes('[WRN]') || logLine.includes('[Warning]')) {
            return 'text-yellow-500';
        } else if (logLine.includes('[INF]') || logLine.includes('[Information]')) {
            return 'text-blue-500';
        } else if (logLine.includes('[DBG]') || logLine.includes('[Debug]')) {
            return 'text-gray-500';
        }
        return 'text-foreground';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Application Logs</h1>
                    <p className="text-muted-foreground">
                        Search and view Serilog application logs
                    </p>
                </div>
            </div>

            {/* Search Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Search Filters</CardTitle>
                            <CardDescription>
                                Filter logs by correlation ID, level, date range, or message content
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={handleClearFilters} className="gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                            <X className="h-4 w-4" />
                            Clear Filters
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Correlation ID</label>
                            <Input
                                placeholder="e.g., 1234567890-abc123"
                                value={correlationId}
                                onChange={(e) => setCorrelationId(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Log Level</label>
                            <Select value={level} onValueChange={setLevel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="Debug">Debug</SelectItem>
                                    <SelectItem value="Information">Information</SelectItem>
                                    <SelectItem value="Warning">Warning</SelectItem>
                                    <SelectItem value="Error">Error</SelectItem>
                                    <SelectItem value="Fatal">Fatal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Message Contains</label>
                            <Input
                                placeholder="Search text in log messages"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Date From</label>
                            <Input
                                type="datetime-local"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Date To</label>
                            <Input
                                type="datetime-local"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Result Limit</label>
                            <Input
                                type="number"
                                placeholder="100"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                min="1"
                                max="1000"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto gap-2 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    Search Logs
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Log Results</CardTitle>
                            <CardDescription>
                                {logs.length > 0
                                    ? `Found ${logs.length} log entries`
                                    : 'Enter search criteria and click "Search Logs"'}
                            </CardDescription>
                        </div>
                        {logs.length > 0 && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleCopyLogs}>
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleDownloadLogs}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-destructive">{error}</div>
                    ) : logs.length > 0 ? (
                        <div className="relative w-full overflow-hidden">
                            <pre className="bg-black/95 text-green-400 p-6 rounded-lg max-h-[600px] overflow-y-auto text-xs font-mono whitespace-pre-wrap break-words w-full">
                                {logs.map((logLine, index) => (
                                    <div
                                        key={index}
                                        className={`${getLogLevelColor(logLine)} hover:bg-white/5 px-2 -mx-2 break-words`}
                                    >
                                        {logLine}
                                    </div>
                                ))}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {loading
                                    ? 'Searching application logs...'
                                    : 'No logs to display. Use the filters above to search.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
