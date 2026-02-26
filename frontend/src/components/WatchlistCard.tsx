'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle, Loader2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WatchForm } from '@/components/WatchForm';
import { watchlistApi } from '@/lib/api';
import { useWatchlist } from '@/contexts/WatchlistContext';
import type { WatchlistItem, TmdbMovie } from '@/types';
import { toast } from '@/lib/toast';

interface WatchlistCardProps {
    item: WatchlistItem;
    onRemoved: (movieId: number) => Promise<void>;
    isDragDisabled?: boolean;
}

export function WatchlistCard({ item, onRemoved, isDragDisabled = false }: WatchlistCardProps) {
    const router = useRouter();
    const { decrementCount } = useWatchlist();
    const [isRemoving, setIsRemoving] = useState(false);
    const [isWatchFormOpen, setIsWatchFormOpen] = useState(false);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        disabled: isDragDisabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : undefined,
    };

    const posterUrl = item.movie.posterPath
        ? `https://image.tmdb.org/t/p/w342${item.movie.posterPath}`
        : null;

    const addedAgo = (() => {
        const diff = Date.now() - new Date(item.addedAt).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 30) return `${days} days ago`;
        const months = Math.floor(days / 30);
        if (months === 1) return '1 month ago';
        if (months < 12) return `${months} months ago`;
        const years = Math.floor(months / 12);
        return years === 1 ? '1 year ago' : `${years} years ago`;
    })();

    // Build a TmdbMovie-compatible object for WatchForm
    const tmdbMovie: TmdbMovie = {
        id: item.movie.tmdbId,
        title: item.movie.title,
        release_date: item.movie.year ? `${item.movie.year}-01-01` : undefined,
        poster_path: item.movie.posterPath ?? null,
        overview: item.movie.synopsis ?? undefined,
        vote_average: 0,
        vote_count: 0,
    };

    const handleRemoveClick = () => {
        setIsRemoveDialogOpen(true);
    };

    const handleRemoveConfirm = async () => {
        setIsRemoving(true);
        try {
            await watchlistApi.removeFromWatchlist(item.movieId);
            decrementCount();
            toast.success('Removed from watchlist');
            await onRemoved(item.movieId);
        } catch {
            toast.error('Failed to remove from watchlist');
        } finally {
            setIsRemoving(false);
            setIsRemoveDialogOpen(false);
        }
    };

    const handleMarkAsWatched = () => {
        setIsWatchFormOpen(true);
    };

    const handleWatchSuccess = async () => {
        // Remove from watchlist automatically after logging a watch
        try {
            await watchlistApi.removeFromWatchlist(item.movieId);
            decrementCount();
        } catch {
            // Silently ignore — the watch was logged successfully, watchlist removal is best-effort
        } finally {
            await onRemoved(item.movieId);
            toast.success(`${item.movie.title} marked as watched!`, {
                action: {
                    label: 'View history',
                    onClick: () => router.push(`/watched/${item.movieId}`),
                },
                duration: 5000,
            });
        }
    };

    return (
        <>
            <Card
                ref={setNodeRef}
                style={style}
                className="overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            >
                <div className="flex gap-3">
                    {/* Drag Handle or Spacer */}
                    {!isDragDisabled ? (
                        <div
                            className="flex items-center px-2 cursor-grab active:cursor-grabbing touch-none"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="pl-3" />
                    )}

                    {/* Poster */}
                    <Link href={`/movies/${item.movie.tmdbId}`} className="flex-shrink-0">
                        <div className="w-20 aspect-[2/3] bg-muted relative">
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={item.movie.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-1">
                                    No poster
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* Content */}
                    <CardContent className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <Link href={`/movies/${item.movie.tmdbId}`} className="hover:underline">
                                    <h3 className="font-semibold line-clamp-2 leading-tight">
                                        {item.movie.title}
                                    </h3>
                                </Link>
                                {item.movie.year && (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {item.movie.year}
                                    </p>
                                )}
                            </div>

                            {/* Priority Number Badge */}
                            <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
                                #{item.priority}
                            </div>
                        </div>

                        {/* Notes */}
                        {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 italic">
                                &ldquo;{item.notes}&rdquo;
                            </p>
                        )}

                        {/* Footer row */}
                        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                                Saved {addedAgo}
                            </span>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-xs h-8"
                                    onClick={handleMarkAsWatched}
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Mark as Watched
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={handleRemoveClick}
                                    disabled={isRemoving}
                                    aria-label="Remove from watchlist"
                                >
                                    {isRemoving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>

            <WatchForm
                movie={tmdbMovie}
                open={isWatchFormOpen}
                onOpenChange={setIsWatchFormOpen}
                onSuccess={handleWatchSuccess}
            />

            {/* Remove Confirmation Dialog */}
            <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from Watchlist</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{item.movie.title}</strong> from your watchlist?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveConfirm}
                            disabled={isRemoving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRemoving ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
