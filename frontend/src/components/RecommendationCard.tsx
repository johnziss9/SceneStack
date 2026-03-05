"use client";

import { useEffect, useState } from "react";
import { RecommendedMovie, TmdbMovie } from "@/types";
import { movieApi, watchlistApi } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Calendar, Star, Bookmark, BookmarkCheck, BookmarkX, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WatchlistContext";
import { ApiError, PremiumRequiredError } from "@/lib/api-client";
import Link from "next/link";

interface RecommendationCardProps {
    recommendation: RecommendedMovie;
    onAddToWatched: (movie: TmdbMovie) => void;
    referrer?: string; // For tracking navigation source (e.g., 'watches', 'similar', 'group')
}

export function RecommendationCard({ recommendation, onAddToWatched, referrer = 'recommendations' }: RecommendationCardProps) {
    const { user } = useAuth();
    const { incrementCount, decrementCount } = useWishlist();
    const { movie, reason, matchedGenres } = recommendation;
    const [onWatchlist, setOnWatchlist] = useState(false);
    const [localMovieId, setLocalMovieId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isHoveringBookmark, setIsHoveringBookmark] = useState(false);

    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : null;

    const movieUrl = `/movies/${movie.id}?from=${referrer}`;

    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

    // Fetch watchlist status for authenticated users
    useEffect(() => {
        if (!user) return;
        movieApi.getMyStatus(movie.id)
            .then(status => {
                setOnWatchlist(status.onWatchlist);
                setLocalMovieId(status.localMovieId ?? null);
            })
            .catch(() => { /* silently ignore */ });
    }, [user, movie.id]);

    const handleWatchlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isSaving) return;
        setIsSaving(true);
        try {
            if (onWatchlist && localMovieId) {
                await watchlistApi.removeFromWatchlist(localMovieId);
                setOnWatchlist(false);
                setLocalMovieId(null);
                decrementCount();
                toast.success('Removed from wishlist');
            } else {
                const result = await watchlistApi.addToWatchlist(movie.id);
                setOnWatchlist(true);
                setLocalMovieId(result.movieId);
                incrementCount();
                toast.success('Saved to wishlist');
            }
        } catch (err) {
            if (err instanceof PremiumRequiredError) {
                toast.error('Wishlist limit reached. Upgrade to Premium for unlimited saves.');
            } else if (err instanceof ApiError && err.status === 409) {
                setOnWatchlist(true);
            } else {
                toast.error(onWatchlist ? 'Failed to remove from wishlist' : 'Failed to save to wishlist');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Convert to TmdbMovie format for onAddToWatched
    const tmdbMovie: TmdbMovie = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        overview: movie.overview,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count
    };

    return (
        <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all flex flex-col h-full cursor-pointer">
            <Link href={movieUrl} tabIndex={-1}>
                <div className="aspect-[2/3] relative bg-muted">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No poster
                        </div>
                    )}

                    {/* Wishlist toggle button (authenticated only) */}
                    {user && (
                        <button
                            onClick={handleWatchlistToggle}
                            onMouseEnter={() => setIsHoveringBookmark(true)}
                            onMouseLeave={() => setIsHoveringBookmark(false)}
                            disabled={isSaving}
                            aria-label={onWatchlist ? 'Remove from wishlist' : 'Save to wishlist'}
                            title={onWatchlist ? 'Remove from wishlist' : 'Save to wishlist'}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-background transition-colors cursor-pointer"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : onWatchlist && isHoveringBookmark ? (
                                <BookmarkX className="h-4 w-4 text-destructive" />
                            ) : onWatchlist ? (
                                <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                            ) : (
                                <Bookmark className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    )}
                </div>
            </Link>

            <CardContent className="p-3 space-y-2 flex-grow">
                <Link href={movieUrl} className="hover:underline">
                    <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                        {movie.title}
                    </h3>
                </Link>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {year && (
                        <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{year}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <Star size={12} className="fill-primary text-primary" />
                        <span>{rating}</span>
                    </div>
                </div>

                {/* Recommendation Reason */}
                {reason && (
                    <div className="pt-1 border-t">
                        <p className="text-xs text-muted-foreground italic line-clamp-2">
                            {reason}
                        </p>
                    </div>
                )}

                {/* Matched Genres Tags */}
                {matchedGenres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {matchedGenres.slice(0, 2).map(genre => (
                            <Badge key={genre} variant="outline" className="text-xs px-1 py-0">
                                {genre}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-3 pt-0">
                {user ? (
                    <Button
                        onClick={() => onAddToWatched(tmdbMovie)}
                        className="w-full"
                        size="sm"
                    >
                        Add to Watched
                    </Button>
                ) : (
                    <Link href="/login" className="w-full">
                        <Button className="w-full" size="sm">
                            Sign in to log watches
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
}
