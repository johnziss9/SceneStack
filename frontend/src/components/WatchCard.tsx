"use client";

import { GroupedWatch } from "@/types/watch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye } from "lucide-react";
import Link from "next/link";

interface WatchCardProps {
    groupedWatch: GroupedWatch;
}

export function WatchCard({ groupedWatch }: WatchCardProps) {
    const { movie, watchCount, averageRating, watches } = groupedWatch;

    // Format average rating
    const avgRating = averageRating ? averageRating.toFixed(1) : null;

    // Get last watch for quick stats
    const lastWatch = watches[0]; // Already sorted by date descending from backend

    // Format last watched date
    const lastWatchedDate = new Date(lastWatch.watchedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    // Build poster URL
    const posterUrl = movie.posterPath
        ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
        : null;

    return (
        <Link href={`/watched/${movie.id}`}>
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
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No poster
                            </div>
                        )}

                        {/* Watch Count Badge (top-left) */}
                        {watchCount > 1 && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {watchCount}x
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
                    {avgRating && (
                        <div className="flex items-center gap-1">
                            <span className="text-2xl font-bold text-primary">
                                {avgRating}
                            </span>
                            <span className="text-sm text-muted-foreground">/10</span>
                        </div>
                    )}

                    {/* Quick Stats - Last Watch Info */}
                    <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                        <p>Last watched: {lastWatchedDate}</p>
                        {lastWatch.watchLocation && (
                            <p className="flex items-center gap-1">
                                {lastWatch.watchLocation === "Cinema" ? "🎬" : "🏠"} {lastWatch.watchLocation}
                            </p>
                        )}
                        {lastWatch.watchedWith && (
                            <p className="truncate">With: {lastWatch.watchedWith}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}