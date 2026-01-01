"use client";

import { useEffect, useState } from "react";
import { GroupedWatch } from "@/types/watch";
import { watchApi } from "@/lib";
import { WatchCard } from "./WatchCard";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function WatchList() {
    const [groupedWatches, setGroupedWatches] = useState<GroupedWatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch watches on mount
    useEffect(() => {
        fetchWatches();
    }, []);

    const fetchWatches = async () => {
        try {
            setIsLoading(true);
            setError(null);
            // Hardcoded userId: 1 for Phase 1
            const data = await watchApi.getGroupedWatches(1);
            setGroupedWatches(data);
        } catch (err) {
            console.error("Failed to fetch watches:", err);
            toast.error("Failed to load watches", {
                description: "Please try again later",
            });
            setError("Failed to load watches. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="h-[450px] w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-destructive">{error}</p>
                <button
                    onClick={fetchWatches}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (groupedWatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-xl text-muted-foreground">No watches yet</p>
                <p className="text-sm text-muted-foreground">
                    Start by searching for a movie to add to your watched list
                </p>

                <a href="/"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Search Movies
                </a>
            </div>
        );
    }

    // Watches grid
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {groupedWatches.map((groupedWatch) => (
                <WatchCard
                    key={groupedWatch.movieId}
                    groupedWatch={groupedWatch}
                />
            ))}
        </div>
    );
}