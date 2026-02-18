"use client";

import { useEffect, useState } from "react";
import { groupApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Star, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { GroupStats as GroupStatsType } from "@/types";

interface GroupStatsProps {
    groupId: number;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

function GroupStatsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export function GroupStats({ groupId }: GroupStatsProps) {
    const [stats, setStats] = useState<GroupStatsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, [groupId]);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const data = await groupApi.getGroupStats(groupId);
            setStats(data);
        } catch (err) {
            console.error("Failed to load group stats:", err);
            setError("Failed to load group stats.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <GroupStatsSkeleton />;

    if (error) {
        return <p className="text-destructive text-sm">{error}</p>;
    }

    if (!stats) return null;

    const hasActivity = stats.totalWatches > 0;

    const usernameClass = (name: string | null) => {
        const len = (name ?? "").length;
        if (len <= 6)  return "text-2xl";
        if (len <= 8)  return "text-lg md:text-2xl";
        if (len <= 10) return "text-sm md:text-2xl";
        if (len <= 13) return "text-xs md:text-2xl";
        if (len <= 16) return "text-xs md:text-xl";
        return "text-xs md:text-lg";
    };

    const summaryCards = [
        { label: "Total Watches", value: stats.totalWatches, icon: Film, valueClass: "text-2xl" },
        { label: "Unique Movies", value: stats.uniqueMovies, icon: Film, valueClass: "text-2xl" },
        {
            label: "Avg Rating",
            value: stats.averageGroupRating !== null ? stats.averageGroupRating.toFixed(1) : "—",
            icon: Star,
            valueClass: "text-2xl",
        },
        {
            label: "Most Active",
            value: stats.mostActiveMember ?? "—",
            icon: Trophy,
            valueClass: usernameClass(stats.mostActiveMember),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label}>
                            <CardContent>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">{card.label}</p>
                                        <p className={`font-bold mt-1 truncate ${card.valueClass}`}>{card.value}</p>
                                    </div>
                                    <Icon className="h-4 w-4 text-primary mt-1 shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {!hasActivity ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                    No watches shared with this group yet.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Member leaderboard */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Member Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.memberStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No member data.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {stats.memberStats.map((member, index) => (
                                        <li key={member.userId} className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{member.username}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {member.watchCount} {member.watchCount === 1 ? "watch" : "watches"}
                                                    {member.averageRating !== null && (
                                                        <span className="ml-2 text-primary">
                                                            ★ {member.averageRating.toFixed(1)}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {index === 0 && member.watchCount > 0 && (
                                                <Trophy className="h-4 w-4 text-primary shrink-0" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shared movies */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Film className="h-4 w-4 text-primary" />
                                Watched by Multiple Members
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.sharedMovies.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No films watched by multiple members yet.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {stats.sharedMovies.map((item) => (
                                        <li key={item.movie.id}>
                                            <Link
                                                href={`/watched/${item.movie.id}`}
                                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                            >
                                                <div className="w-8 h-12 rounded overflow-hidden bg-muted shrink-0">
                                                    {item.movie.posterPath ? (
                                                        <Image
                                                            src={`${TMDB_IMAGE_BASE}${item.movie.posterPath}`}
                                                            alt={item.movie.title}
                                                            width={32}
                                                            height={48}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm leading-tight truncate">
                                                        {item.movie.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {item.watchedByUsernames.join(", ")}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs font-semibold text-primary bg-secondary px-2 py-0.5 rounded">
                                                    {item.watchedByCount} members
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
