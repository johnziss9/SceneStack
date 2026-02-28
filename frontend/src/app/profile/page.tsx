'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from "@/components/LoadingTips";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { LogOut, User as UserIcon, Edit, Save, X, Lock, Trash2, Shield, Settings as SettingsIcon, Sparkles, Crown, Zap, Users as UsersIcon, Search, Check, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AiUsageStats } from '@/components/AiUsageStats';
import { PrivacySettings } from '@/components/PrivacySettings';
import { useState, useRef } from 'react';
import { userApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { UpgradeToPremiumModal } from '@/components/UpgradeToPremiumModal';

export default function ProfilePage() {
    const { user, logout, loading, refreshUser } = useAuth();
    const { count: watchlistCount } = useWatchlist();
    const router = useRouter();

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editBio, setEditBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Profile edit validation errors
    const [editUsernameError, setEditUsernameError] = useState('');
    const [editEmailError, setEditEmailError] = useState('');

    // Refs for auto-scrolling to errors (profile edit)
    const editUsernameRef = useRef<HTMLDivElement>(null);
    const editEmailRef = useRef<HTMLDivElement>(null);

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Password validation errors
    const [currentPasswordError, setCurrentPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // Refs for auto-scrolling to errors (password change)
    const currentPasswordRef = useRef<HTMLDivElement>(null);
    const newPasswordRef = useRef<HTMLDivElement>(null);
    const confirmPasswordRef = useRef<HTMLDivElement>(null);

    // Delete account state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletePasswordError, setDeletePasswordError] = useState('');

    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Data export state
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [isExportingJson, setIsExportingJson] = useState(false);

    // Password strength calculation
    const calculatePasswordStrength = (password: string): {
        score: number;
        label: string;
        color: string;
        requirements: {
            minLength: boolean;
            hasUppercase: boolean;
            hasLowercase: boolean;
            hasNumber: boolean;
            hasSpecial: boolean;
        };
    } => {
        if (!password) {
            return {
                score: 0,
                label: '',
                color: '',
                requirements: {
                    minLength: false,
                    hasUppercase: false,
                    hasLowercase: false,
                    hasNumber: false,
                    hasSpecial: false,
                },
            };
        }

        let score = 0;
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[^A-Za-z0-9]/.test(password),
        };

        // Score calculation
        if (requirements.minLength) score += 20;
        if (requirements.hasUppercase) score += 20;
        if (requirements.hasLowercase) score += 20;
        if (requirements.hasNumber) score += 20;
        if (requirements.hasSpecial) score += 20;

        // Determine strength label and color
        let label = '';
        let color = '';
        if (score < 40) {
            label = 'Weak';
            color = 'text-red-500';
        } else if (score < 80) {
            label = 'Fair';
            color = 'text-orange-500';
        } else {
            label = 'Strong';
            color = 'text-green-500';
        }

        return { score, label, color, requirements };
    };

    const passwordStrength = calculatePasswordStrength(newPassword);

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
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement | null> | null = null;

        // Reset errors
        setEditUsernameError('');
        setEditEmailError('');

        // Validate username
        if (!editUsername.trim()) {
            setEditUsernameError('Username cannot be empty');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = editUsernameRef;
        }

        // Validate email
        if (!editEmail.trim()) {
            setEditEmailError('Email cannot be empty');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = editEmailRef;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
            setEditEmailError('Please enter a valid email');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = editEmailRef;
        }

        // Scroll to first error if validation failed
        if (!isValid && firstErrorRef?.current) {
            setTimeout(() => {
                firstErrorRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
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
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement | null> | null = null;

        // Reset errors
        setCurrentPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');

        // Validate current password
        if (!currentPassword) {
            setCurrentPasswordError('Current password is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = currentPasswordRef;
        }

        // Validate new password
        if (!newPassword) {
            setNewPasswordError('New password is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = newPasswordRef;
        } else {
            const strength = calculatePasswordStrength(newPassword);
            const { requirements } = strength;

            const failedRequirements: string[] = [];
            if (!requirements.minLength) failedRequirements.push('at least 8 characters');
            if (!requirements.hasUppercase) failedRequirements.push('one uppercase letter');
            if (!requirements.hasLowercase) failedRequirements.push('one lowercase letter');
            if (!requirements.hasNumber) failedRequirements.push('one number');
            if (!requirements.hasSpecial) failedRequirements.push('one special character');

            if (failedRequirements.length > 0) {
                setNewPasswordError(`Password must contain ${failedRequirements.join(', ')}`);
                isValid = false;
                if (!firstErrorRef) firstErrorRef = newPasswordRef;
            }
        }

        // Validate confirm password
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your new password');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = confirmPasswordRef;
        } else if (newPassword !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = confirmPasswordRef;
        }

        // Scroll to first error if validation failed
        if (!isValid && firstErrorRef?.current) {
            setTimeout(() => {
                firstErrorRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
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
        // Reset error
        setDeletePasswordError('');

        if (!deletePassword) {
            setDeletePasswordError('Password is required to delete your account');
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
            setDeletePasswordError('');
        }
    };

    const handleExportData = async (format: 'csv' | 'json') => {
        const setLoading = format === 'csv' ? setIsExportingCsv : setIsExportingJson;
        setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5127';
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('auth_token='))
                ?.split('=')[1];

            const response = await fetch(`${API_URL}/api/users/export-data?format=${format}`, {
                method: 'GET',
                headers: {
                    'Accept': format === 'csv' ? 'application/zip' : 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            // Get filename from Content-Disposition header or create default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = format === 'csv'
                ? `scenestack-export-${new Date().toISOString().split('T')[0]}.zip`
                : `scenestack-export-${new Date().toISOString().split('T')[0]}.json`;

            if (contentDisposition) {
                // Match filename=value (with or without quotes, stop at semicolon)
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            const formatLabel = format === 'csv' ? 'CSV (ZIP)' : 'JSON';
            toast.success(`Data exported successfully as ${formatLabel}`);
        } catch (error: any) {
            toast.error(error.message || `Failed to export data`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <LoadingTips />

                    {/* Header skeleton */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton variant="branded" className="h-10 w-32" />
                            <Skeleton variant="branded" className="h-5 w-56" />
                        </div>
                        <Skeleton variant="branded" className="h-10 w-28" />
                    </div>

                    {/* Tabs skeleton */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} variant="branded" className="h-10 w-full rounded-md" />
                            ))}
                        </div>

                        {/* Profile content skeleton */}
                        <div className="space-y-6">
                            {/* Account Information Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Skeleton variant="branded" className="h-5 w-5 rounded" />
                                            <Skeleton variant="branded" className="h-6 w-48" />
                                        </div>
                                        <Skeleton variant="branded" className="h-9 w-32" />
                                    </div>
                                    <Skeleton variant="branded" className="h-4 w-40 mt-2" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Username field */}
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-20" />
                                        <div className="flex items-center gap-2">
                                            <Skeleton variant="branded" className="h-7 w-40" />
                                            <Skeleton variant="branded" className="h-6 w-20 rounded-full" />
                                        </div>
                                    </div>

                                    {/* Email field */}
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-16" />
                                        <Skeleton variant="branded" className="h-7 w-56" />
                                    </div>

                                    {/* Bio field */}
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-12" />
                                        <Skeleton variant="branded" className="h-16 w-full" />
                                    </div>

                                    {/* Member since field */}
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-28" />
                                        <Skeleton variant="branded" className="h-6 w-32" />
                                    </div>

                                    {/* Watchlist usage field */}
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-32" />
                                        <Skeleton variant="branded" className="h-6 w-24" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subscription Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Skeleton variant="branded" className="h-5 w-5 rounded" />
                                            <Skeleton variant="branded" className="h-6 w-32" />
                                        </div>
                                    </div>
                                    <Skeleton variant="branded" className="h-4 w-48 mt-2" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Skeleton variant="branded" className="h-4 w-24" />
                                        <Skeleton variant="branded" className="h-7 w-20" />
                                    </div>

                                    <div className="p-4 border-2 rounded-lg space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Skeleton variant="branded" className="h-5 w-5 rounded" />
                                            <Skeleton variant="branded" className="h-6 w-40" />
                                        </div>

                                        <div className="space-y-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <Skeleton variant="branded" className="h-4 w-4 rounded flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 space-y-1">
                                                        <Skeleton variant="branded" className="h-4 w-3/4" />
                                                        <Skeleton variant="branded" className="h-3 w-full" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2 space-y-3">
                                            <Skeleton variant="branded" className="h-10 w-full" />
                                            <Skeleton variant="branded" className="h-4 w-40 mx-auto" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
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
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold">Profile</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your account settings
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="flex-shrink-0 mr-4"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="profile">
                            <UserIcon className="h-4 w-4 mr-2" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="security">
                            <Lock className="h-4 w-4 mr-2" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger value="privacy">
                            <Shield className="h-4 w-4 mr-2" />
                            Privacy
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <SettingsIcon className="h-4 w-4 mr-2" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile" className="space-y-6">
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
                                <div ref={editUsernameRef} className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={editUsername}
                                        onChange={(e) => {
                                            setEditUsername(e.target.value);
                                            setEditUsernameError('');
                                        }}
                                        placeholder="Enter username"
                                        className={editUsernameError ? 'border-destructive' : ''}
                                    />
                                    {editUsernameError && (
                                        <p className="text-sm text-destructive">{editUsernameError}</p>
                                    )}
                                </div>

                                <div ref={editEmailRef} className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => {
                                            setEditEmail(e.target.value);
                                            setEditEmailError('');
                                        }}
                                        placeholder="Enter email"
                                        className={editEmailError ? 'border-destructive' : ''}
                                    />
                                    {editEmailError && (
                                        <p className="text-sm text-destructive">{editEmailError}</p>
                                    )}
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

                                {!(user as any)?.isPremium && (
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Watchlist Usage</Label>
                                        <p className="text-base">
                                            {watchlistCount} / 50 saved
                                            {watchlistCount >= 50 && (
                                                <span className="text-destructive ml-2">(Limit reached)</span>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                        </Card>

                        {/* Subscription Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {(user as any)?.isPremium ? (
                                            <Crown className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Sparkles className="h-5 w-5 text-primary" />
                                        )}
                                        <CardTitle>Subscription</CardTitle>
                                    </div>
                                    {(user as any)?.isPremium && (
                                        <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                                            Premium
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    {(user as any)?.isPremium
                                        ? 'Manage your premium subscription'
                                        : 'Upgrade to unlock premium features'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(user as any)?.isPremium ? (
                                    <>
                                        {/* Premium User View */}
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Current Plan</Label>
                                            <p className="text-lg font-semibold text-primary">Premium</p>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <Label className="text-muted-foreground">Your Benefits</Label>
                                            <div className="grid gap-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span>Unlimited AI-powered search</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span>Personalized AI insights for every watch</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span>Create and join unlimited groups</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span>Unlimited watchlist</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span>Priority support</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Free User View */}
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Current Plan</Label>
                                            <p className="text-lg font-semibold">Free</p>
                                        </div>

                                        <div className="p-4 border-2 border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 via-background to-background space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-primary" />
                                                <h3 className="font-semibold">Upgrade to Premium</h3>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3 text-sm">
                                                    <Search className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium">AI-Powered Search</p>
                                                        <p className="text-muted-foreground text-xs">
                                                            Find movies using natural language queries
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 text-sm">
                                                    <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium">Personalized AI Insights</p>
                                                        <p className="text-muted-foreground text-xs">
                                                            Get AI-generated insights for every watch
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 text-sm">
                                                    <UsersIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium">Unlimited Groups</p>
                                                        <p className="text-muted-foreground text-xs">
                                                            Create and join unlimited groups
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 text-sm">
                                                    <Crown className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium">Unlimited Watchlist</p>
                                                        <p className="text-muted-foreground text-xs">
                                                            Save as many movies as you want
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 space-y-3">
                                                <Button
                                                    onClick={() => setShowUpgradeModal(true)}
                                                    className="w-full"
                                                >
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Upgrade to Premium
                                                </Button>
                                                <p className="text-center text-sm text-muted-foreground">
                                                    Starting at <span className="font-semibold text-primary">£5/month</span>
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6">
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
                        <div ref={currentPasswordRef} className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => {
                                    setCurrentPassword(e.target.value);
                                    setCurrentPasswordError('');
                                }}
                                placeholder="Enter current password"
                                className={currentPasswordError ? 'border-destructive' : ''}
                            />
                            {currentPasswordError && (
                                <p className="text-sm text-destructive">{currentPasswordError}</p>
                            )}
                        </div>

                        <div ref={newPasswordRef} className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setNewPasswordError('');
                                }}
                                placeholder="Enter new password"
                                className={newPasswordError ? 'border-destructive' : ''}
                            />
                            {newPasswordError && (
                                <p className="text-sm text-destructive">{newPasswordError}</p>
                            )}

                            {/* Password Strength Meter */}
                            {newPassword && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Password strength:</span>
                                        <span className={`font-medium ${passwordStrength.color}`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                passwordStrength.score < 40
                                                    ? 'bg-red-500'
                                                    : passwordStrength.score < 80
                                                    ? 'bg-orange-500'
                                                    : 'bg-green-500'
                                            }`}
                                            style={{ width: `${passwordStrength.score}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password Requirements */}
                            <div className="space-y-1.5 pt-1">
                                <p className="text-xs text-muted-foreground font-medium">Password must contain:</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                passwordStrength.requirements.minLength
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {passwordStrength.requirements.minLength && <Check className="w-3 h-3" />}
                                        </div>
                                        <span
                                            className={
                                                passwordStrength.requirements.minLength
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            At least 8 characters
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                passwordStrength.requirements.hasUppercase
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {passwordStrength.requirements.hasUppercase && <Check className="w-3 h-3" />}
                                        </div>
                                        <span
                                            className={
                                                passwordStrength.requirements.hasUppercase
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            One uppercase letter (A-Z)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                passwordStrength.requirements.hasLowercase
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {passwordStrength.requirements.hasLowercase && <Check className="w-3 h-3" />}
                                        </div>
                                        <span
                                            className={
                                                passwordStrength.requirements.hasLowercase
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            One lowercase letter (a-z)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                passwordStrength.requirements.hasNumber
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {passwordStrength.requirements.hasNumber && <Check className="w-3 h-3" />}
                                        </div>
                                        <span
                                            className={
                                                passwordStrength.requirements.hasNumber
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            One number (0-9)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div
                                            className={`flex items-center justify-center w-4 h-4 rounded-full ${
                                                passwordStrength.requirements.hasSpecial
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {passwordStrength.requirements.hasSpecial && <Check className="w-3 h-3" />}
                                        </div>
                                        <span
                                            className={
                                                passwordStrength.requirements.hasSpecial
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            One special character (!@#$%^&*)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div ref={confirmPasswordRef} className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmPasswordError('');
                                }}
                                placeholder="Confirm new password"
                                className={confirmPasswordError ? 'border-destructive' : ''}
                            />
                            {confirmPasswordError && (
                                <p className="text-sm text-destructive">{confirmPasswordError}</p>
                            )}
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
                    </TabsContent>

                    {/* Privacy Tab */}
                    <TabsContent value="privacy" className="space-y-6">
                        <PrivacySettings />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-6">
                        {/* AI Usage Stats (premium only) */}
                        {(user as any)?.isPremium && <AiUsageStats />}

                        {/* Your Data Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-primary" />
                                    <CardTitle>Your Data</CardTitle>
                                </div>
                                <CardDescription>
                                    Export your complete watch history, groups, watchlist, and account data
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Download all your data in your preferred format.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleExportData('csv')}
                                        disabled={isExportingCsv || isExportingJson}
                                        className="flex-1"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        {isExportingCsv ? 'Exporting...' : 'Download CSV (ZIP)'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleExportData('json')}
                                        disabled={isExportingCsv || isExportingJson}
                                        className="flex-1"
                                    >
                                        <FileJson className="h-4 w-4 mr-2" />
                                        {isExportingJson ? 'Exporting...' : 'Download JSON'}
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>• <strong>CSV (ZIP):</strong> Multiple files (watches, watchlist, groups, account) - compatible with Excel/Google Sheets</p>
                                    <p>• <strong>JSON:</strong> Single file with all data - for developers/technical users</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Danger Zone Card */}
                        <Card className="border-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-destructive" />
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        </div>
                        <CardDescription>
                            Permanent account deletion
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Delete Account Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="max-w-md">
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

                    {/* Export Data Reminder */}
                    <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Download className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Before you go, download your data:</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportData('csv')}
                                disabled={isExportingCsv || isExportingJson}
                                className="flex-1"
                            >
                                <FileSpreadsheet className="h-3 w-3 mr-1" />
                                {isExportingCsv ? 'Exporting...' : 'CSV (ZIP)'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportData('json')}
                                disabled={isExportingCsv || isExportingJson}
                                className="flex-1"
                            >
                                <FileJson className="h-3 w-3 mr-1" />
                                {isExportingJson ? 'Exporting...' : 'JSON'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            CSV contains multiple files (watches, watchlist, groups, account)
                        </p>
                    </div>

                    <div className="space-y-2 py-4 border-t">
                        <Label htmlFor="deletePassword">
                            Enter your password to confirm deletion
                        </Label>
                        <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => {
                                setDeletePassword(e.target.value);
                                setDeletePasswordError('');
                            }}
                            placeholder="Enter your password"
                            className={deletePasswordError ? 'border-destructive' : ''}
                        />
                        {deletePasswordError && (
                            <p className="text-sm text-destructive">{deletePasswordError}</p>
                        )}
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

            {/* Upgrade Modal */}
            <UpgradeToPremiumModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                feature="search"
            />
        </div>
    );
}
