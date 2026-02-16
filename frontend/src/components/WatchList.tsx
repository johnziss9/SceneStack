"use client";

import { useEffect, useState } from "react";
import { GroupedWatch } from "@/types/watch";
import { watchApi } from "@/lib";
import { WatchCard } from "./WatchCard";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { groupApi } from "@/lib/api";
import type { GroupBasicInfo } from "@/types";
import { BulkMakePrivateDialog } from "./BulkMakePrivateDialog";
import { BulkShareWithGroupsDialog } from "./BulkShareWithGroupsDialog";

export function WatchList() {
    const [groupedWatches, setGroupedWatches] = useState<GroupedWatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);

    // Bulk mode state
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedMovieIds, setSelectedMovieIds] = useState<Set<number>>(new Set());
    const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'shared'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showMakePrivateDialog, setShowMakePrivateDialog] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);

    // Fetch watches on mount
    useEffect(() => {
        fetchWatches();
    }, []);

    // Fetch user's groups on mount
    useEffect(() => {
        fetchUserGroups();
    }, []);

    const fetchWatches = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await watchApi.getGroupedWatches();
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

    const fetchUserGroups = async () => {
        try {
            setIsLoadingGroups(true);
            const groups = await groupApi.getUserGroups();
            setUserGroups(groups);
        } catch (err) {
            console.error("Failed to fetch groups:", err);
            // Don't show error toast, groups filter is optional
        } finally {
            setIsLoadingGroups(false);
        }
    };

    // Bulk mode handlers
    const enterBulkMode = () => {
        setIsBulkMode(true);
        setSelectedMovieIds(new Set());
    };

    const exitBulkMode = () => {
        setIsBulkMode(false);
        setSelectedMovieIds(new Set());
    };

    const toggleMovieSelection = (movieId: number) => {
        setSelectedMovieIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(movieId)) {
                newSet.delete(movieId);
            } else {
                newSet.add(movieId);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        // Get all movie IDs from filtered watches
        const allMovieIds = filteredWatches.map(gw => gw.movieId);
        setSelectedMovieIds(new Set(allMovieIds));
    };

    const deselectAll = () => {
        setSelectedMovieIds(new Set());
    };

    const handleBulkMakePrivate = async () => {
        try {
            setIsProcessing(true);
            // Get all watch IDs from selected movies
            const watchIds = filteredWatches
                .filter(gw => selectedMovieIds.has(gw.movieId))
                .flatMap(gw => gw.watches.map(w => w.id));

            const result = await watchApi.bulkUpdate({
                watchIds,
                isPrivate: true,
                groupIds: [],
                groupOperation: 'replace'
            });

            if (result.success) {
                toast.success(`Made ${result.updated} ${result.updated === 1 ? 'movie' : 'movies'} private`);
                await fetchWatches(); // Refresh the list
                exitBulkMode();
            } else {
                toast.error('Some movies failed to update', {
                    description: result.errors.join(', ')
                });
            }
        } catch (err) {
            console.error("Bulk make private failed:", err);
            toast.error("Failed to update movies");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkShareWithGroups = async (groupIds: number[], operation: 'add' | 'replace') => {
        try {
            setIsProcessing(true);
            // Get all watch IDs from selected movies
            const watchIds = filteredWatches
                .filter(gw => selectedMovieIds.has(gw.movieId))
                .flatMap(gw => gw.watches.map(w => w.id));

            const result = await watchApi.bulkUpdate({
                watchIds,
                isPrivate: false,
                groupIds,
                groupOperation: operation
            });

            if (result.success) {
                toast.success(`Updated sharing for ${result.updated} ${result.updated === 1 ? 'movie' : 'movies'}`);
                await fetchWatches(); // Refresh the list
                exitBulkMode();
            } else {
                toast.error('Some movies failed to update', {
                    description: result.errors.join(', ')
                });
            }
        } catch (err) {
            console.error("Bulk share failed:", err);
            toast.error("Failed to update movies");
        } finally {
            setIsProcessing(false);
        }
    };

    // Filter watches by privacy
    const privacyFilteredWatches = groupedWatches.filter(gw => {
        if (privacyFilter === 'all') return true;
        if (privacyFilter === 'private') {
            return gw.watches.some(w => w.isPrivate);
        }
        if (privacyFilter === 'shared') {
            return gw.watches.some(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);
        }
        return true;
    });

    // Filter watches by selected group
    const filteredWatches = selectedGroupId
        ? privacyFilteredWatches.filter(gw =>
            gw.watches.some(w => w.groupIds?.includes(selectedGroupId))
        )
        : privacyFilteredWatches;

    // Check if all visible movies are selected
    const allVisibleMovieIds = filteredWatches.map(gw => gw.movieId);
    const allSelected = allVisibleMovieIds.length > 0 &&
        allVisibleMovieIds.every(id => selectedMovieIds.has(id));

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
                <div className="text-muted-foreground text-6xl">📽️</div>
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
        <div className="space-y-6">
            {/* Header with Bulk Edit Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Privacy Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium whitespace-nowrap">
                            Show:
                        </label>
                        <Select
                            value={privacyFilter}
                            onValueChange={(value) => setPrivacyFilter(value as any)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All watches</SelectItem>
                                <SelectItem value="private">Private only</SelectItem>
                                <SelectItem value="shared">Shared only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Group Filter */}
                    {userGroups.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium whitespace-nowrap">
                                Group:
                            </label>
                            <Select
                                value={selectedGroupId?.toString() || "all"}
                                onValueChange={(value) => setSelectedGroupId(value === "all" ? null : parseInt(value))}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All groups" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All groups</SelectItem>
                                    {userGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id.toString()}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Result Count */}
                    <span className="text-sm text-muted-foreground">
                        {filteredWatches.length} {filteredWatches.length === 1 ? 'movie' : 'movies'}
                    </span>
                </div>

                {/* Bulk Edit Toggle */}
                {!isBulkMode ? (
                    <Button onClick={enterBulkMode} variant="outline">
                        Bulk Edit
                    </Button>
                ) : (
                    <Button onClick={exitBulkMode} variant="outline">
                        Exit Bulk Mode
                    </Button>
                )}
            </div>

            {/* Bulk Mode: Select All Bar */}
            {isBulkMode && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    selectAll();
                                } else {
                                    deselectAll();
                                }
                            }}
                        />
                        <span className="text-sm font-medium">
                            {allSelected ? 'Deselect all' : 'Select all'} ({filteredWatches.length} {filteredWatches.length === 1 ? 'movie' : 'movies'})
                        </span>
                    </label>

                    {selectedMovieIds.size > 0 && (
                        <span className="text-sm text-primary font-semibold">
                            {selectedMovieIds.size} {selectedMovieIds.size === 1 ? 'movie' : 'movies'} selected
                        </span>
                    )}
                </div>
            )}

            {/* Watches Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredWatches.map((groupedWatch) => (
                    <div key={groupedWatch.movieId} className="relative">
                        {/* Clickable overlay in bulk mode */}
                        {isBulkMode && (
                            <div
                                className="absolute inset-0 z-10 cursor-pointer"
                                onClick={() => toggleMovieSelection(groupedWatch.movieId)}
                            >
                                {/* Checkbox with visible border */}
                                <div className="absolute top-2 right-2 pointer-events-none">
                                    <Checkbox
                                        checked={selectedMovieIds.has(groupedWatch.movieId)}
                                        className="bg-background border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                </div>
                            </div>
                        )}
                        <WatchCard
                            key={groupedWatch.movieId}
                            groupedWatch={groupedWatch}
                        />
                    </div>
                ))}
            </div>

            {/* Bulk Actions Bar (Fixed at bottom) */}
            {isBulkMode && selectedMovieIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">
                            {selectedMovieIds.size} {selectedMovieIds.size === 1 ? 'movie' : 'movies'} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowMakePrivateDialog(true)}
                                disabled={isProcessing}
                            >
                                Make Private
                            </Button>
                            <Button
                                onClick={() => setShowShareDialog(true)}
                                disabled={isProcessing}
                            >
                                Share with Groups
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Dialogs */}
            <BulkMakePrivateDialog
                open={showMakePrivateDialog}
                onOpenChange={setShowMakePrivateDialog}
                selectedCount={selectedMovieIds.size}
                onConfirm={handleBulkMakePrivate}
            />
            <BulkShareWithGroupsDialog
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                selectedCount={selectedMovieIds.size}
                onConfirm={handleBulkShareWithGroups}
            />
        </div>
    );
}