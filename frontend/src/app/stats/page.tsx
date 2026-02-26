'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { statsApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from "@/components/LoadingTips";
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatsOverview } from '@/components/stats/StatsOverview';
import { RatingsHistogram } from '@/components/stats/RatingsHistogram';
import { WatchesByYear } from '@/components/stats/WatchesByYear';
import { WatchesByMonth } from '@/components/stats/WatchesByMonth';
import { WatchesByDecade } from '@/components/stats/WatchesByDecade';
import { WatchesByLocation } from '@/components/stats/WatchesByLocation';
import { TopRewatched } from '@/components/stats/TopRewatched';
import { TopRatedFilms } from '@/components/stats/TopRatedFilms';
import { FavoriteGenres } from '@/components/stats/FavoriteGenres';
import type { UserStats } from '@/types/stats';

function StatsSkeleton() {
    return (
        <div className="space-y-6">
            <LoadingTips />
            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <Skeleton variant="branded" className="h-4 w-24 mb-2" />
                            <Skeleton variant="branded" className="h-8 w-16 mb-1" />
                            <Skeleton variant="branded" className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Chart skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton variant="branded" className="h-5 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton variant="branded" className="h-48 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton variant="branded" className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                    <Skeleton variant="branded" className="h-48 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function StatsPage() {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            loadStats();
        }
    }, [authLoading, user]);

    const loadStats = async () => {
        try {
            const data = await statsApi.getStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            setError('Failed to load your stats. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div>
                        <Skeleton variant="branded" className="h-9 w-40 mb-2" />
                        <Skeleton variant="branded" className="h-4 w-56" />
                    </div>
                    <StatsSkeleton />
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Middleware handles redirect
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const hasWatches = stats.totalWatches > 0;

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl sm:text-4xl font-bold">Your Stats</h1>
                    <p className="text-muted-foreground mt-2">
                        A look at your watching habits
                    </p>
                </div>

                {/* Summary cards */}
                <StatsOverview stats={stats} />

                {!hasWatches ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-lg">Start logging films to see your stats here.</p>
                    </div>
                ) : (
                    <>
                        {/* Ratings + Monthly activity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RatingsHistogram
                                data={stats.ratingsDistribution}
                                averageRating={stats.averageRating}
                            />
                            <WatchesByMonth data={stats.watchesByMonth} />
                        </div>

                        {/* Yearly trend (full width — better for many years of data) */}
                        {stats.watchesByYear.length > 0 && (
                            <WatchesByYear data={stats.watchesByYear} />
                        )}

                        {/* Watches by decade + location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.watchesByDecade && stats.watchesByDecade.length > 0 && (
                                <WatchesByDecade data={stats.watchesByDecade} />
                            )}
                            {stats.watchesByLocation && stats.watchesByLocation.length > 0 && (
                                <WatchesByLocation data={stats.watchesByLocation} />
                            )}
                        </div>

                        {/* Favorite genres (full width) */}
                        {stats.favoriteGenres && stats.favoriteGenres.length > 0 && (
                            <FavoriteGenres data={stats.favoriteGenres} />
                        )}

                        {/* Top rated + Most rewatched */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.topRatedMovies && stats.topRatedMovies.length > 0 && (
                                <TopRatedFilms data={stats.topRatedMovies} />
                            )}
                            {stats.topRewatched && stats.topRewatched.length > 0 && (
                                <TopRewatched data={stats.topRewatched} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
