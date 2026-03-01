"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Group, GroupMember, GroupRole } from "@/types";
import { groupApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, UserPlus, Shield, Crown, AlertCircle, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTips } from "@/components/LoadingTips";
import { useAuth } from "@/contexts/AuthContext";

interface GroupDetailProps {
    groupId: number;
}

export function GroupDetail({ groupId }: GroupDetailProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [removingMember, setRemovingMember] = useState<GroupMember | null>(null);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        fetchGroup();
    }, [groupId]);

    const fetchGroup = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await groupApi.getGroup(groupId);
            setGroup(data);
        } catch (err) {
            console.error("Failed to fetch group:", err);
            toast.error("Failed to load group", {
                description: "Please try again later",
            });
            setError("Failed to load group. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!group) return;

        setIsDeleting(true);
        try {
            await groupApi.deleteGroup(group.id);
            toast.success("Group deleted successfully");
            router.push("/groups");
        } catch (err) {
            console.error("Error deleting group:", err);
            toast.error("Failed to delete group", {
                description: "Please try again later",
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleRemoveMemberClick = (member: GroupMember) => {
        setRemovingMember(member);
        setIsRemoveDialogOpen(true);
    };

    const handleRemoveMemberConfirm = async () => {
        if (!removingMember || !group) return;

        setIsRemoving(true);
        try {
            await groupApi.removeMember(group.id, removingMember.userId);
            toast.success("Member removed successfully");

            // Refetch group to update member list
            await fetchGroup();
            setIsRemoveDialogOpen(false);
            setRemovingMember(null);
        } catch (err) {
            console.error("Error removing member:", err);
            toast.error("Failed to remove member", {
                description: "Please try again later",
            });
        } finally {
            setIsRemoving(false);
        }
    };

    const getRoleBadge = (role: GroupRole) => {
        switch (role) {
            case GroupRole.Creator:
                return (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        <Crown size={12} />
                        Creator
                    </span>
                );
            case GroupRole.Admin:
                return (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                        <Shield size={12} />
                        Admin
                    </span>
                );
            default:
                return (
                    <span className="text-xs text-muted-foreground px-2 py-0.5">
                        Member
                    </span>
                );
        }
    };

    const canEditGroup = () => {
        if (!user || !group) return false;
        const currentMember = group.members.find(m => m.userId === user.id);
        return currentMember?.role === GroupRole.Creator || currentMember?.role === GroupRole.Admin;
    };

    const canDeleteGroup = () => {
        if (!user || !group) return false;
        const currentMember = group.members.find(m => m.userId === user.id);
        return currentMember?.role === GroupRole.Creator;
    };

    const canRemoveMember = (member: GroupMember) => {
        if (!user || !group) return false;
        const currentMember = group.members.find(m => m.userId === user.id);
        
        // Can't remove creator
        if (member.role === GroupRole.Creator) return false;
        
        // Creator and Admin can remove members
        return currentMember?.role === GroupRole.Creator || currentMember?.role === GroupRole.Admin;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <LoadingTips />
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton variant="branded" className="h-10 w-40" />
                    <div className="flex gap-2">
                        <Skeleton variant="branded" className="h-10 w-32" />
                        <Skeleton variant="branded" className="h-10 w-24" />
                    </div>
                </div>

                {/* Group Info Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton variant="branded" className="h-8 w-1/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton variant="branded" className="h-4 w-full" />
                        <Skeleton variant="branded" className="h-4 w-2/3" />
                    </CardContent>
                </Card>

                {/* Members Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton variant="branded" className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton variant="branded" className="h-6 w-1/3" />
                                    <Skeleton variant="branded" className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error || !group) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/groups")}
                    className="justify-start"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                </Button>
                <Card>
                    <CardContent className="pt-12 pb-12">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-center text-muted-foreground">
                                {error || "Group not found."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/groups")}
                    className="justify-start"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                </Button>
                <div className="flex gap-2">
                    {canEditGroup() && (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/groups/${group.id}/edit`)}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Group
                        </Button>
                    )}
                    {canDeleteGroup() && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteClick}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Group Info */}
            <Card className="overflow-hidden border-2">
                <div className="h-2 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
                <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-2xl sm:text-3xl">{group.name}</CardTitle>
                            {group.description && (
                                <p className="text-muted-foreground mt-2">{group.description}</p>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                            <Crown className="h-4 w-4 text-primary" />
                            <span className="text-sm">
                                <span className="text-muted-foreground">Created by</span>
                                <span className="ml-1.5 font-semibold text-foreground">
                                    {group.createdBy.username}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                            <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold text-foreground">
                                {new Date(group.createdAt).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Members List */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle>Members ({group.members.length})</CardTitle>
                        </div>
                        {canEditGroup() && (
                            <Button
                                size="sm"
                                onClick={() => router.push(`/groups/${group.id}/add-member`)}
                                className="gap-2"
                            >
                                <UserPlus className="h-4 w-4" />
                                Add Member
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        {group.members.map((member) => (
                            <div
                                key={member.userId}
                                className="group relative flex items-start sm:items-center justify-between py-4 px-4 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all gap-3"
                            >
                                {/* Avatar Circle */}
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 text-lg font-bold text-primary">
                                        {member.username ? member.username.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-base">{member.username || 'Unknown'}</span>
                                            {getRoleBadge(member.role)}
                                            {member.isDeactivated && (
                                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {member.email || 'No email'}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Joined{" "}
                                            {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </div>
                                {canRemoveMember(member) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveMemberClick(member)}
                                        className="hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Group Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>Are you sure you want to delete this group?</p>
                                {group && (
                                    <div className="mt-2 text-sm">
                                        <strong>{group.name}</strong> with {group.members.length}{" "}
                                        {group.members.length === 1 ? "member" : "members"}
                                    </div>
                                )}
                                <p className="mt-2">This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Member Dialog */}
            <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>Are you sure you want to remove this member from the group?</p>
                                {removingMember && (
                                    <div className="mt-2 text-sm">
                                        <strong>{removingMember.username}</strong> ({removingMember.email})
                                    </div>
                                )}
                                <p className="mt-2">They can be re-added later if needed.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMemberConfirm}
                            disabled={isRemoving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRemoving ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}