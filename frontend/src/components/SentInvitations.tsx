"use client";

import { useEffect, useState } from "react";
import { invitationApi, groupApi } from "@/lib/api";
import { Invitation, Group } from "@/types";
import { toast } from "@/lib/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, User, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTips } from "@/components/LoadingTips";

interface InvitationWithGroup extends Invitation {
    groupName: string;
}

export function SentInvitations() {
    const [invitations, setInvitations] = useState<InvitationWithGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    useEffect(() => {
        fetchAllInvitations();
    }, []);

    const fetchAllInvitations = async () => {
        try {
            setIsLoading(true);
            // Get all user's groups
            const groups = await groupApi.getUserGroups();

            // Fetch invitations for each group
            const allInvitations: InvitationWithGroup[] = [];
            for (const group of groups) {
                try {
                    const groupInvitations = await invitationApi.getSentInvitations(group.id);
                    const pendingInvitations = groupInvitations
                        .filter(inv => inv.status === 0)
                        .map(inv => ({
                            ...inv,
                            groupName: group.name
                        }));
                    allInvitations.push(...pendingInvitations);
                } catch (err) {
                    // Silently skip if not authorized for this group
                    console.error(`Failed to fetch invitations for group ${group.id}:`, err);
                }
            }

            // Sort by creation date (most recent first)
            allInvitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setInvitations(allInvitations);
        } catch (err) {
            console.error("Failed to fetch invitations:", err);
            toast.error("Failed to load invitations");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async (invitationId: number) => {
        setCancellingId(invitationId);
        try {
            await invitationApi.cancelInvitation(invitationId);
            toast.success("Invitation cancelled");

            // Remove from list
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (err) {
            console.error("Failed to cancel invitation:", err);
            toast.error("Failed to cancel invitation");
        } finally {
            setCancellingId(null);
        }
    };

    const getExpirationText = (expiresAt?: string) => {
        if (!expiresAt) return "No expiration";

        const expirationDate = new Date(expiresAt);
        const now = new Date();

        if (expirationDate < now) {
            return "Expired";
        }

        return `Expires in ${formatDistanceToNow(expirationDate)}`;
    };

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <LoadingTips />
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <Skeleton variant="branded" className="h-16 flex-1" />
                                    <Skeleton variant="branded" className="h-9 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (invitations.length === 0) {
        return (
            <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground mb-2">No pending invitations</p>
                <p className="text-sm text-muted-foreground">
                    Invitations you send will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {invitations.map((invitation) => (
                <Card key={invitation.id}>
                    <CardContent className="p-4">
                        <div
                            className={`flex items-center justify-between gap-4 ${
                                isExpired(invitation.expiresAt) ? 'opacity-50' : ''
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="font-medium">{invitation.invitedUsername}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-sm text-muted-foreground">{invitation.groupName}</span>
                                    {isExpired(invitation.expiresAt) ? (
                                        <Badge variant="destructive" className="text-xs">
                                            Expired
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div>{invitation.invitedUserEmail}</div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Sent {formatDistanceToNow(new Date(invitation.createdAt))} ago</span>
                                        </div>
                                        {invitation.expiresAt && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span className={isExpired(invitation.expiresAt) ? 'text-destructive' : ''}>
                                                    {getExpirationText(invitation.expiresAt)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(invitation.id)}
                                disabled={cancellingId === invitation.id || isExpired(invitation.expiresAt)}
                                className="shrink-0"
                            >
                                {cancellingId === invitation.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Cancel"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
