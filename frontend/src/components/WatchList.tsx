"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GroupedWatch, GetGroupedWatchesParams } from "@/types/watch";
import { watchApi } from "@/lib";
import { WatchCard } from "./WatchCard";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { groupApi } from "@/lib/api";
import type { GroupBasicInfo } from "@/types";
import { BulkMakePrivateDialog } from "./BulkMakePrivateDialog";
import { BulkShareWithGroupsDialog } from "./BulkShareWithGroupsDialog";
import { Film, Filter, X } from "lucide-react";

const PAGE_SIZE = 20;
const FILTERS_STORAGE_KEY = "watchFilters";

interface FilterState {
    search: string;
    ratingMin: string;
    ratingMax: string;
    watchedFrom: string;
    watchedTo: string;
    rewatchOnly: boolean;
    unratedOnly: boolean;
    sortBy: string;
    privacyFilter: "all" | "private" | "shared";
    groupId: string;
}

const DEFAULT_FILTERS: FilterState = {
    search: "",
    ratingMin: "",
    ratingMax: "",
    watchedFrom: "",
    watchedTo: "",
    rewatchOnly: false,
    unratedOnly: false,
    sortBy: "recentlyWatched",
    privacyFilter: "all",
    groupId: "",
};

function readFiltersFromUrl(searchParams: ReturnType<typeof useSearchParams>): FilterState {
    return {
        search: searchParams.get("search") ?? "",
        ratingMin: searchParams.get("ratingMin") ?? "",
        ratingMax: searchParams.get("ratingMax") ?? "",
        watchedFrom: searchParams.get("watchedFrom") ?? "",
        watchedTo: searchParams.get("watchedTo") ?? "",
        rewatchOnly: searchParams.get("rewatchOnly") === "true",
        unratedOnly: searchParams.get("unratedOnly") === "true",
        sortBy: searchParams.get("sortBy") ?? "recentlyWatched",
        privacyFilter: (searchParams.get("privacyFilter") as FilterState["privacyFilter"]) ?? "all",
        groupId: searchParams.get("groupId") ?? "",
    };
}

function filtersToParams(filters: FilterState): GetGroupedWatchesParams {
    return {
        search: filters.search || undefined,
        ratingMin: filters.ratingMin ? parseInt(filters.ratingMin) : undefined,
        ratingMax: filters.ratingMax ? parseInt(filters.ratingMax) : undefined,
        watchedFrom: filters.watchedFrom || undefined,
        watchedTo: filters.watchedTo || undefined,
        rewatchOnly: filters.rewatchOnly || undefined,
        unratedOnly: filters.unratedOnly || undefined,
        sortBy: (filters.sortBy as GetGroupedWatchesParams["sortBy"]) || undefined,
        groupId: filters.groupId ? parseInt(filters.groupId) : undefined,
    };
}

function countActiveFilters(filters: FilterState): number {
    let count = 0;
    if (filters.search) count++;
    if (filters.ratingMin) count++;
    if (filters.ratingMax) count++;
    if (filters.watchedFrom) count++;
    if (filters.watchedTo) count++;
    if (filters.rewatchOnly) count++;
    if (filters.unratedOnly) count++;
    if (filters.privacyFilter !== "all") count++;
    if (filters.groupId) count++;
    return count;
}

