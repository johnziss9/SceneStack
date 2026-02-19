"use client";

import { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Star, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import type { TmdbMovie } from '@/types';
import { movieApi, watchlistApi } from '@/lib/api';
import { ApiError, PremiumRequiredError } from '@/lib/api-client';
import { toast } from 'sonner';

interface MovieCardProps {
    movie: TmdbMovie;
    onAddToWatched: (movie: TmdbMovie) => void;
}

export const MovieCard = memo(function MovieCard({ movie, onAddToWatched }: MovieCardProps) {
    const { user } = useAuth();
    const [onWatchlist, setOnWatchlist] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : null;

    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null;

    const rating = movie.vote_average
        ? movie.vote_average.toFixed(1)
        : 'N/A';

    // Fetch watchlist status for authenticated users
    useEffect(() => {
        if (!user) return;
        movieApi.getMyStatus(movie.id)
            .then(status => setOnWatchlist(status.onWatchlist))
            .catch(() => { /* silently ignore */ });
    }, [user, movie.id]);

    const handleWatchlistAdd = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isSaving) return;
        setIsSaving(true);
        try {
            await watchlistApi.addToWatchlist(movie.id);
            setOnWatchlist(true);
            toast.success('Saved to watchlist');
        } catch (err) {
            if (err instanceof PremiumRequiredError) {
                toast.error('Watchlist limit reached. Upgrade to Premium for unlimited saves.');
            } else if (err instanceof ApiError && err.status === 409) {
                // Genuinely already on watchlist — just confirm state is accurate
                setOnWatchlist(true);
            } else {
                toast.error('Failed to save to watchlist');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all flex flex-col h-full">
            <Link href={`/movies/${movie.id}`} tabIndex={-1}>
                <div className="aspect-[2/3] relative bg-muted">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No poster
                        </div>
                    )}

                    {/* Watchlist quick-add button (authenticated only) */}
                    {user && (
                        <button
                            onClick={handleWatchlistAdd}
                            disabled={isSaving || onWatchlist}
                            aria-label={onWatchlist ? 'On watchlist' : 'Save to watchlist'}
                            title={onWatchlist ? 'On watchlist — manage on movie page' : 'Save to watchlist'}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-background transition-colors disabled:cursor-default"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : onWatchlist ? (
                                <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                            ) : (
                                <Bookmark className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    )}
                </div>
            </Link>

            <CardContent className="p-4 space-y-2 flex-grow">
                <Link href={`/movies/${movie.id}`} className="hover:underline">
                    <h3 className="font-semibold line-clamp-2 leading-tight">
                        {movie.title}
                    </h3>
                </Link>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {year && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{year}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>{rating}</span>
                    </div>
                </div>

                {movie.overview && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {movie.overview}
                    </p>
                )}
            </CardContent>

            <CardFooter className="p-4 pt-0">
                {user ? (
                    <Button
                        onClick={() => onAddToWatched(movie)}
                        className="w-full"
                    >
                        Add to Watched
                    </Button>
                ) : (
                    <Link href="/login" className="w-full">
                        <Button variant="outline" className="w-full">
                            Sign in to log watches
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
});