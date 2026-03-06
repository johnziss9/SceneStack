"use client";
import { log } from '@/lib/logger';

import { useEffect, useState } from "react";
import { RecommendedMovie, TmdbMovie } from "@/types";
import { movieApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Film } from "lucide-react";
import { WatchForm } from "@/components/WatchForm";
import { RecommendationCard } from "@/components/RecommendationCard";

interface SimilarMoviesProps {
    tmdbId: number;
}

export function SimilarMovies({ tmdbId }: SimilarMoviesProps) {
    const [recommendations, setRecommendations] = useState<RecommendedMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        fetchRecommendations();
    }, [tmdbId]);

    const fetchRecommendations = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const data = await movieApi.getSimilarMovies(tmdbId);
            setRecommendations(data);
        } catch (err) {
            log.error("Failed to load similar movies", err);
            setError("Failed to load similar movies");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToWatched = (movie: TmdbMovie) => {
        setSelectedMovie(movie);
        setIsFormOpen(true);
    };

    const handleWatchSuccess = () => {
        toast.success("Watch logged successfully!");
        // Refresh recommendations (newly watched movie will be filtered out)
        fetchRecommendations();
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">More Like This</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton variant="poster" className="w-full rounded" />
                            <Skeleton variant="branded" className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">More Like This</h2>
                <Card>
                    <CardContent className="pt-6 pb-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <p className="text-destructive text-sm">{error}</p>
                            <Button onClick={fetchRecommendations} size="sm" variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Empty state
    if (recommendations.length === 0) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">More Like This</h2>
                <Card>
                    <CardContent className="pt-8 pb-8">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Film className="h-10 w-10 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                No similar movies found
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold">More Like This</h2>
                <p className="text-sm text-muted-foreground">
                    Based on genres, directors, writers, and cast
                </p>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recommendations.map((rec) => (
                    <RecommendationCard
                        key={rec.movie.id}
                        recommendation={rec}
                        onAddToWatched={handleAddToWatched}
                        referrer="similar"
                    />
                ))}
            </div>

            {/* Watch Form Dialog */}
            <WatchForm
                movie={selectedMovie}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={handleWatchSuccess}
            />
        </div>
    );
}
