"use client";

import { useEffect, useState } from "react";
import { GroupFeedItem } from "@/types";
import { groupApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, MapPin, Users as UsersIcon, ChevronDown } from "lucide-react";
import Link from "next/link";

interface GroupFeedProps {
    groupId: number;
}

export function GroupFeed({ groupId }: GroupFeedProps) {
    const [feedItems, setFeedItems] = useState<GroupFeedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const TAKE = 20;

    // Fetch initial feed on mount
    useEffect(() => {
        fetchFeed(0);
    }, [groupId]);

    const fetchFeed = async (skipCount: number) => {
        try {
            if (skipCount === 0) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }
            setError(null);

            const data = await groupApi.getFeed(groupId, skipCount, TAKE);

            if (skipCount === 0) {
                setFeedItems(data);
            } else {
                setFeedItems((prev) => [...prev, ...data]);
            }

            // If we got less than TAKE items, there's no more
            setHasMore(data.length === TAKE);
            setSkip(skipCount + data.length);
        } catch (err) {
            console.error("Failed to fetch group feed:", err);
            toast.error("Failed to load group feed", {
                description: "Please try again later",
            });
            setError("Failed to load group feed. Please try again.");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchFeed(skip);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex gap-4">
                                <Skeleton className="w-16 h-24 rounded flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={() => fetchFeed(0)}>Try Again</Button>
            </div>
        );
    }

    // Empty state
    if (feedItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="text-muted-foreground text-6xl">
                    <Eye size={64} />
                </div>
                <p className="text-xl text-muted-foreground">No watches yet</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    Group members haven&apos;t shared any watches yet. Start watching movies and share them with the group!
                </p>
            </div>
        );
    }

    // Feed list
    return (
        <div className="space-y-4">
            {feedItems.map((item) => {
                const posterUrl = item.posterPath
                    ? `https://image.tmdb.org/t/p/w185${item.posterPath}`
                    : null;

                const watchedDate = new Date(item.watchedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });

                return (
                    <Card
                        key={item.id}
                        className="overflow-hidden hover:border-primary transition-colors"
                    >
                        <CardContent className="p-4">
                            <div className="flex gap-4">
                                {/* Movie Poster */}
                                <Link
                                    href={`/watched/${item.movieId}`}
                                    className="flex-shrink-0"
                                >
                                    {posterUrl ? (
                                        <img
                                            src={posterUrl}
                                            alt={item.movieTitle}
                                            className="w-16 h-24 object-cover rounded hover:opacity-80 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-16 h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                            No poster
                                        </div>
                                    )}
                                </Link>

                                {/* Watch Info */}
                                <div className="flex-1 min-w-0">
                                    {/* User and Movie */}
                                    <div className="mb-2">
                                        <span className="font-semibold text-primary">
                                            {item.username}
                                        </span>
                                        <span className="text-muted-foreground"> watched </span>
                                        <Link
                                            href={`/watched/${item.movieId}`}
                                            className="font-semibold hover:text-primary transition-colors"
                                        >
                                            {item.movieTitle}
                                        </Link>
                                        {item.isRewatch && (
                                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                                Rewatch
                                            </span>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {watchedDate}
                                    </p>

                                    {/* Rating */}
                                    {item.rating && (
                                        <div className="flex items-center gap-1 mb-2">
                                            <span className="text-lg font-bold text-primary">
                                                {item.rating}
                                            </span>
                                            <span className="text-xs text-muted-foreground">/10</span>
                                        </div>
                                    )}

                                    {/* Additional Info */}
                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        {item.watchLocation && (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                <span>{item.watchLocation}</span>
                                            </div>
                                        )}
                                        {item.watchedWith && (
                                            <div className="flex items-center gap-1">
                                                <UsersIcon size={14} />
                                                <span className="truncate">{item.watchedWith}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {item.notes && (
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                            &quot;{item.notes}&quot;
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            "Loading..."
                        ) : (
                            <>
                                <ChevronDown className="mr-2 h-4 w-4" />
                                Load More
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}