export function WatchList() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialise filters from URL, fallback to localStorage
    const [filters, setFilters] = useState<FilterState>(() => {
        const fromUrl = readFiltersFromUrl(searchParams);
        const hasUrlParams = Array.from(searchParams.keys()).some(k =>
            Object.keys(DEFAULT_FILTERS).includes(k)
        );
        if (hasUrlParams) return fromUrl;
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
                if (stored) return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
            } catch {
                // ignore
            }
        }
        return DEFAULT_FILTERS;
    });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [groupedWatches, setGroupedWatches] = useState<GroupedWatch[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [hasAnyWatches, setHasAnyWatches] = useState<boolean | null>(null);

    // Bulk mode state
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedMovieIds, setSelectedMovieIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [showMakePrivateDialog, setShowMakePrivateDialog] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);

    // Debounce search
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

    // Sync debounced search when search changes
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [filters.search]);

    // Persist filters to URL + localStorage whenever they change
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.ratingMin) params.set("ratingMin", filters.ratingMin);
        if (filters.ratingMax) params.set("ratingMax", filters.ratingMax);
        if (filters.watchedFrom) params.set("watchedFrom", filters.watchedFrom);
        if (filters.watchedTo) params.set("watchedTo", filters.watchedTo);
        if (filters.rewatchOnly) params.set("rewatchOnly", "true");
        if (filters.unratedOnly) params.set("unratedOnly", "true");
        if (filters.sortBy !== "recentlyWatched") params.set("sortBy", filters.sortBy);
        if (filters.privacyFilter !== "all") params.set("privacyFilter", filters.privacyFilter);
        if (filters.groupId) params.set("groupId", filters.groupId);

        // Preserve non-filter params (e.g. mode=ai-search)
        const existing = new URLSearchParams(searchParams.toString());
        const filterKeys = new Set(["search", "ratingMin", "ratingMax", "watchedFrom", "watchedTo", "rewatchOnly", "unratedOnly", "sortBy", "privacyFilter", "groupId"]);
        existing.forEach((_, key) => { if (filterKeys.has(key)) existing.delete(key); });
        params.forEach((val, key) => existing.set(key, val));

        router.replace(`/watched?${existing.toString()}`, { scroll: false });

        try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
        } catch {
            // ignore
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    // Fetch watches when filters (debounced for search) or page changes
    const fetchWatches = useCallback(async (activeFilters: FilterState, page: number, append: boolean, initial = false) => {
        try {
            if (append) setIsLoadingMore(true);
            else if (initial) setIsInitialLoad(true);
            else setIsRefetching(true);
            setError(null);

            const params: GetGroupedWatchesParams = {
                ...filtersToParams(activeFilters),
                page,
                pageSize: PAGE_SIZE,
            };

            const data = await watchApi.getGroupedWatches(params);

            if (append) {
                setGroupedWatches(prev => [...prev, ...(data.items ?? [])]);
            } else {
                setGroupedWatches(data.items ?? []);
                // Track whether the user has any watches at all (unfiltered)
                if (hasAnyWatches === null) {
                    setHasAnyWatches((data.totalCount ?? 0) > 0 || data.items.length > 0);
                }
            }
            setHasMore(data.hasMore ?? false);
            setCurrentPage(page);
            setTotalCount(data.totalCount ?? 0);
        } catch (err) {
            console.error("Failed to fetch watches:", err);
            toast.error("Failed to load watches", { description: "Please try again later" });
            setError("Failed to load watches. Please try again.");
        } finally {
            setIsInitialLoad(false);
            setIsRefetching(false);
            setIsLoadingMore(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch when debounced search or other filters change (non-search filters trigger immediately)
    const filtersForFetch = { ...filters, search: debouncedSearch };
    const filtersKey = JSON.stringify(filtersForFetch);

    const isFirstRender = useRef(true);
    useEffect(() => {
        const initial = isFirstRender.current;
        isFirstRender.current = false;
        fetchWatches(filtersForFetch, 1, false, initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey]);

    // Fetch user's groups on mount
    useEffect(() => {
        groupApi.getUserGroups()
            .then(groups => setUserGroups(groups))
            .catch(() => { /* groups filter is optional */ });
    }, []);

    const updateFilter = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
        setGroupedWatches([]);
        setHasMore(false);
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setGroupedWatches([]);
        setHasMore(false);
        setCurrentPage(1);
        setFilters(DEFAULT_FILTERS);
        try { localStorage.removeItem(FILTERS_STORAGE_KEY); } catch { /* ignore */ }
    };

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) return;
        const nextPage = currentPage + 1;
        await fetchWatches(filtersForFetch, nextPage, true);
    };

    // Bulk mode handlers
    const enterBulkMode = () => { setIsBulkMode(true); setSelectedMovieIds(new Set()); };
    const exitBulkMode = () => { setIsBulkMode(false); setSelectedMovieIds(new Set()); };

    const toggleMovieSelection = (movieId: number) => {
        setSelectedMovieIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(movieId)) newSet.delete(movieId);
            else newSet.add(movieId);
            return newSet;
        });
    };

    const selectAll = () => setSelectedMovieIds(new Set(filteredWatches.map(gw => gw.movieId)));
    const deselectAll = () => setSelectedMovieIds(new Set());

    const handleBulkMakePrivate = async () => {
        try {
            setIsProcessing(true);
            const watchIds = filteredWatches
                .filter(gw => selectedMovieIds.has(gw.movieId))
                .flatMap(gw => gw.watches.map(w => w.id));
            const result = await watchApi.bulkUpdate({ watchIds, isPrivate: true, groupIds: [], groupOperation: "replace" });
            if (result.success) {
                toast.success(`Made ${result.updated} ${result.updated === 1 ? "movie" : "movies"} private`);
                await fetchWatches(filtersForFetch, 1, false);
                exitBulkMode();
            } else {
                toast.error("Some movies failed to update", { description: result.errors.join(", ") });
            }
        } catch {
            toast.error("Failed to update movies");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkShareWithGroups = async (groupIds: number[], operation: "add" | "replace") => {
        try {
            setIsProcessing(true);
            const watchIds = filteredWatches
                .filter(gw => selectedMovieIds.has(gw.movieId))
                .flatMap(gw => gw.watches.map(w => w.id));
            const result = await watchApi.bulkUpdate({ watchIds, isPrivate: false, groupIds, groupOperation: operation });
            if (result.success) {
                toast.success(`Updated sharing for ${result.updated} ${result.updated === 1 ? "movie" : "movies"}`);
                await fetchWatches(filtersForFetch, 1, false);
                exitBulkMode();
            } else {
                toast.error("Some movies failed to update", { description: result.errors.join(", ") });
            }
        } catch {
            toast.error("Failed to update movies");
        } finally {
            setIsProcessing(false);
        }
    };

    // Client-side privacy filter (applied after server fetch)
    const filteredWatches = groupedWatches.filter(gw => {
        if (filters.privacyFilter === "all") return true;
        if (filters.privacyFilter === "private") return gw.watches.some(w => w.isPrivate);
        if (filters.privacyFilter === "shared") return gw.watches.some(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);
        return true;
    });

    const allVisibleMovieIds = filteredWatches.map(gw => gw.movieId);
    const allSelected = allVisibleMovieIds.length > 0 && allVisibleMovieIds.every(id => selectedMovieIds.has(id));
    const activeFilterCount = countActiveFilters(filters);

    // Full-page skeleton only on very first load
    if (isInitialLoad) {
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
                    onClick={() => fetchWatches(filtersForFetch, 1, false)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // True empty state — no watches at all
    if (groupedWatches.length === 0 && activeFilterCount === 0 && hasAnyWatches !== true) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Film className="h-16 w-16 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">No watches yet</p>
                <p className="text-sm text-muted-foreground">
                    Start by searching for a movie to add to your watched list
                </p>
                <a href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                    Search Movies
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar: Filters toggle + Bulk Edit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filters toggle */}
                    <Button
                        variant="outline"
                        onClick={() => setFiltersOpen(prev => !prev)}
                        className="gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                            <X className="h-3 w-3" />
                            Clear all
                        </Button>
                    )}

                    {/* Result count / loading indicator */}
                    <span className="text-sm text-muted-foreground">
                        {isRefetching
                            ? "Searching…"
                            : `${filteredWatches.length} of ${totalCount} ${totalCount === 1 ? "movie" : "movies"}`
                        }
                    </span>
                </div>

                {/* Bulk Edit toggle */}
                {!isBulkMode ? (
                    <Button onClick={enterBulkMode} variant="outline">Bulk Edit</Button>
                ) : (
                    <Button onClick={exitBulkMode} variant="outline">Exit Bulk Mode</Button>
                )}
            </div>

            {/* Collapsible filter panel */}
            {filtersOpen && (
                <div className="rounded-lg border bg-card p-4 space-y-4">
                    {/* Row 1: Search + Sort */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title search</Label>
                            <Input
                                placeholder="Search movies…"
                                value={filters.search}
                                onChange={e => updateFilter("search", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sort by</Label>
                            <Select value={filters.sortBy} onValueChange={v => updateFilter("sortBy", v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recentlyWatched">Recently Watched</SelectItem>
                                    <SelectItem value="title">Title A–Z</SelectItem>
                                    <SelectItem value="highestRated">Highest Rated</SelectItem>
                                    <SelectItem value="mostWatched">Most Watched</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Rating range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Min rating</Label>
                            <Select value={filters.ratingMin || "any"} onValueChange={v => updateFilter("ratingMin", v === "any" ? "" : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Any" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Max rating</Label>
                            <Select value={filters.ratingMax || "any"} onValueChange={v => updateFilter("ratingMax", v === "any" ? "" : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Any" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Date range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Watched from</Label>
                            <Input
                                type="date"
                                value={filters.watchedFrom}
                                onChange={e => updateFilter("watchedFrom", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Watched to</Label>
                            <Input
                                type="date"
                                value={filters.watchedTo}
                                onChange={e => updateFilter("watchedTo", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row 4: Rewatches + Privacy + Group */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                        {/* Rewatches only */}
                        <div className="flex items-center gap-2">
                            <Switch
                                id="rewatch-only"
                                checked={filters.rewatchOnly}
                                onCheckedChange={v => updateFilter("rewatchOnly", v)}
                                className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-zinc-600 dark:data-[state=unchecked]:bg-zinc-600"
                            />
                            <Label htmlFor="rewatch-only" className="cursor-pointer">Rewatches only</Label>
                        </div>

                        {/* Unrated only */}
                        <div className="flex items-center gap-2">
                            <Switch
                                id="unrated-only"
                                checked={filters.unratedOnly}
                                onCheckedChange={v => updateFilter("unratedOnly", v)}
                                className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-zinc-600 dark:data-[state=unchecked]:bg-zinc-600"
                            />
                            <Label htmlFor="unrated-only" className="cursor-pointer">No rating</Label>
                        </div>

                        {/* Privacy */}
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                            <Select
                                value={filters.privacyFilter}
                                onValueChange={v => updateFilter("privacyFilter", v as FilterState["privacyFilter"])}
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

                        {/* Group */}
                        {userGroups.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium whitespace-nowrap">Group:</Label>
                                <Select
                                    value={filters.groupId || "all"}
                                    onValueChange={v => updateFilter("groupId", v === "all" ? "" : v)}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="All groups" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All groups</SelectItem>
                                        {userGroups.map(group => (
                                            <SelectItem key={group.id} value={String(group.id)}>
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk Mode: Select All Bar */}
            {isBulkMode && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={checked => { if (checked) selectAll(); else deselectAll(); }}
                        />
                        <span className="text-sm font-medium">
                            {allSelected ? "Deselect all" : "Select all"} ({filteredWatches.length} {filteredWatches.length === 1 ? "movie" : "movies"})
                        </span>
                    </label>
                    {selectedMovieIds.size > 0 && (
                        <span className="text-sm text-primary font-semibold">
                            {selectedMovieIds.size} {selectedMovieIds.size === 1 ? "movie" : "movies"} selected
                        </span>
                    )}
                </div>
            )}

            {/* No matches state */}
            {filteredWatches.length === 0 && activeFilterCount > 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <Film className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">No matches for your filters</p>
                    <p className="text-sm text-muted-foreground">Try adjusting or clearing your filters</p>
                    <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                </div>
            ) : (
                <>
                    {/* Watches Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredWatches.map(groupedWatch => (
                            <div key={groupedWatch.movieId} className="relative">
                                {isBulkMode && (
                                    <div
                                        className="absolute inset-0 z-10 cursor-pointer"
                                        onClick={() => toggleMovieSelection(groupedWatch.movieId)}
                                    >
                                        <div className="absolute top-2 right-2 pointer-events-none">
                                            <Checkbox
                                                checked={selectedMovieIds.has(groupedWatch.movieId)}
                                                className="bg-background border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                                <WatchCard groupedWatch={groupedWatch} />
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                                {isLoadingMore ? "Loading…" : "Load More"}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Bulk Actions Bar (fixed at bottom) */}
            {isBulkMode && selectedMovieIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                            {selectedMovieIds.size} {selectedMovieIds.size === 1 ? "movie" : "movies"} selected
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShowMakePrivateDialog(true)} disabled={isProcessing}>
                                Make Private
                            </Button>
                            <Button className="flex-1 sm:flex-none" onClick={() => setShowShareDialog(true)} disabled={isProcessing}>
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
