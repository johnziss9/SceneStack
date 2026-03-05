"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroupFeedItem, PaginatedMemberWatchesResponse } from "@/types";
import { groupApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTips } from "@/components/LoadingTips";
import { ArrowLeft, Eye, MapPin, Users as UsersIcon } from "lucide-react";
import { formatWatchDate } from "@/lib/utils";

interface MemberProfilePageProps {
    params: Promise<{
        id: string;
        userId: string;
    }>;
}

export default function MemberProfilePage({ params }: MemberProfilePageProps) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const [groupId, setGroupId] = useState<number | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [profileData, setProfileData] = useState<PaginatedMemberWatchesResponse | null>(null);
    const [feedItems, setFeedItems] = useState<GroupFeedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const TAKE = 20;

    // Parse params on mount
    useEffect(() => {
        const parsedGroupId = parseInt(unwrappedParams.id, 10);
        const parsedUserId = parseInt(unwrappedParams.userId, 10);

        if (isNaN(parsedGroupId) || isNaN(parsedUserId)) {
            setError("Invalid group or user ID");
            setIsLoading(false);
            return;
        }

        setGroupId(parsedGroupId);
        setUserId(parsedUserId);
    }, [unwrappedParams.id, unwrappedParams.userId]);

    // Fetch profile data when IDs are set
    useEffect(() => {
        if (groupId && userId) {
            fetchProfile(0);
        }
    }, [groupId, userId]);

    const fetchProfile = async (skipCount: number) => {
        if (!groupId || !userId) return;

        try {
            if (skipCount === 0) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }
            setError(null);

            const data = await groupApi.getMemberWatches(groupId, userId, skipCount, TAKE);

            if (skipCount === 0) {
                setProfileData(data);
                setFeedItems(data.items);
            } else {
                setFeedItems((prev) => [...prev, ...data.items]);
            }

            setHasMore(data.hasMore);
            setSkip(data.nextSkip);
        } catch (err: any) {
            const errorMessage = err?.response?.data || "Failed to load member profile";
            toast.error("Error loading profile", {
                description: errorMessage,
            });
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchProfile(skip);
    };

    const handleBackToGroup = () => {
        if (groupId) {
            router.push(`/groups/${groupId}`);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <LoadingTips />
                <div className="space-y-6">
                    <Skeleton variant="branded" className="h-32 w-full rounded-lg" />
                    {[...Array(5)].map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    <Skeleton variant="poster" className="w-16 h-24 rounded flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton variant="branded" className="h-5 w-1/3" />
                                        <Skeleton variant="branded" className="h-4 w-1/2" />
                                        <Skeleton variant="branded" className="h-4 w-2/3" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error || !profileData) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
                        <div className="relative w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Eye className="text-destructive" size={48} />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold">Unable to load profile</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            {error || "This member's profile could not be loaded."}
                        </p>
                    </div>
                    <Button onClick={handleBackToGroup}>
                        <ArrowLeft className="mr-2" size={16} />
                        Back to Group
                    </Button>
                </div>
            </div>
        );
    }

    const joinedDate = new Date(profileData.targetJoinedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Back Button */}
            <div className="mb-6">
                <Button variant="ghost" onClick={handleBackToGroup} className="gap-2">
                    <ArrowLeft size={16} />
                    Back to {profileData.groupName}
                </Button>
            </div>

            {/* Profile Header */}
            <Card className="mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                                <span className="text-4xl font-bold text-primary-foreground">
                                    {profileData.targetUsername.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-3xl font-bold">{profileData.targetUsername}</h1>
                                {profileData.isTargetDeactivated && (
                                    <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                                        Inactive
                                    </span>
                                )}
                                <span className="text-xs bg-primary/15 text-primary px-3 py-1 rounded-full font-medium">
                                    {profileData.targetRole}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Member since {joinedDate}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">
                                {profileData.groupName}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Watches Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                        Watches in this group
                        {feedItems.length > 0 && (
                            <span className="text-muted-foreground ml-2">({profileData.totalCount})</span>
                        )}
                    </h2>
                </div>

                {/* Empty state */}
                {feedItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <Eye className="text-primary" size={48} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold">No watches shared</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                This member hasn&apos;t shared any watches with the group yet.
                            </p>
                        </div>
                    </div>
                )}

                {/* Watch Cards */}
                {feedItems.map((item) => {
                    const posterUrl = item.posterPath
                        ? `https://image.tmdb.org/t/p/w185${item.posterPath}`
                        : null;

                    const watchedDate = formatWatchDate(item.watchedDate);

                    return (
                        <Card
                            key={item.id}
                            className="group overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300"
                        >
                            <CardContent className="p-5">
                                <div className="flex gap-4">
                                    {/* Movie Poster */}
                                    <Link
                                        href={`/movies/${item.tmdbId}?from=memberprofile&groupId=${groupId}&userId=${userId}`}
                                        className="flex-shrink-0 relative"
                                    >
                                        {posterUrl ? (
                                            <div className="relative overflow-hidden rounded-lg">
                                                <img
                                                    src={posterUrl}
                                                    alt={item.movieTitle}
                                                    className="w-20 h-[120px] object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-[120px] bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                                No poster
                                            </div>
                                        )}
                                    </Link>

                                    {/* Watch Info */}
                                    <div className="flex-1 min-w-0 space-y-2.5">
                                        {/* Movie Title */}
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-muted-foreground text-sm">Watched</span>
                                                {item.isRewatch && (
                                                    <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
                                                        Rewatch
                                                    </span>
                                                )}
                                            </div>
                                            <Link
                                                href={`/movies/${item.tmdbId}?from=memberprofile&groupId=${groupId}&userId=${userId}`}
                                                className="font-bold text-lg hover:text-primary transition-colors inline-block mt-0.5"
                                            >
                                                {item.movieTitle}
                                            </Link>
                                        </div>

                                        {/* Rating and Date Row */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {item.rating && (
                                                <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10">
                                                    <svg className="w-4 h-4 text-primary fill-primary" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    <span className="font-bold text-primary">{item.rating}</span>
                                                    <span className="text-xs text-muted-foreground">/10</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{watchedDate}</span>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        {(item.watchLocation || item.watchedWith) && (
                                            <div className="flex flex-wrap gap-2">
                                                {item.watchLocation && (
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1 rounded-lg bg-muted/50">
                                                        <MapPin size={14} />
                                                        <span>{item.watchLocation}</span>
                                                    </div>
                                                )}
                                                {item.watchedWith && (
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1 rounded-lg bg-muted/50">
                                                        <UsersIcon size={14} />
                                                        <span className="truncate">{item.watchedWith}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {item.notes && (
                                            <div className="pt-1 border-t">
                                                <p className="text-sm text-muted-foreground italic line-clamp-2">
                                                    &quot;{item.notes}&quot;
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Load More Button */}
                {hasMore && feedItems.length > 0 && (
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? "Loading..." : `Load More (${profileData.totalCount - feedItems.length} remaining)`}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
