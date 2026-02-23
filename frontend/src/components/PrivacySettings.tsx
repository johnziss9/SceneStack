"use client";

import { useEffect, useState } from "react";
import { UserPrivacySettings } from "@/types";
import { privacyApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Loader2, Eye, Star, FileText } from "lucide-react";

export function PrivacySettings() {
    const [settings, setSettings] = useState<UserPrivacySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track if settings have changed
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await privacyApi.getPrivacySettings();
            setSettings(data);
        } catch (err) {
            console.error("Failed to fetch privacy settings:", err);
            toast.error("Failed to load privacy settings", {
                description: "Please try again later",
            });
            setError("Failed to load privacy settings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (field: keyof UserPrivacySettings) => {
        if (!settings) return;

        setSettings({
            ...settings,
            [field]: !settings[field],
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!settings) return;

        setIsSaving(true);
        try {
            const updatedSettings = await privacyApi.updatePrivacySettings({
                shareWatches: settings.shareWatches,
                shareRatings: settings.shareRatings,
                shareNotes: settings.shareNotes,
            });

            setSettings(updatedSettings);
            setHasChanges(false);
            toast.success("Privacy settings updated", {
                description: "Your changes have been saved",
            });
        } catch (err) {
            console.error("Failed to update privacy settings:", err);
            toast.error("Failed to save settings", {
                description: "Please try again later",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        fetchSettings();
        setHasChanges(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Privacy Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Control what you share with your groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                            <Skeleton className="h-6 w-11 rounded-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error || !settings) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Privacy Settings</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <p className="text-destructive">{error || "Failed to load settings."}</p>
                        <Button onClick={fetchSettings}>Try Again</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Privacy Settings</CardTitle>
                </div>
                <CardDescription>
                    Control what you share with your groups. These settings apply to all groups you&apos;re a member of.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Share Watches */}
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <Label
                                htmlFor="shareWatches"
                                className="text-base font-medium cursor-pointer"
                            >
                                Share Watch History
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Allow group members to see what movies you&apos;ve watched
                        </p>
                    </div>
                    <Switch
                        id="shareWatches"
                        checked={settings.shareWatches}
                        onCheckedChange={() => handleToggle("shareWatches")}
                        disabled={isSaving}
                    />
                </div>

                {/* Share Ratings */}
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            <Label
                                htmlFor="shareRatings"
                                className="text-base font-medium cursor-pointer"
                            >
                                Share Ratings
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Allow group members to see your movie ratings
                        </p>
                    </div>
                    <Switch
                        id="shareRatings"
                        checked={settings.shareRatings}
                        onCheckedChange={() => handleToggle("shareRatings")}
                        disabled={isSaving}
                    />
                </div>

                {/* Share Notes */}
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Label
                                htmlFor="shareNotes"
                                className="text-base font-medium cursor-pointer"
                            >
                                Share Notes
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Allow group members to see your personal notes about movies
                        </p>
                    </div>
                    <Switch
                        id="shareNotes"
                        checked={settings.shareNotes}
                        onCheckedChange={() => handleToggle("shareNotes")}
                        disabled={isSaving}
                    />
                </div>

                {/* Save/Reset Buttons */}
                {hasChanges && (
                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={isSaving}
                        >
                            Reset
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}