'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Film, Eye, Star, RefreshCw } from 'lucide-react';
import type { UserStats } from '@/types/stats';

interface StatsOverviewProps {
    stats: UserStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
    const cards = [
        {
            label: 'Movies Watched',
            value: stats.totalMovies,
            icon: Film,
            description: 'unique titles',
        },
        {
            label: 'Total Watches',
            value: stats.totalWatches,
            icon: Eye,
            description: 'including rewatches',
        },
        {
            label: 'Average Rating',
            value: stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—',
            icon: Star,
            description: 'out of 10',
        },
        {
            label: 'Rewatches',
            value: stats.totalRewatches,
            icon: RefreshCw,
            description: 'films watched again',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.label}>
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground">{card.label}</p>
                                    <p className="text-3xl font-bold mt-1 truncate">{card.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                                </div>
                                <Icon className="h-5 w-5 text-primary mt-1 shrink-0" />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
