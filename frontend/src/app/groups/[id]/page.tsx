"use client";

import { useEffect, useState } from "react";
import { GroupDetail } from "@/components/GroupDetail";
import { GroupFeed } from "@/components/GroupFeed";
import { GroupRecommendations } from "@/components/GroupRecommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <main className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                {/* Group Detail Section */}
                <GroupDetail groupId={groupId} />

                {/* Tabs for Feed and Recommendations */}
                <div className="mt-8">
                    <Tabs defaultValue="feed" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="feed">Group Feed</TabsTrigger>
                            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                        </TabsList>
                        <TabsContent value="feed" className="mt-6">
                            <GroupFeed groupId={groupId} />
                        </TabsContent>
                        <TabsContent value="recommendations" className="mt-6">
                            <GroupRecommendations groupId={groupId} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    );
}