'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Loader2, AlertCircle, Info } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistCard } from '@/components/WatchlistCard';
import { watchlistApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { WatchlistItem } from '@/types';
import { LoadingTips } from '@/components/LoadingTips';

type SortBy = 'priority-asc' | 'recent';

const PAGE_SIZE = 20;

export default function WatchlistPage() {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState<SortBy>('priority-asc');
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    const handleItemRemoved = async (movieId: number) => {
        // Refresh from server to get updated priorities and pagination
        // Don't do optimistic update as it interferes with priority renumbering
        try {
            const data = await watchlistApi.getWatchlist(1, PAGE_SIZE, sortBy);
            setItems(data.items);
            setHasMore(data.hasMore);
            setTotalCount(data.totalCount);
            setPage(1);
        } catch (error) {
            setError('Failed to refresh watchlist. Please reload the page.');
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic UI update
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        setItems(reorderedItems);

        // Calculate new priority (1-based index)
        const newPriority = newIndex + 1;
        const movieId = items[oldIndex].movieId;

        try {
            await watchlistApi.updatePriority(movieId, newPriority);
            // Backend handles renumbering all items
            // Refresh to get updated priorities from server
            await loadWatchlist(1, sortBy, false);
        } catch (error) {
            // Revert on error
            setItems(items);
            toast.error('Failed to reorder. Please try again.');
        }
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
                    <div className="flex flex-wrap items-center gap-1 border rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={sortBy === 'priority-asc' ? 'default' : 'ghost'}
                            className="h-7 text-xs px-3"
                            onClick={() => handleSortChange('priority-asc')}
                        >
                            Priority
                        </Button>
                        <Button
                            size="sm"
                            variant={sortBy === 'recent' ? 'default' : 'ghost'}
                            className="h-7 text-xs px-3"
                            onClick={() => handleSortChange('recent')}
                        >
                            Date Added
                        </Button>
                    </div>
                )}
            </div>

            {/* Loading skeletons */}
            {isLoading && (
                <div className="space-y-6">
                    <LoadingTips />
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3 rounded-lg border p-3">
                                <Skeleton variant="poster" className="w-20 h-[120px] rounded flex-shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <Skeleton variant="branded" className="h-4 w-3/4" />
                                    <Skeleton variant="branded" className="h-3 w-1/4" />
                                    <Skeleton variant="branded" className="h-3 w-1/2 mt-4" />
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Skeleton variant="branded" className="h-8 w-32" />
                                        <Skeleton variant="branded" className="h-8 w-8" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Bookmark className="h-16 w-16 text-muted-foreground" />
                    <p className="text-xl text-muted-foreground">No movies in your watchlist yet</p>
                    <p className="text-sm text-muted-foreground">
                        Browse movies and add them to your watchlist to keep track of what you want to watch
                    </p>
                    <a href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                        Search Movies
                    </a>
                </div>
            )}

            {/* Watchlist items */}
            {!isLoading && !error && items.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                        disabled={sortBy === 'recent'}
                    >
                        <div className="space-y-3">
                            {sortBy === 'priority-asc' && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                    <Info className="h-4 w-4 flex-shrink-0" />
                                    <span>Drag and drop movies to reorder your watchlist</span>
                                </div>
                            )}
                            {sortBy === 'recent' && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                    <Info className="h-4 w-4 flex-shrink-0" />
                                    <span>Drag and drop is disabled in "Date Added" mode.</span>
                                </div>
                            )}
                            {items.map(item => (
                                <WatchlistCard
                                    key={item.id}
                                    item={item}
                                    onRemoved={handleItemRemoved}
                                    isDragDisabled={sortBy === 'recent'}
                                />
                            ))}

                        </div>
                    </SortableContext>

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

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {activeId ? (
                            <WatchlistCard
                                item={items.find(item => item.id === activeId)!}
                                onRemoved={async () => {}}
                                isDragDisabled={false}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </div>
    );
}
