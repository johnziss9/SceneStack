"use client";

import { useEffect, useState } from "react";
import { GroupRecommendationStats, GroupRecommendation } from "@/types";
import { groupApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Users, Eye, TrendingUp, Calendar, Star } from "lucide-react";
import Link from "next/link";

interface GroupRecommendationsProps {
    groupId: number;
}

export function GroupRecommendations({ groupId }: GroupRecommendationsProps) {
    const [stats, setStats] = useState<GroupRecommendationStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRecommendations();
    }, [groupId]);

    const fetchRecommendations = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await groupApi.getRecommendationStats(groupId);
            setStats(data);
        } catch (err) {
            console.error("Failed to fetch recommendations:", err);
            toast.error("Failed to load recommendations", {
                description: "Please try again later",
            });
            setError("Failed to load recommendations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Stats Skeleton */}
                <Card>
                    <CardHeader>
                        <CardTitle>Group Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations Skeleton */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recommended Movies</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-[2/3] w-full rounded" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchRecommendations}>Try Again</Button>
            </div>
        );
    }

    // Empty state (new group with no watches)
    if (!stats || stats.totalWatches === 0) {
        return (
            <Card>
                <CardContent className="pt-12 pb-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Film className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-xl text-muted-foreground">No recommendations yet</p>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            Start watching movies and sharing them with your group to get personalized recommendations!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Group Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Group Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Eye size={16} />
                                <span>Total Watches</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">
                                {stats.totalWatches}
                            </span>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Film size={16} />
                                <span>Unique Movies</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">
                                {stats.uniqueMovies}
                            </span>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Users size={16} />
                                <span>Active Viewers</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">
                                {stats.uniqueViewers}
                            </span>
                        </div>

                        {stats.mostWatchedGenre && (
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <TrendingUp size={16} />
                                    <span>Top Genre</span>
                                </div>
                                <span className="text-lg font-semibold text-primary truncate">
                                    {stats.mostWatchedGenre}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recommended Movies */}
            <Card>
                <CardHeader>
                    <CardTitle>Recommended Movies</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.recommendations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Film className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                                All popular movies have been watched by the group!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {stats.recommendations.map((movie) => (
                                <RecommendationCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Individual recommendation card component
interface RecommendationCardProps {
    movie: GroupRecommendation;
}

function RecommendationCard({ movie }: RecommendationCardProps) {
    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : null;

    const year = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

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
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No poster
                    </div>
                )}
            </div>

            <CardContent className="p-3 space-y-2 flex-grow">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                    {movie.title}
                </h3>

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

                {movie.overview && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        {movie.overview}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}