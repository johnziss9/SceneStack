"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateGroupPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);

    const validateForm = (): boolean => {
        let isValid = true;

        // Reset errors
        setNameError(null);

        // Validate name (required, min 3 chars)
        if (!name.trim()) {
            setNameError("Group name is required");
            isValid = false;
        } else if (name.trim().length < 3) {
            setNameError("Group name must be at least 3 characters");
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const group = await groupApi.createGroup({
                name: name.trim(),
                description: description.trim() || undefined,
            });

            toast.success("Group created successfully!", {
                description: `${group.name} has been created`,
            });

            // Redirect to the new group's page
            router.push(`/groups/${group.id}`);
        } catch (err: unknown) {
            console.error("Failed to create group:", err);

            // Check if it's a free tier limit error
            if (err instanceof Error && err.message?.includes("limit")) {
                toast.error("Cannot create group", {
                    description: "You've reached the free tier limit of 1 created group",
                });
            } else {
                toast.error("Failed to create group", {
                    description: "Please try again later",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push("/groups")}
                    className="mb-6"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                </Button>

                {/* Create Group Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Group</CardTitle>
                        <CardDescription>
                            Create a group to share your movie watches with friends
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Group Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Group Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setNameError(null); // Clear error on change
                                    }}
                                    onBlur={() => {
                                        if (!name.trim()) {
                                            setNameError("Group name is required");
                                        } else if (name.trim().length < 3) {
                                            setNameError("Group name must be at least 3 characters");
                                        }
                                    }}
                                    placeholder="e.g., Friday Movie Night"
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

                            {/* Free Tier Notice (only show for non-premium users) */}
                            {!user?.isPremium && (
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Free tier:</strong> You can create 1 group and join 2 others (3 groups total)
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/groups")}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Group"
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