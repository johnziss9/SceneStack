"use client";

import { useEffect, useState } from "react";
import { Group } from "@/types";
import { groupApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, AlertCircle, Crown, UserPlus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { UpgradeToPremiumModal } from "@/components/UpgradeToPremiumModal";
import { LoadingTips } from "@/components/LoadingTips";

export function GroupList() {
    const { user } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

    // Calculate group limits for free users
    const totalGroups = groups.length;
    const createdGroups = groups.filter(g => g.createdById === user?.id).length;
    const joinedGroups = totalGroups - createdGroups;
    const isAtCreateLimit = !user?.isPremium && createdGroups >= 1;
    const isAtJoinLimit = !user?.isPremium && joinedGroups >= 1;
    const isAtTotalLimit = !user?.isPremium && totalGroups >= 2;

    const handleCreateGroupClick = () => {
        if (!user?.isPremium && createdGroups >= 1) {
            // Show upgrade modal if free user at create limit
            setShowUpgradeModal(true);
        } else {
            // Navigate to create page
            router.push("/groups/create");
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <LoadingTips />

                {/* Usage Indicator and Create Group Button skeleton */}
                <div className="flex items-center justify-between gap-4">
                    <Skeleton variant="branded" className="h-9 w-48 rounded-lg" />
                    <Skeleton variant="branded" className="h-9 w-36 rounded-lg ml-auto" />
                </div>

                {/* Groups Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
                            {/* Header with Icon */}
                            <div className="flex items-start justify-between gap-3">
                                <Skeleton variant="branded" className="h-6 w-32" />
                                <Skeleton variant="branded" className="h-10 w-10 rounded-full flex-shrink-0" />
                            </div>

                            {/* Member Count and Role Badge */}
                            <div className="flex items-center gap-2">
                                <Skeleton variant="branded" className="h-7 w-24 rounded-full" />
                                <Skeleton variant="branded" className="h-6 w-16 rounded-full" />
                            </div>

                            {/* Hover indicator */}
                            <Skeleton variant="branded" className="h-4 w-20" />
                        </div>
                    ))}
                </div>
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
            <>
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
                    <button
                        onClick={handleCreateGroupClick}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:scale-105"
                    >
                        <Plus size={20} />
                        Create Your First Group
                    </button>
                </div>

                {/* Upgrade Modal */}
                <UpgradeToPremiumModal
                    open={showUpgradeModal}
                    onOpenChange={setShowUpgradeModal}
                    feature="groups"
                />
            </>
        );
    }

    // Groups list
    return (
        <div className="space-y-6">
            {/* Usage Indicator and Create Group Button */}
            <div className="flex items-center justify-between gap-4">
                {/* Usage Indicator (All users) */}
                {totalGroups > 0 && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        !user?.isPremium && isAtTotalLimit
                            ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                            : 'bg-muted text-muted-foreground'
                    }`}>
                        <Users size={16} />
                        <span>
                            {createdGroups > 0 && `${createdGroups} created`}
                            {createdGroups > 0 && joinedGroups > 0 && ', '}
                            {joinedGroups > 0 && `${joinedGroups} joined`}
                            {user?.isPremium ? ' • Premium' : ' • Free tier'}
                        </span>
                    </div>
                )}

                {/* Create Group Button */}
                <button
                    onClick={handleCreateGroupClick}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:scale-105 ml-auto"
                >
                    <Plus size={20} />
                    Create Group
                </button>
            </div>

            {/* Warning Banner when at 1/2 groups (not yet at limit) */}
            {!user?.isPremium && totalGroups === 1 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                {createdGroups === 1
                                    ? `You've created 1 group and can join 1 more`
                                    : `You've joined 1 group and can create 1 more`
                                }
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                Upgrade to Premium for unlimited groups
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Banner when at limit (2/2 groups) */}
            {!user?.isPremium && isAtTotalLimit && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                You've reached your group limit
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                {createdGroups === 1 && joinedGroups === 1
                                    ? `You've created 1 group and joined 1 group. Upgrade for unlimited groups.`
                                    : createdGroups === 2
                                    ? `You've created 2 groups. Upgrade to join more groups.`
                                    : `You've joined 2 groups. Upgrade to create your own groups.`
                                }
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                        >
                            Upgrade
                        </button>
                    </div>
                </div>
            )}

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

                            {/* Member Count and Role Badge */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50">
                                    <Users size={14} />
                                    <span className="font-medium">
                                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                                    group.createdById === user?.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}>
                                    {group.createdById === user?.id ? (
                                        <>
                                            <Crown size={12} />
                                            Created
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={12} />
                                            Joined
                                        </>
                                    )}
                                </span>
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

            {/* Upgrade Modal */}
            <UpgradeToPremiumModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                feature="groups"
            />
        </div>
    );
}