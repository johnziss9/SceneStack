"use client";

import { memo } from "react";
import { GroupedWatch } from "@/types/watch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, Lock, Users } from "lucide-react";
import Link from "next/link";

interface WatchCardProps {
    groupedWatch: GroupedWatch;
}

export const WatchCard = memo(function WatchCard({ groupedWatch }: WatchCardProps) {
    const { movie, watchCount, averageRating, watches } = groupedWatch;

    // Format rating to show whole numbers without decimals, or .5 ratings
    const avgRating = averageRating
        ? (averageRating % 1 === 0 ? averageRating.toString() : averageRating.toFixed(1))
        : null;
    const lastWatch = watches[0];

    const lastWatchedDate = new Date(lastWatch.watchedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    const posterUrl = movie.posterPath
        ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
        : null;

    // Determine privacy status
    const allPrivate = watches.every(w => w.isPrivate);
    const allShared = watches.every(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);
    const hasShared = watches.some(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);

    return (
        <Link href={`/watched/${movie.id}`} className="flex flex-col h-full">
            <Card className="flex flex-col h-full overflow-hidden transition-all hover:ring-2 hover:ring-primary duration-200">
                <CardHeader className="p-0">
                    <div className="aspect-[2/3] bg-muted relative">
                        {posterUrl ? (
                            <>
                                <img
                                    src={posterUrl}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No poster
                            </div>
                        )}

                        {watchCount > 1 && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {watchCount}x
                            </div>
                        )}

                        {/* Privacy indicator - bottom right */}
                        {allPrivate && (
                            <div className="absolute bottom-2 right-2 bg-orange-500 text-white p-1.5 rounded-full">
                                <Lock className="w-3.5 h-3.5" />
                            </div>
                        )}
                        {!allPrivate && hasShared && (
                            <div className="absolute bottom-2 right-2 bg-orange-500 text-white p-1.5 rounded-full">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-base line-clamp-2 mb-1 hover:underline">
                        {movie.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-2">
                        {movie.year || '\u00A0'}
                    </p>

                    {/* Rating - fixed height */}
                    <div className="h-9 mb-2 flex items-center">
                        {avgRating ? (
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold text-primary">
                                    {avgRating}
                                </span>
                                <span className="text-sm text-muted-foreground">/10</span>
                            </div>
                        ) : null}
                    </div>

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
});
