"use client";

import { memo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Star } from 'lucide-react';
import type { TmdbMovie } from '@/types';

interface MovieCardProps {
    movie: TmdbMovie;
    onAddToWatched: (movie: TmdbMovie) => void;
}

export const MovieCard = memo(function MovieCard({ movie, onAddToWatched }: MovieCardProps) {
    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : null;

    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null;

    const rating = movie.vote_average
        ? movie.vote_average.toFixed(1)
        : 'N/A';

    return (
        <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all flex flex-col h-full">
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
            </div>

            <CardContent className="p-4 space-y-2 flex-grow">
                <h3 className="font-semibold line-clamp-2 leading-tight">
                    {movie.title}
                </h3>

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
                <Button
                    onClick={() => onAddToWatched(movie)}
                    className="w-full"
                >
                    Add to Watched
                </Button>
            </CardFooter>
        </Card>
    );
});