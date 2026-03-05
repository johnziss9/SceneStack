"use client";

import { useEffect, useState } from "react";
import { RecommendedMovie, TmdbMovie } from "@/types";
import { watchApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTips } from "@/components/LoadingTips";
import { Film } from "lucide-react";
import { WatchForm } from "@/components/WatchForm";
import { RecommendationCard } from "@/components/RecommendationCard";
import { useAuth } from "@/contexts/AuthContext";

export function UserRecommendations() {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState<RecommendedMovie[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTier, setCurrentTier] = useState<string>("");
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch first page of recommendations
            const data = await watchApi.getRecommendations(1, PAGE_SIZE);
            setRecommendations(data.items);
            setCurrentPage(1);
            setHasMore(data.hasMore);
            setCurrentTier(data.currentTier);
        } catch (err) {
            toast.error("Failed to load recommendations", {
                description: "Please try again later",
            });
            setError("Failed to load recommendations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) return;

        try {
            setIsLoadingMore(true);
            const nextPage = currentPage + 1;

            const data = await watchApi.getRecommendations(nextPage, PAGE_SIZE);

            setRecommendations(prev => [...prev, ...data.items]);
            setCurrentPage(nextPage);
            setHasMore(data.hasMore);
            setCurrentTier(data.currentTier);
        } catch (err) {
            toast.error("Failed to load more recommendations");
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleAddToWatched = (movie: TmdbMovie) => {
        if (!user) {
            toast.error("Please sign in to log watches");
            return;
        }
        setSelectedMovie(movie);
        setIsFormOpen(true);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <LoadingTips />
                {/* Recommendations Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
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
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchInitialData}>Try Again</Button>
            </div>
        );
    }

    // Empty state
    if (recommendations.length === 0) {
        return (
            <Card>
                <CardContent className="pt-12 pb-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Film className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-xl text-muted-foreground">No recommendations yet</p>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            Start watching and rating movies to get personalized recommendations!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Recommended for You</h2>
                <p className="text-muted-foreground">
                    Based on {recommendations.length > 0 ? "your watch history" : "popular movies"}
                </p>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {recommendations.map((rec) => (
                    <RecommendationCard
                        key={rec.movie.id}
                        recommendation={rec}
                        onAddToWatched={handleAddToWatched}
                        referrer="watches"
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center pt-6">
                    <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}

            {/* Watch Form Dialog */}
            <WatchForm
                movie={selectedMovie}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={() => {
                    toast.success("Watch logged successfully!");
                    // Refresh recommendations after adding a watch
                    fetchInitialData();
                }}
            />
        </div>
    );
}
