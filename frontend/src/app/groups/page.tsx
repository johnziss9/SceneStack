"use client";

import { GroupList } from "@/components/GroupList";

export default function GroupsPage() {
    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-4xl font-bold">My Groups</h1>
                    <p className="text-muted-foreground mt-2">
                        Share your movie watching experience with friends
                    </p>
                </div>

                {/* Groups List */}
                <GroupList />
            </div>
        </main>
    );
}