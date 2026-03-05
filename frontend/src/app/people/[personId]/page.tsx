'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { movieApi } from '@/lib/api';
import type { TmdbPersonMovieCredits, TmdbMovie } from '@/types';
import { MovieCard } from '@/components/MovieCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Film } from 'lucide-react';

interface PersonDetailPageProps {
    params: Promise<{ personId: string }>;
}

export default function PersonDetailPage({ params }: PersonDetailPageProps) {
    const searchParams = useSearchParams();

    const [personId, setPersonId] = useState<number | null>(null);
    const [personName, setPersonName] = useState<string>('');
    const [movies, setMovies] = useState<TmdbMovie[]>([]);
    const [displayCount, setDisplayCount] = useState(20);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get referrer from URL params to determine back button
    const from = searchParams.get('from') || '';
    const tmdbId = searchParams.get('tmdbId') || '';
    const watchedId = searchParams.get('id') || '';
    const personNameParam = searchParams.get('name') || '';

    useEffect(() => {
        const loadParams = async () => {
            const resolvedParams = await params;
            const id = parseInt(resolvedParams.personId);
            setPersonId(id);

            if (personNameParam) {
                setPersonName(personNameParam);
            }
        };
        loadParams();
    }, [params, personNameParam]);

    useEffect(() => {
        const fetchPersonMovies = async () => {
            if (!personId) return;

            setIsLoading(true);
            setError(null);

            try {
                const credits = await movieApi.getPersonMovies(personId);

                // Combine cast and crew (directors, writers, screenwriters)
                const allCredits = [
                    ...credits.cast.map(c => ({ ...c, credit_type: 'cast' as const })),
                    ...credits.crew.filter(c =>
                        c.job === 'Director' ||
                        c.job === 'Screenplay' ||
                        c.job === 'Writer'
                    ).map(c => ({ ...c, credit_type: 'crew' as const }))
                ];

                // Remove duplicates and sort by popularity
                const uniqueMovies = Array.from(
                    new Map(allCredits.map(m => [m.id, m])).values()
                ).sort((a, b) => b.popularity - a.popularity);

                // Convert to TmdbMovie format for MovieCard
                const formattedMovies: TmdbMovie[] = uniqueMovies.map(movie => ({
                    id: movie.id,
                    title: movie.title,
                    release_date: movie.release_date,
                    poster_path: movie.poster_path,
                    overview: '',
                    vote_average: movie.vote_average,
                    vote_count: movie.vote_count
                }));

                setMovies(formattedMovies);
            } catch (err) {
                console.error('Failed to fetch person movies:', err);
                setError('Failed to load filmography. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPersonMovies();
    }, [personId]);

    const getBackButtonUrl = () => {
        if (from === 'movie' && tmdbId) {
            return `/movies/${tmdbId}`;
        } else if (from === 'watched' && watchedId) {
            return `/watched/${watchedId}`;
        } else {
            return '/';
        }
    };

    const handleLoadMore = () => {
        setDisplayCount(prev => prev + 20);
    };

    const handleAddToWatched = () => {
        // This will be handled by the MovieCard component
    };

    const backUrl = getBackButtonUrl();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container max-w-7xl mx-auto px-4 py-8">
                    <div className="space-y-6">
                        <div className="mb-4">
                            <Skeleton className="h-10 w-40" />
                        </div>
                        <Skeleton className="h-8 w-64" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <Skeleton key={i} className="h-80 w-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container max-w-7xl mx-auto px-4 py-8">
                    <div className="space-y-6">
                        <div className="mb-4">
                            <Link href={backUrl}>
                                <Button variant="outline" className="!border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Movie
                                </Button>
                            </Link>
                        </div>
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Film className="h-16 w-16 text-muted-foreground" />
                            <p className="text-xl text-muted-foreground">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-7xl mx-auto px-4 py-8">
                <div className="space-y-6">
                    <div className="mb-4">
                        <Link href={backUrl}>
                            <Button variant="outline" className="!border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Movie
                            </Button>
                        </Link>
                    </div>

                    {movies.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold">
                                        {personName ? `${personName} - Filmography` : 'Filmography'}
                                    </h1>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Showing {Math.min(displayCount, movies.length)} of {movies.length} movies, sorted by popularity
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {movies.slice(0, displayCount).map((movie) => (
                                    <MovieCard
                                        key={movie.id}
                                        movie={movie}
                                        onAddToWatched={handleAddToWatched}
                                    />
                                ))}
                            </div>
                            {movies.length > displayCount && (
                                <div className="flex justify-center py-8">
                                    <Button
                                        onClick={handleLoadMore}
                                        size="lg"
                                        variant="outline"
                                        className="!border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all"
                                    >
                                        Load More ({movies.length - displayCount} remaining)
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Film className="h-16 w-16 text-muted-foreground" />
                            <p className="text-xl text-muted-foreground">No movies found</p>
                            <p className="text-sm text-muted-foreground text-center max-w-md">
                                We couldn't find any movies for this person.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
