"use client";

import { useState } from "react";
import { GroupList } from "@/components/GroupList";
import { SentInvitations } from "@/components/SentInvitations";
import { ReceivedInvitations } from "@/components/ReceivedInvitations";
import { Users, Mail, Inbox } from "lucide-react";
import { useInvitation } from "@/contexts/InvitationContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GroupsPage() {
    const { count: invitationCount } = useInvitation();
    const [sentInvitationsCount, setSentInvitationsCount] = useState(0);

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold">My Groups</h1>
                    </div>
                    <p className="text-muted-foreground text-lg pl-15">
                        Share your movie watching experience with friends and family
                    </p>
                </div>

                {/* Tabs for Groups, Sent Invitations, and Received Invitations */}
                <Tabs defaultValue="groups" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-3 h-12 mb-6">
                        <TabsTrigger value="groups" className="text-sm sm:text-base">
                            <Users className="h-4 w-4 mr-2" />
                            My Groups
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="text-sm sm:text-base">
                            <Mail className="h-4 w-4 mr-2" />
                            Sent
                            {sentInvitationsCount > 0 && (
                                <Badge variant="default" className="ml-2 text-xs px-2 py-0">
                                    {sentInvitationsCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="received" className="text-sm sm:text-base">
                            <Inbox className="h-4 w-4 mr-2" />
                            Received
                            {invitationCount > 0 && (
                                <Badge variant="default" className="ml-2 text-xs px-2 py-0">
                                    {invitationCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="groups" className="mt-0">
                        <GroupList />
                    </TabsContent>
                    <TabsContent value="sent" className="mt-0">
                        <SentInvitations onCountChange={setSentInvitationsCount} />
                    </TabsContent>
                    <TabsContent value="received" className="mt-0">
                        <ReceivedInvitations />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}