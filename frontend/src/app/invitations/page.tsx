"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { invitationApi } from "@/lib/api";
import { Invitation } from "@/types";
import { toast } from "@/lib/toast";
import { Loader2, Mail, Users, Check, X, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useInvitation } from "@/contexts/InvitationContext";

export default function InvitationsPage() {
    const { refreshCount } = useInvitation();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [respondingTo, setRespondingTo] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        try {
            setIsLoading(true);
            const data = await invitationApi.getPendingInvitations();
            setInvitations(data);
        } catch (error) {
            console.error("Failed to fetch invitations:", error);
            toast.error("Failed to load invitations");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRespond = async (invitationId: number, accept: boolean) => {
        setRespondingTo(invitationId);
        try {
            await invitationApi.respondToInvitation(invitationId, { accept });

            toast.success(accept ? "Invitation accepted!" : "Invitation declined", {
                description: accept ? "You've joined the group" : undefined
            });

            // Remove from list
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

            // Refresh invitation count in navbar
            await refreshCount();

            // Navigate to group if accepted
            if (accept) {
                const invitation = invitations.find(inv => inv.id === invitationId);
                if (invitation) {
                    setTimeout(() => {
                        router.push(`/groups/${invitation.groupId}`);
                    }, 1000);
                }
            }
        } catch (error: any) {
            console.error("Failed to respond to invitation:", error);
            toast.error("Failed to respond", {
                description: error.message || "Please try again"
            });
        } finally {
            setRespondingTo(null);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading invitations...</span>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                    <Link href="/groups">
                        <Button variant="outline" className="!border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Groups
                        </Button>
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Group Invitations</h1>
                    <p className="text-muted-foreground">
                        Invitations to join groups
                    </p>
                </div>

                {invitations.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground mb-2">No pending invitations</p>
                            <p className="text-sm text-muted-foreground">
                                You'll see invitations here when someone invites you to their group
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {invitations.map((invitation) => (
                            <Card key={invitation.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl mb-1">
                                                {invitation.groupName}
                                            </CardTitle>
                                            <CardDescription>
                                                Invited by <span className="font-medium">{invitation.invitedByUsername}</span>
                                                {' '} • {' '}
                                                <Users className="inline h-3 w-3 mr-1" />
                                                {invitation.groupMemberCount} member{invitation.groupMemberCount !== 1 ? 's' : ''}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                {invitation.groupDescription && (
                                    <CardContent className="pt-0">
                                        <p className="text-sm text-muted-foreground">
                                            {invitation.groupDescription}
                                        </p>
                                    </CardContent>
                                )}
                                <CardContent className="flex gap-2 pt-0">
                                    <Button
                                        onClick={() => handleRespond(invitation.id, true)}
                                        disabled={respondingTo === invitation.id}
                                        className="flex-1"
                                    >
                                        {respondingTo === invitation.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Check className="h-4 w-4 mr-2" />
                                        )}
                                        Accept
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleRespond(invitation.id, false)}
                                        disabled={respondingTo === invitation.id}
                                        className="flex-1 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Decline
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
