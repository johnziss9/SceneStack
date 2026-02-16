"use client";

import { useEffect, useState } from "react";
import { GroupBasicInfo } from "@/types";
import { groupApi } from "@/lib/api";
import { toast } from "sonner";
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
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="text-muted-foreground text-6xl">
                    <Users size={64} />
                </div>
                <p className="text-xl text-muted-foreground">No groups yet</p>
                <p className="text-sm text-muted-foreground">
                    Create a group to share your movie watches with friends
                </p>
                <Link
                    href="/groups/create"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 inline-flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Group
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
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 inline-flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Group
                </Link>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                    <Link
                        key={group.id}
                        href={`/groups/${group.id}`}
                        className="border rounded-lg p-6 hover:border-primary transition-colors space-y-3"
                    >
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold truncate">
                                {group.name}
                            </h3>
                            <Users className="text-muted-foreground flex-shrink-0" size={20} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users size={16} />
                            <span>
                                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}