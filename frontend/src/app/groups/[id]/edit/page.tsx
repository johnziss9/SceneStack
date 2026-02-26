"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/lib/api";
import { Group } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTips } from "@/components/LoadingTips";

interface EditGroupPageProps {
    params: Promise<{ id: string }>;
}

export default function EditGroupPage({ params }: EditGroupPageProps) {
    const router = useRouter();
    const [groupId, setGroupId] = useState<number | null>(null);
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);

    // Ref for auto-scrolling to error
    const nameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadParams() {
            const { id } = await params;
            setGroupId(parseInt(id));
        }
        loadParams();
    }, [params]);

    useEffect(() => {
        if (groupId) {
            fetchGroup();
        }
    }, [groupId]);

    const fetchGroup = async () => {
        if (!groupId) return;

        try {
            setIsLoading(true);
            const data = await groupApi.getGroup(groupId);
            setGroup(data);
            setName(data.name);
            setDescription(data.description || "");
        } catch (err) {
            console.error("Failed to fetch group:", err);
            toast.error("Failed to load group");
            router.push("/groups");
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = (): boolean => {
        setNameError(null);

        let hasError = false;

        if (!name.trim()) {
            setNameError("Group name is required");
            hasError = true;
        } else if (name.length < 3) {
            setNameError("Group name must be at least 3 characters");
            hasError = true;
        }

        // Scroll to error if validation failed
        if (hasError && nameRef.current) {
            setTimeout(() => {
                nameRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
        }

        return !hasError;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!groupId || !validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const updatedGroup = await groupApi.updateGroup(groupId, {
                name: name.trim(),
                description: description.trim() || undefined,
            });

            toast.success("Group updated successfully!");
            router.push(`/groups/${groupId}`);
        } catch (err) {
            console.error("Failed to update group:", err);
            toast.error("Failed to update group", {
                description: "Please try again later",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen p-8">
                <div className="max-w-2xl mx-auto">
                    <LoadingTips />
                    <Skeleton variant="branded" className="h-10 w-40 mb-6" />
                    <Card>
                        <CardHeader>
                            <Skeleton variant="branded" className="h-8 w-48" />
                            <Skeleton variant="branded" className="h-4 w-64" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-24" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-32" />
                                <Skeleton variant="branded" className="h-24 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    if (!group) return null;

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

                {/* Edit Group Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Group</CardTitle>
                        <CardDescription>
                            Update your group&apos;s information
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Group Name */}
                            <div ref={nameRef} className="space-y-2">
                                <Label htmlFor="name">
                                    Group Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setNameError(null);
                                    }}
                                    className={nameError ? "border-destructive" : ""}
                                    maxLength={100}
                                />
                                {nameError && (
                                    <p className="text-sm text-destructive">{nameError}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    rows={4}
                                    maxLength={500}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {description.length}/500 characters
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push(`/groups/${groupId}`)}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !name.trim()}
                                    className="flex-1"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}