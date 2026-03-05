'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Loader2, AlertCircle, Info, ArrowUpDown } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WatchlistCard } from '@/components/WatchlistCard';
import { watchlistApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { WatchlistItem } from '@/types';
import { LoadingTips } from '@/components/LoadingTips';

type SortBy = 'priority-asc' | 'recent';

const PAGE_SIZE = 20;

export default function WishlistPage() {
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

    const loadWishlist = useCallback(async (newPage: number, newSort: SortBy, append: boolean) => {
        try {
            const data = await watchlistApi.getWatchlist(newPage, PAGE_SIZE, newSort);
            setItems(prev => append ? [...prev, ...data.items] : data.items);
            setHasMore(data.hasMore);
            setTotalCount(data.totalCount);
        } catch {
            setError('Failed to load wishlist. Please try again.');
        }
    }, []);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        loadWishlist(1, sortBy, false).finally(() => setIsLoading(false));
    }, [sortBy, loadWishlist]);

    const handleLoadMore = async () => {
        const nextPage = page + 1;
        setIsLoadingMore(true);
        await loadWishlist(nextPage, sortBy, true);
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
            setError('Failed to refresh wishlist. Please reload the page.');
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
            await loadWishlist(1, sortBy, false);
        } catch (error) {
            // Revert on error
            setItems(items);
            toast.error('Failed to reorder. Please try again.');
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6 space-y-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bookmark className="h-6 w-6 text-primary" />
                    My Wishlist
                </h1>

                {/* Sort dropdown and count */}
                {!isLoading && totalCount > 0 && (
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="w-full sm:w-auto">
                            <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortBy)}>
                                <SelectTrigger className="gap-2 w-full sm:w-[180px] !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                    <ArrowUpDown className="h-4 w-4 text-foreground" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="priority-asc">Priority</SelectItem>
                                    <SelectItem value="recent">Date Added</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {totalCount} {totalCount === 1 ? 'movie' : 'movies'}
                        </span>
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
                            loadWishlist(1, sortBy, false).finally(() => setIsLoading(false));
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
                    <p className="text-xl text-muted-foreground">No movies in your wishlist yet</p>
                    <p className="text-sm text-muted-foreground">
                        Browse movies and add them to your wishlist to keep track of what you want to watch
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
                                    <span>Drag and drop movies to reorder your wishlist</span>
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
