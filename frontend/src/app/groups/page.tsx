"use client";

import { GroupList } from "@/components/GroupList";
import { Users } from "lucide-react";

export default function GroupsPage() {
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

                {/* Groups List */}
                <GroupList />
            </div>
        </main>
    );
}