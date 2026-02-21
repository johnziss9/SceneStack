'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistCard } from '@/components/WatchlistCard';
import { watchlistApi } from '@/lib/api';
import type { WatchlistItem } from '@/types';

type SortBy = 'recent' | 'priority';

const PAGE_SIZE = 20;

export default function WatchlistPage() {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState<SortBy>('recent');
    const [error, setError] = useState<string | null>(null);

    const loadWatchlist = useCallback(async (newPage: number, newSort: SortBy, append: boolean) => {
        try {
            const data = await watchlistApi.getWatchlist(newPage, PAGE_SIZE, newSort);
            setItems(prev => append ? [...prev, ...data.items] : data.items);
            setHasMore(data.hasMore);
            setTotalCount(data.totalCount);
        } catch {
            setError('Failed to load watchlist. Please try again.');
        }
    }, []);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        loadWatchlist(1, sortBy, false).finally(() => setIsLoading(false));
    }, [sortBy, loadWatchlist]);

    const handleLoadMore = async () => {
        const nextPage = page + 1;
        setIsLoadingMore(true);
        await loadWatchlist(nextPage, sortBy, true);
        setPage(nextPage);
        setIsLoadingMore(false);
    };

    const handleSortChange = (newSort: SortBy) => {
        if (newSort === sortBy) return;
        setSortBy(newSort);
        setPage(1);
    };

    const handleItemRemoved = (movieId: number) => {
        setItems(prev => prev.filter(i => i.movieId !== movieId));
        setTotalCount(prev => Math.max(0, prev - 1));
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bookmark className="h-6 w-6 text-primary" />
                        Watchlist
                    </h1>
                    {!isLoading && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {totalCount === 0
                                ? 'Nothing saved yet'
                                : `${totalCount} ${totalCount === 1 ? 'movie' : 'movies'} saved`}
                        </p>
                    )}
                </div>

                {/* Sort toggle */}
                {!isLoading && totalCount > 0 && (
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={sortBy === 'recent' ? 'default' : 'ghost'}
                            className="h-7 text-xs px-3"
                            onClick={() => handleSortChange('recent')}
                        >
                            Recently Added
                        </Button>
                        <Button
                            size="sm"
                            variant={sortBy === 'priority' ? 'default' : 'ghost'}
                            className="h-7 text-xs px-3 gap-1"
                            onClick={() => handleSortChange('priority')}
                        >
                            <ArrowUpDown className="h-3 w-3" />
                            High Priority First
                        </Button>
                    </div>
                )}
            </div>

            {/* Loading skeletons */}
            {isLoading && (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-3 rounded-lg border p-3">
                            <Skeleton className="w-20 h-[120px] rounded flex-shrink-0" />
                            <div className="flex-1 space-y-2 py-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/4" />
                                <Skeleton className="h-3 w-1/2 mt-4" />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Skeleton className="h-8 w-32" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {!isLoading && error && (
                <div className="text-center py-16">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-muted-foreground">{error}</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                            setError(null);
                            setIsLoading(true);
                            loadWatchlist(1, sortBy, false).finally(() => setIsLoading(false));
                        }}
                    >
                        Try again
                    </Button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && items.length === 0 && (
                <div className="text-center py-20">
                    <Bookmark className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-muted-foreground">Nothing saved yet</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Find a movie and save it to your watchlist to watch later.
                    </p>
                </div>
            )}

            {/* Watchlist items */}
            {!isLoading && !error && items.length > 0 && (
                <div className="space-y-3">
                    {items.map(item => (
                        <WatchlistCard
                            key={item.id}
                            item={item}
                            onRemoved={handleItemRemoved}
                        />
                    ))}

                    {/* Load more */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    'Load more'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
