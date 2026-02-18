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
import { ArrowLeft, Edit, Trash2, UserPlus, Shield, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
                {/* Header Skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-40" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>

                {/* Group Info Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>

                {/* Members Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-6 w-1/3" />
                                    <Skeleton className="h-6 w-20" />
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
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {group.description && (
                        <p className="text-muted-foreground">{group.description}</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <div>
                            <span>Created by:</span>
                            <span className="ml-2 font-semibold text-foreground">
                                {group.createdBy.username}
                            </span>
                        </div>
                        <div>
                            <span>Created:</span>
                            <span className="ml-2 font-semibold text-foreground">
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
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Members ({group.members.length})</CardTitle>
                        {canEditGroup() && (
                            <Button
                                size="sm"
                                onClick={() => router.push(`/groups/${group.id}/add-member`)}
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Member
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {group.members.map((member) => (
                            <div
                                key={member.userId}
                                className="flex items-start sm:items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 gap-3"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{member.username}</span>
                                        {getRoleBadge(member.role)}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {member.email}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Joined{" "}
                                        {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </div>
                                </div>
                                {canRemoveMember(member) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveMemberClick(member)}
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