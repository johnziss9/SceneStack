'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { aiApi } from '@/lib/api';
import type { AiUsageStats as AiUsageStatsType } from '@/types/ai';

export function AiUsageStats() {
    const [stats, setStats] = useState<AiUsageStatsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await aiApi.getUsageStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load usage stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Usage This Month</CardTitle>
                <CardDescription>
                    {new Date(stats.monthStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Insights Generated</p>
                        <p className="text-2xl font-bold">{stats.insightsGenerated}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Searches Performed</p>
                        <p className="text-2xl font-bold">{stats.searchesPerformed}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}