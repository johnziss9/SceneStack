"use client";

import { useEffect, useState } from "react";
import { GroupBasicInfo } from "@/types";
import { groupApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus } from "lucide-react";
import Link from "next/link";

export function GroupList() {
    const [groups, setGroups] = useState<GroupBasicInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch groups on mount
    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await groupApi.getUserGroups();
            setGroups(data);
        } catch (err) {
            console.error("Failed to fetch groups:", err);
            toast.error("Failed to load groups", {
                description: "Please try again later",
            });
            setError("Failed to load groups. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-3">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
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
                    onClick={fetchGroups}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <Users className="text-primary" size={48} />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">No groups yet</h2>
                    <p className="text-muted-foreground max-w-sm">
                        Create a group to share your movie watching experience with friends and family
                    </p>
                </div>
                <Link
                    href="/groups/create"
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:scale-105"
                >
                    <Plus size={20} />
                    Create Your First Group
                </Link>
            </div>
        );
    }

    // Groups list
    return (
        <div className="space-y-6">
            {/* Create Group Button */}
            <div className="flex justify-end">
                <Link
                    href="/groups/create"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:scale-105"
                >
                    <Plus size={20} />
                    Create Group
                </Link>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <Link
                        key={group.id}
                        href={`/groups/${group.id}`}
                        className="group relative overflow-hidden rounded-xl border bg-card hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-primary/50"
                    >
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative p-6 space-y-4">
                            {/* Header with Icon */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                                        {group.name}
                                    </h3>
                                </div>
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <Users className="text-primary" size={20} />
                                </div>
                            </div>

                            {/* Member Count */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50">
                                    <Users size={14} />
                                    <span className="font-medium">
                                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                    </span>
                                </div>
                            </div>

                            {/* Hover Arrow Indicator */}
                            <div className="flex items-center gap-2 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>View group</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}