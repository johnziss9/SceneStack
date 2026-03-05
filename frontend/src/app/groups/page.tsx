"use client";

import { GroupList } from "@/components/GroupList";
import { SentInvitations } from "@/components/SentInvitations";
import { Users, Mail, ArrowRight } from "lucide-react";
import { useInvitation } from "@/contexts/InvitationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GroupsPage() {
    const { count: invitationCount } = useInvitation();

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

                {/* Invitations Card */}
                {invitationCount > 0 && (
                    <Card className="mb-6 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Group Invitations</CardTitle>
                                        <CardDescription>
                                            You have {invitationCount} pending invitation{invitationCount !== 1 ? 's' : ''}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="default" className="text-sm px-3 py-1">
                                    {invitationCount}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Link href="/invitations">
                                <Button className="w-full sm:w-auto gap-2">
                                    View Invitations
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs for Groups and Sent Invitations */}
                <Tabs defaultValue="groups" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 h-12 mb-6">
                        <TabsTrigger value="groups" className="text-sm sm:text-base">
                            <Users className="h-4 w-4 mr-2" />
                            My Groups
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="text-sm sm:text-base">
                            <Mail className="h-4 w-4 mr-2" />
                            Sent Invitations
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="groups" className="mt-0">
                        <GroupList />
                    </TabsContent>
                    <TabsContent value="sent" className="mt-0">
                        <SentInvitations />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}