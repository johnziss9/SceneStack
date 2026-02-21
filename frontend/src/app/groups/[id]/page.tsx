"use client";

import { useEffect, useState } from "react";
import { GroupDetail } from "@/components/GroupDetail";
import { GroupFeed } from "@/components/GroupFeed";
import { GroupRecommendations } from "@/components/GroupRecommendations";
import { GroupStats } from "@/components/GroupStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye } from "lucide-react";

interface GroupDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function GroupDetailPage({ params }: GroupDetailPageProps) {
    const [groupId, setGroupId] = useState<number | null>(null);

    useEffect(() => {
        async function loadParams() {
            const { id } = await params;
            setGroupId(parseInt(id));
        }
        loadParams();
    }, [params]);

    if (groupId === null) {
        return null; // Or a loading state
    }

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Group Detail Section */}
                <GroupDetail groupId={groupId} />

                {/* Tabs for Feed and Recommendations */}
                <div className="mt-8">
                    <Tabs defaultValue="feed" className="w-full">
                        <TabsList className="grid w-full max-w-2xl grid-cols-3 h-12">
                            <TabsTrigger value="feed" className="text-sm sm:text-base">
                                <Eye className="h-4 w-4 mr-2" />
                                Feed
                            </TabsTrigger>
                            <TabsTrigger value="recommendations" className="text-sm sm:text-base">
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Recommendations
                            </TabsTrigger>
                            <TabsTrigger value="stats" className="text-sm sm:text-base">
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Stats
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="feed" className="mt-6">
                            <GroupFeed groupId={groupId} />
                        </TabsContent>
                        <TabsContent value="recommendations" className="mt-6">
                            <GroupRecommendations groupId={groupId} />
                        </TabsContent>
                        <TabsContent value="stats" className="mt-6">
                            <GroupStats groupId={groupId} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    );
}