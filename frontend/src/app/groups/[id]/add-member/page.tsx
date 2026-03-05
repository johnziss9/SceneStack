"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { invitationApi, groupApi } from "@/lib/api";
import { UserSearchResult, Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddMemberPageProps {
    params: Promise<{ id: string }>;
}

export default function AddMemberPage({ params }: AddMemberPageProps) {
    const router = useRouter();
    const [groupId, setGroupId] = useState<number | null>(null);
    const [group, setGroup] = useState<Group | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [invitingUserId, setInvitingUserId] = useState<number | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        async function loadParams() {
            const { id } = await params;
            const gId = parseInt(id);
            setGroupId(gId);

            // Fetch group details
            try {
                const groupData = await groupApi.getGroup(gId);
                setGroup(groupData);
            } catch (error) {
                console.error("Failed to fetch group:", error);
                toast.error("Failed to load group");
                router.push('/groups');
            }
        }
        loadParams();
    }, [params, router]);

    const handleSearch = async () => {
        if (!searchQuery.trim() || !groupId) return;

        setIsSearching(true);
        setHasSearched(true);
        try {
            const results = await invitationApi.searchUsers(searchQuery, groupId);
            setSearchResults(results);

            if (results.length === 0) {
                toast.warning("No users found", {
                    description: "Try searching by username or email"
                });
            }
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Search failed", {
                description: "Please try again"
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleInvite = async (userId: number) => {
        if (!groupId) return;

        setInvitingUserId(userId);
        try {
            await invitationApi.createInvitation({
                groupId,
                invitedUserId: userId
            });

            toast.success("Invitation sent!", {
                description: "The user will be notified"
            });

            // Remove from search results
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (error: any) {
            console.error("Failed to send invitation:", error);
            toast.error("Failed to send invitation", {
                description: error.message || "Please try again"
            });
        } finally {
            setInvitingUserId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    if (!groupId || !group) {
        return (
            <main className="min-h-screen p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading...</span>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/groups/${groupId}`)}
                    className="mb-6 !border-[0.5px] hover:!border-orange-500 hover:scale-[1.02] transition-all"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Group
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Invite Member to {group.name}</CardTitle>
                        <CardDescription>
                            Search for users by username or email to invite them to your group
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Search Box */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by username or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-9"
                                    disabled={isSearching}
                                />
                            </div>
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                            >
                                {isSearching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Search"
                                )}
                            </Button>
                        </div>

                        {/* Search Results */}
                        {isSearching && (
                            <div className="text-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Searching...</p>
                            </div>
                        )}

                        {!isSearching && hasSearched && searchResults.length === 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    No users found matching "{searchQuery}". Try a different search term.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!isSearching && searchResults.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                                </p>
                                <div className="space-y-2">
                                    {searchResults.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{user.username}</p>
                                                    {user.isPremium && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Premium
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                {!user.canJoinMoreGroups && (
                                                    <p className="text-xs text-amber-600 mt-1">
                                                        User has reached their group limit
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleInvite(user.id)}
                                                disabled={invitingUserId === user.id || !user.canJoinMoreGroups}
                                            >
                                                {invitingUserId === user.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        Invite
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!hasSearched && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Enter a username or email to search</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
