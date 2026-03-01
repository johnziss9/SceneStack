'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function ReactivatePage() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [isReactivating, setIsReactivating] = useState(false);

    // Use useEffect for redirects to avoid React setState errors
    useEffect(() => {
        // If user is not logged in, redirect to login
        if (!user) {
            router.push('/login');
            return;
        }

        // If user is not deactivated, redirect to home
        if (!(user as any).isDeactivated) {
            router.push('/');
        }
    }, [user, router]);

    // Show nothing while checking/redirecting
    if (!user || !(user as any).isDeactivated) {
        return null;
    }

    const handleReactivate = async () => {
        setIsReactivating(true);
        try {
            await userApi.reactivate();
            toast.success('Account reactivated successfully!');
            await refreshUser();
            router.push('/');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reactivate account');
        } finally {
            setIsReactivating(false);
        }
    };

    const deactivatedAt = (user as any).deactivatedAt
        ? new Date((user as any).deactivatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : 'Unknown';

    const daysUntilDeletion = (user as any).daysUntilPermanentDeletion;
    const isScheduledForDeletion = daysUntilDeletion !== null && daysUntilDeletion !== undefined;

    // Calculate deletion date (deactivatedAt + 30 days)
    const deletionDate = (user as any).deactivatedAt
        ? new Date(new Date((user as any).deactivatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                        {isScheduledForDeletion ? (
                            <AlertTriangle className="h-12 w-12 text-orange-500" />
                        ) : (
                            <Clock className="h-12 w-12 text-primary" />
                        )}
                    </div>
                    <CardTitle className="text-center text-2xl">
                        {isScheduledForDeletion
                            ? 'Account Scheduled for Deletion'
                            : 'Account Deactivated'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        Welcome back, {user.username}!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Deactivated on: <strong>{deactivatedAt}</strong>
                            </p>
                        </div>

                        {isScheduledForDeletion ? (
                            <div className="p-4 border border-orange-500/50 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                                <div className="flex items-center justify-center mb-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                                    <p className="font-semibold text-orange-700 dark:text-orange-400">
                                        {daysUntilDeletion === 0
                                            ? 'Final Day!'
                                            : `${daysUntilDeletion} ${daysUntilDeletion === 1 ? 'day' : 'days'} remaining`}
                                    </p>
                                </div>
                                <p className="text-sm text-center text-orange-600 dark:text-orange-300">
                                    {daysUntilDeletion === 0
                                        ? 'Your account will be permanently locked today.'
                                        : deletionDate
                                        ? `After ${deletionDate}, you will no longer be able to access this account.`
                                        : 'After this period, you will no longer be able to access this account.'}
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 border border-primary/50 rounded-lg bg-primary/5">
                                <p className="text-sm text-center text-muted-foreground">
                                    Your account is deactivated. You can reactivate it anytime.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="text-sm font-medium">While deactivated:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• You cannot log in normally</li>
                                <li>• You appear as inactive in groups</li>
                                <li>• All your data is preserved and safe</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={handleReactivate}
                            disabled={isReactivating}
                            className="w-full"
                            size="lg"
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {isReactivating ? 'Reactivating...' : 'Reactivate My Account'}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={logout}
                            className="w-full"
                        >
                            Log Out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
