'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, User as UserIcon, Edit, Save, X, Lock, Trash2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AiUsageStats } from '@/components/AiUsageStats';
import { PrivacySettings } from '@/components/PrivacySettings';
import { useState } from 'react';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
    const { user, logout, loading, refreshUser } = useAuth();
    const router = useRouter();

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editBio, setEditBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Delete account state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEditClick = () => {
        setEditUsername(user?.username || '');
        setEditEmail(user?.email || '');
        setEditBio((user as any)?.bio || '');
        setIsEditMode(true);
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditUsername('');
        setEditEmail('');
        setEditBio('');
    };

    const handleSaveProfile = async () => {
        if (!editUsername.trim()) {
            toast.error('Username cannot be empty');
            return;
        }
        if (!editEmail.trim()) {
            toast.error('Email cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            await userApi.updateProfile({
                username: editUsername,
                email: editEmail,
                bio: editBio,
            });

            toast.success('Profile updated successfully');
            await refreshUser?.();
            setIsEditMode(false);
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error('Username is already taken');
            } else {
                toast.error('Failed to update profile');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('All fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsChangingPassword(true);
        try {
            await userApi.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });

            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Password is required');
            return;
        }

        setIsDeleting(true);
        try {
            await userApi.deleteAccount({ password: deletePassword });
            toast.success('Account deleted successfully');
            logout();
            router.push('/');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete account');
            setIsDeleting(false);
            setShowDeleteDialog(false);
            setDeletePassword('');
        }
    };

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-40" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-56" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const memberSince = (user as any)?.createdAt
        ? new Date((user as any).createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
          })
        : 'Unknown';

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl sm:text-4xl font-bold">Profile</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your account settings
                    </p>
                </div>

                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                <CardTitle>Account Information</CardTitle>
                            </div>
                            {!isEditMode && (
                                <Button variant="outline" size="sm" onClick={handleEditClick}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                        <CardDescription>
                            {isEditMode ? 'Update your profile information' : 'Your personal details'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditMode ? (
                            <>
                                {/* Edit Mode */}
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        placeholder="Enter username"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="Enter email"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">
                                        Bio
                                        <span className="text-muted-foreground text-sm ml-2">
                                            ({editBio.length}/300)
                                        </span>
                                    </Label>
                                    <Textarea
                                        id="bio"
                                        value={editBio}
                                        onChange={(e) => setEditBio(e.target.value.slice(0, 300))}
                                        placeholder="Tell us about yourself..."
                                        rows={4}
                                        maxLength={300}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Display Mode */}
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Username</Label>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-semibold text-primary">{user.username}</p>
                                        {(user as any)?.isPremium && (
                                            <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="text-lg">{user.email}</p>
                                </div>

                                {(user as any)?.bio && (
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Bio</Label>
                                        <p className="text-base whitespace-pre-wrap">{(user as any).bio}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Member Since</Label>
                                    <p className="text-base">{memberSince}</p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Change Password Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" />
                            <CardTitle>Change Password</CardTitle>
                        </div>
                        <CardDescription>
                            Update your password to keep your account secure
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                        </div>

                        <Button
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                            className="w-full sm:w-auto"
                        >
                            {isChangingPassword ? 'Updating...' : 'Update Password'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Privacy Settings */}
                <PrivacySettings />

                {/* AI Usage Stats (premium only) */}
                {(user as any)?.isPremium && <AiUsageStats />}

                {/* Danger Zone Card */}
                <Card className="border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-destructive" />
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        </div>
                        <CardDescription>
                            Irreversible and destructive actions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-destructive/50 rounded-lg">
                            <div>
                                <h3 className="font-semibold">Delete Account</h3>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all associated data
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                className="w-full sm:w-auto"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Account
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <h3 className="font-semibold">Sign Out</h3>
                                <p className="text-sm text-muted-foreground">
                                    Sign out of your account on this device
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full sm:w-auto"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

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

            {/* Delete Account Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>
                                    This action cannot be undone. This will permanently delete your account
                                    and remove all your data from our servers, including:
                                </p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>All your watch history</li>
                                    <li>Groups you created or joined</li>
                                    <li>Your watchlist</li>
                                    <li>AI insights and searches</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="deletePassword">
                            Enter your password to confirm
                        </Label>
                        <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Enter your password"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletePassword('')}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || !deletePassword}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Account'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
