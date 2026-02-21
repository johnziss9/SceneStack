'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WatchForm } from '@/components/WatchForm';
import { watchlistApi } from '@/lib/api';
import { useWatchlist } from '@/contexts/WatchlistContext';
import type { WatchlistItem, TmdbMovie } from '@/types';
import { toast } from 'sonner';

interface WatchlistCardProps {
    item: WatchlistItem;
    onRemoved: (movieId: number) => void;
}

export function WatchlistCard({ item, onRemoved }: WatchlistCardProps) {
    const router = useRouter();
    const { decrementCount } = useWatchlist();
    const [isRemoving, setIsRemoving] = useState(false);
    const [isTogglingPriority, setIsTogglingPriority] = useState(false);
    const [priority, setPriority] = useState(item.priority);
    const [isWatchFormOpen, setIsWatchFormOpen] = useState(false);

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

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await watchlistApi.removeFromWatchlist(item.movieId);
            decrementCount();
            toast.success('Removed from watchlist');
            onRemoved(item.movieId);
        } catch {
            toast.error('Failed to remove from watchlist');
        } finally {
            setIsRemoving(false);
        }
    };

    const handlePriorityToggle = async () => {
        const newPriority = priority === 1 ? 0 : 1;
        setIsTogglingPriority(true);
        try {
            await watchlistApi.updateWatchlistItem(item.movieId, { priority: newPriority });
            setPriority(newPriority);
        } catch {
            toast.error('Failed to update priority');
        } finally {
            setIsTogglingPriority(false);
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
            onRemoved(item.movieId);
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
            <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                <div className="flex gap-3">
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

                            {/* Priority toggle */}
                            <button
                                onClick={handlePriorityToggle}
                                disabled={isTogglingPriority}
                                title={priority === 1 ? 'Remove high priority' : 'Mark as high priority'}
                                className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                    priority === 1
                                        ? 'bg-primary/15 text-primary hover:bg-primary/25'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                {isTogglingPriority ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Star className={`h-3 w-3 ${priority === 1 ? 'fill-primary' : ''}`} />
                                )}
                                {priority === 1 ? 'High Priority' : 'Normal'}
                            </button>
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
                                    onClick={handleRemove}
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
        </>
    );
}
