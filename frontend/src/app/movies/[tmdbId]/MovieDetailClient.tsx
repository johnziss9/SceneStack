'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { movieApi, watchlistApi } from '@/lib/api';
import type { MovieDetail, MovieUserStatus, TmdbMovie } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { WatchForm } from '@/components/WatchForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from "@/components/LoadingTips";
import { toast } from '@/lib/toast';
import {
    ArrowLeft,
    Star,
    Clock,
    Plus,
    BookmarkPlus,
    BookmarkCheck,
    AlertCircle,
    Eye,
} from 'lucide-react';
import { ApiError, PremiumRequiredError } from '@/lib/api-client';

interface MovieDetailPageProps {
    params: Promise<{ tmdbId: string }>;
}

function formatRuntime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MovieDetailClient({ params }: MovieDetailPageProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { incrementCount, decrementCount } = useWatchlist();

    const [tmdbId, setTmdbId] = useState<number | null>(null);
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [status, setStatus] = useState<MovieUserStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isWatchFormOpen, setIsWatchFormOpen] = useState(false);
    const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
    const [watchlistHover, setWatchlistHover] = useState(false);

    useEffect(() => {
        async function load() {
            const { tmdbId: raw } = await params;
            const id = parseInt(raw, 10);
            if (isNaN(id)) {
                setError('Invalid movie ID.');
                setIsLoading(false);
                return;
            }
            setTmdbId(id);

            try {
                const detailPromise = movieApi.getDetail(id);
                const statusPromise = user ? movieApi.getMyStatus(id) : Promise.resolve(null);
                const [detail, myStatus] = await Promise.all([detailPromise, statusPromise]);
                setMovie(detail);
                setStatus(myStatus);
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    setError('Movie not found.');
                } else {
                    setError('Failed to load movie. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [params, user]);

    const handleWatchlistToggle = async () => {
        if (!user || !movie || !status) return;
        setIsTogglingWatchlist(true);
        try {
            if (status.onWatchlist && status.localMovieId) {
                await watchlistApi.removeFromWatchlist(status.localMovieId);
                setStatus(prev => prev ? { ...prev, onWatchlist: false, watchlistItemId: null } : prev);
                decrementCount();
                toast.success('Removed from watchlist');
            } else {
                await watchlistApi.addToWatchlist(movie.tmdbId);
                const refreshed = await movieApi.getMyStatus(movie.tmdbId);
                setStatus(refreshed);
                incrementCount();
                toast.success('Saved to watchlist');
            }
        } catch (err) {
            if (err instanceof PremiumRequiredError) {
                toast.error('Watchlist limit reached. Upgrade to Premium for unlimited saves.');
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setIsTogglingWatchlist(false);
        }
    };

    const handleWatchSuccess = async () => {
        if (!tmdbId) return;
        setIsWatchFormOpen(false);
        // Toast is shown by WatchForm component
        if (user) {
            const refreshed = await movieApi.getMyStatus(tmdbId);
            setStatus(refreshed);
        }
    };

    // Build a TmdbMovie-shaped object for WatchForm
    const tmdbMovieForForm: TmdbMovie | null = movie
        ? {
              id: movie.tmdbId,
              title: movie.title,
              release_date: movie.year ? `${movie.year}-01-01` : undefined,
              poster_path: movie.posterPath ?? null,
              overview: movie.synopsis ?? undefined,
              vote_average: movie.tmdbRating ?? 0,
              vote_count: movie.tmdbVoteCount ?? 0,
          }
        : null;

    const posterUrl = movie?.posterPath
        ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
        : null;
    const backdropUrl = movie?.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`
        : null;

    // --- Loading skeleton ---
    if (isLoading) {
        return (
            <div className="min-h-screen">
                <div className="p-4 sm:p-6">
                    <LoadingTips />
                </div>
                <Skeleton variant="branded" className="w-full h-64 sm:h-80 rounded-none" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                    <Skeleton variant="branded" className="h-8 w-3/4" />
                    <Skeleton variant="branded" className="h-4 w-1/2" />
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
                    </div>
                    <Skeleton variant="branded" className="h-24 w-full" />
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton variant="branded" className="aspect-square rounded-full w-16 h-16 mx-auto" />
                                <Skeleton variant="branded" className="h-3 w-full" />
                                <Skeleton variant="branded" className="h-3 w-3/4 mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Error state ---
    if (error || !movie) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h1 className="text-2xl font-bold">{error ?? 'Movie not found'}</h1>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go back
                </Button>
            </div>
        );
    }

    const onWatchlist = status?.onWatchlist ?? false;
    const watchCount = status?.watchCount ?? 0;
    const localMovieId = status?.localMovieId;

    return (
        <div className="min-h-screen pb-16">
            {/* Backdrop header */}
            <div className="relative w-full h-56 sm:h-80 bg-muted overflow-hidden">
                {backdropUrl ? (
                    <img
                        src={backdropUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                {/* Back button */}
                <div className="absolute top-4 left-0 right-0">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.back()}
                            className="!bg-muted !text-primary !border-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Watchlist
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                {/* Poster + info row */}
                <div className="flex gap-6 -mt-20 sm:-mt-28 relative z-10">
                    {/* Poster */}
                    <div className="hidden sm:block flex-shrink-0 w-40 rounded-lg overflow-hidden shadow-xl border border-border">
                        {posterUrl ? (
                            <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                No poster
                            </div>
                        )}
                    </div>

                    {/* Title & meta */}
                    <div className="flex-1 pt-24 sm:pt-0 sm:self-end pb-4 space-y-2 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                            {movie.title}
                            {movie.year && (
                                <span className="text-muted-foreground font-normal ml-2 text-xl">
                                    ({movie.year})
                                </span>
                            )}
                        </h1>

                        {movie.tagline && (
                            <p className="text-muted-foreground italic text-sm">{movie.tagline}</p>
                        )}

                        {movie.tmdbRating && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                {movie.tmdbRating.toFixed(1)}
                                {movie.tmdbVoteCount && (
                                    <span className="text-xs">({movie.tmdbVoteCount.toLocaleString()})</span>
                                )}
                            </div>
                        )}

                        {/* Runtime pill + Genres */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {movie.runtime && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs border border-border bg-muted flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRuntime(movie.runtime)}
                                </span>
                            )}
                            {movie.genres.map(genre => (
                                <span
                                    key={genre}
                                    className="px-2.5 py-0.5 rounded-full text-xs border border-border bg-muted"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                {user && (
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        <Button onClick={() => setIsWatchFormOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {watchCount > 0 ? 'Log Another Watch' : 'Add to Watched'}
                        </Button>

                        <Button
                            variant={onWatchlist ? 'secondary' : 'outline'}
                            onClick={handleWatchlistToggle}
                            disabled={isTogglingWatchlist}
                            onMouseEnter={() => setWatchlistHover(true)}
                            onMouseLeave={() => setWatchlistHover(false)}
                        >
                            {onWatchlist ? (
                                watchlistHover ? (
                                    <><BookmarkPlus className="h-4 w-4 mr-2 text-destructive" />Remove from Watchlist</>
                                ) : (
                                    <><BookmarkCheck className="h-4 w-4 mr-2" />On Watchlist ✓</>
                                )
                            ) : (
                                <><BookmarkPlus className="h-4 w-4 mr-2" />Save to Watchlist</>
                            )}
                        </Button>

                        {watchCount > 0 && localMovieId && (
                            <Link
                                href={`/watched/${localMovieId}`}
                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                Watched {watchCount} {watchCount === 1 ? 'time' : 'times'} · view history
                            </Link>
                        )}
                    </div>
                )}

                {!user && (
                    <div className="mt-6 flex gap-3">
                        <Link href="/login">
                            <Button>Sign in to log watches</Button>
                        </Link>
                    </div>
                )}

                {/* Synopsis */}
                {movie.synopsis && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold mb-2">Overview</h2>
                        <p className="text-muted-foreground leading-relaxed">{movie.synopsis}</p>
                    </div>
                )}

                {/* Director */}
                {movie.directorName && (
                    <div className="mt-10">
                        <h2 className="text-lg font-semibold mb-4">Director</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 flex-shrink-0 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                                <span className="text-xl font-bold text-primary">
                                    {movie.directorName.charAt(0)}
                                </span>
                            </div>
                            <p className="font-semibold">{movie.directorName}</p>
                        </div>
                    </div>
                )}

                {/* Cast */}
                {movie.cast.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-lg font-semibold mb-4">Cast</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                            {movie.cast.map((member, i) => {
                                const profileUrl = member.profilePath
                                    ? `https://image.tmdb.org/t/p/w185${member.profilePath}`
                                    : null;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                            {profileUrl ? (
                                                <img
                                                    src={profileUrl}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl font-bold text-muted-foreground">
                                                    {member.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold leading-tight line-clamp-2">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {member.character}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* WatchForm dialog */}
            <WatchForm
                movie={tmdbMovieForForm}
                open={isWatchFormOpen}
                onOpenChange={setIsWatchFormOpen}
                onSuccess={handleWatchSuccess}
            />
        </div>
    );
}
