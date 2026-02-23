"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";

interface AddMemberPageProps {
    params: Promise<{ id: string }>;
}

export default function AddMemberPage({ params }: AddMemberPageProps) {
    const router = useRouter();
    const [groupId, setGroupId] = useState<number | null>(null);

    useEffect(() => {
        async function loadParams() {
            const { id } = await params;
            setGroupId(parseInt(id));
        }
        loadParams();
    }, [params]);

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/groups/${groupId}`)}
                    className="mb-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Group
                </Button>

                {/* Add Member Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Member</CardTitle>
                        <CardDescription>
                            Add a member to your group
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">
                                User search functionality coming soon!
                            </p>
                            <p className="text-sm text-muted-foreground">
                                This feature requires user search and invitation system.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}