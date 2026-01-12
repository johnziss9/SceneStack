'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import type { AiSearchResponse } from '@/types';
import React from 'react';

interface AiSearchResultsProps {
    results: AiSearchResponse | null;
    isLoading?: boolean;
}

export const AiSearchResults = memo(function AiSearchResults({
    results,
    isLoading = false
}: AiSearchResultsProps) {

    // Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <Card key={i} className="flex flex-col h-full overflow-hidden">
                        <CardHeader className="p-0">
                            <Skeleton className="aspect-[2/3] w-full" />
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Empty state
    if (!results || results.results.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">
                    No matches found. Try a different search query.
                </p>
            </div>
        );
    }

    // Deduplicate by movie - keep only first watch per movie
    const deduplicatedResults = React.useMemo(() => {
        const seen = new Set<number>();
        return results.results.filter(watch => {
            if (seen.has(watch.movie.id)) {
                return false;
            }
            seen.add(watch.movie.id);
            return true;
        });
    }, [results.results]);

    // Results
    return (
        <div>
            <p className="text-sm text-muted-foreground mb-4">
                Found {deduplicatedResults.length} {deduplicatedResults.length === 1 ? 'movie' : 'movies'}
                {deduplicatedResults.length < results.totalMatches && (
                    <span className="text-xs ml-2">
                        ({results.totalMatches} total {results.totalMatches === 1 ? 'watch' : 'watches'})
                    </span>
                )}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {deduplicatedResults.map((watch) => {
                    const { movie } = watch;
                    const posterUrl = movie.posterPath
                        ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
                        : null;

                    const watchDate = new Date(watch.watchedDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    });

                    const params = new URLSearchParams(window.location.search);
                    const detailUrl = `/watched/${movie.id}?${params.toString()}`;

                    return (
                        <Link key={watch.id} href={detailUrl}>
                            <Card className="flex flex-col h-full overflow-hidden transition-all hover:ring-2 hover:ring-primary hover:scale-[1.02] hover:-translate-y-1 cursor-pointer duration-200">
                                <CardHeader className="p-0">
                                    {/* Poster Image */}
                                    <div className="aspect-[2/3] bg-muted relative group">
                                        {posterUrl ? (
                                            <>
                                                <img
                                                    src={posterUrl}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                                No poster
                                            </div>
                                        )}

                                        {/* Rewatch Badge */}
                                        {watch.isRewatch && (
                                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                                                Rewatch
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-3 space-y-2">
                                    {/* Title */}
                                    <h3 className="font-semibold text-base line-clamp-2 mb-1">
                                        {movie.title}
                                    </h3>

                                    {/* Year */}
                                    {movie.year && (
                                        <p className="text-sm text-muted-foreground">{movie.year}</p>
                                    )}

                                    {/* Rating */}
                                    {watch.rating && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-bold text-primary">
                                                {watch.rating}
                                            </span>
                                            <span className="text-sm text-muted-foreground">/10</span>
                                        </div>
                                    )}

                                    {/* Watch Details */}
                                    <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                                        <p className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {watchDate}
                                        </p>
                                        {watch.watchLocation && (
                                            <p className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {watch.watchLocation}
                                            </p>
                                        )}
                                        {watch.watchedWith && (
                                            <p className="flex items-center gap-1 truncate">
                                                <Users className="w-3 h-3" />
                                                {watch.watchedWith}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
});