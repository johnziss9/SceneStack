'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AiUsageStats } from '@/components/AiUsageStats';
import { PrivacySettings } from '@/components/PrivacySettings';

export default function ProfilePage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return null; // Middleware will redirect to login
    }

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold">Profile</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your account settings
                    </p>
                </div>

                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-primary" />
                            Account Information
                        </CardTitle>
                        <CardDescription>
                            Your personal details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Username */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Username</Label>
                            <p className="text-lg font-semibold text-primary">{user.username}</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="text-lg">{user.email}</p>
                        </div>

                        {/* User ID (for debugging/reference) */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">User ID</Label>
                            <p className="text-sm text-muted-foreground">#{user.id}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>
                            Manage your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={handleLogout}
                            className="w-full sm:w-auto"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </CardContent>
                </Card>

                {/* Privacy Settings */}
                <PrivacySettings />

                {/* AI Usage Stats (premium only) */}
                {user?.isPremium && <AiUsageStats />}

                {/* Back to Home */}
                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                    >
                        Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}