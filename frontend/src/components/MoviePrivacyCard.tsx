"use client";
import { log } from '@/lib/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Users, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { movieApi, groupApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { Movie, GroupBasicInfo } from '@/types';

interface MoviePrivacyCardProps {
    movie: Movie;
    onPrivacyUpdated?: (updatedMovie: Movie) => void;
}

export function MoviePrivacyCard({ movie, onPrivacyUpdated }: MoviePrivacyCardProps) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [sharingMode, setSharingMode] = useState<'private' | 'specific' | 'all'>('private');
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize sharing mode from movie
    useEffect(() => {
        if (movie.isPrivate === true) {
            setSharingMode('private');
            setSelectedGroups([]);
        } else if (movie.groupIds && movie.groupIds.length > 0) {
            setSelectedGroups(movie.groupIds);
            // Check if it's all groups by fetching user groups
            fetchUserGroups().then(groups => {
                if (groups.length > 0 && movie.groupIds?.length === groups.length) {
                    setSharingMode('all');
                } else {
                    setSharingMode('specific');
                }
            });
        } else {
            // Default to private if no privacy data is set
            setSharingMode('private');
            setSelectedGroups([]);
        }
    }, [movie]);

    const fetchUserGroups = async () => {
        try {
            setIsLoadingGroups(true);
            const groups = await groupApi.getUserGroups();
            setUserGroups(groups);
            return groups;
        } catch (err) {
            log.error('Failed to fetch groups', err);
            return [];
        } finally {
            setIsLoadingGroups(false);
        }
    };

    const handleEditClick = () => {
        fetchUserGroups();
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const isPrivate = sharingMode === 'private';
            const groupIds = sharingMode === 'all'
                ? userGroups.map(g => g.id)
                : sharingMode === 'specific'
                ? selectedGroups
                : [];

            await movieApi.setPrivacy(movie.id, isPrivate, groupIds);

            // Update local movie object
            const updatedMovie = {
                ...movie,
                isPrivate,
                groupIds,
            };

            toast.success('Privacy settings updated');
            setIsEditDialogOpen(false);

            if (onPrivacyUpdated) {
                onPrivacyUpdated(updatedMovie);
            }
        } catch (err) {
            log.error('Failed to update privacy', err);
            toast.error('Failed to update privacy settings');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleGroupSelection = (groupId: number) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    // Get privacy status text
    const getPrivacyStatusText = () => {
        if (movie.isPrivate === true) {
            return 'Private';
        } else if (movie.groupIds && movie.groupIds.length > 0) {
            return `Shared with ${movie.groupIds.length} ${movie.groupIds.length === 1 ? 'group' : 'groups'}`;
        } else {
            return 'Private (no privacy set)';
        }
    };

    // Get icon
    const PrivacyIcon = (movie.isPrivate === true || !movie.groupIds || movie.groupIds.length === 0) ? Lock : Users;

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <PrivacyIcon className="h-4 w-4" />
                        Privacy Settings
                    </CardTitle>
                    <CardDescription>
                        Control who can see your watches of this movie
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">{getPrivacyStatusText()}</p>
                            {movie.isPrivate !== true && movie.groupIds && movie.groupIds.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Group members can see your watch history for this movie
                                </p>
                            )}
                            {movie.isPrivate === true && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only you can see your watches of this movie
                                </p>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleEditClick}>
                            Edit Privacy
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Privacy Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Privacy Settings</DialogTitle>
                        <DialogDescription>
                            Change who can see your watches of {movie.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        {/* Private Option */}
                        <button
                            type="button"
                            onClick={() => setSharingMode('private')}
                            className={`group w-full relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                sharingMode === 'private'
                                    ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                    : 'border-border bg-card hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    sharingMode === 'private'
                                        ? 'bg-primary/20'
                                        : 'bg-primary/10 group-hover:bg-primary/20'
                                }`}>
                                    <Lock className={`h-5 w-5 transition-colors ${
                                        sharingMode === 'private' ? 'text-primary' : 'text-primary/70'
                                    }`} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className={`font-semibold transition-colors ${
                                        sharingMode === 'private' ? 'text-primary' : 'group-hover:text-primary'
                                    }`}>
                                        Private
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Only you can see
                                    </p>
                                </div>
                                {sharingMode === 'private' && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Specific Groups Option */}
                        <button
                            type="button"
                            onClick={() => {
                                setSharingMode('specific');
                            }}
                            disabled={userGroups.length === 0 && !isLoadingGroups}
                            className={`group w-full relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                sharingMode === 'specific'
                                    ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                    : 'border-border bg-card hover:border-primary/50'
                            } ${userGroups.length === 0 && !isLoadingGroups ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    sharingMode === 'specific'
                                        ? 'bg-primary/20'
                                        : 'bg-primary/10 group-hover:bg-primary/20'
                                }`}>
                                    <Users className={`h-5 w-5 transition-colors ${
                                        sharingMode === 'specific' ? 'text-primary' : 'text-primary/70'
                                    }`} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className={`font-semibold transition-colors ${
                                        sharingMode === 'specific' ? 'text-primary' : 'group-hover:text-primary'
                                    }`}>
                                        Specific Groups
                                    </h3>
                                    <p className={`text-sm ${
                                        sharingMode === 'specific' && selectedGroups.length > 0
                                            ? 'text-primary/80'
                                            : 'text-muted-foreground'
                                    }`}>
                                        {sharingMode === 'specific' && selectedGroups.length > 0
                                            ? `${selectedGroups.length} ${selectedGroups.length === 1 ? 'group' : 'groups'} selected`
                                            : 'Choose which groups'
                                        }
                                    </p>
                                </div>
                                {sharingMode === 'specific' && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Group selection (shown when specific is selected) */}
                        {sharingMode === 'specific' && userGroups.length > 0 && (
                            <div className="pl-4 pt-2 border-l-2 border-primary/20">
                                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                                    {userGroups.map(group => (
                                        <label
                                            key={group.id}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={selectedGroups.includes(group.id)}
                                                onCheckedChange={() => toggleGroupSelection(group.id)}
                                            />
                                            <span className="text-sm">{group.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Groups Option */}
                        <button
                            type="button"
                            onClick={() => {
                                setSharingMode('all');
                                setSelectedGroups(userGroups.map(g => g.id));
                            }}
                            disabled={userGroups.length === 0 && !isLoadingGroups}
                            className={`group w-full relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                sharingMode === 'all'
                                    ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                    : 'border-border bg-card hover:border-primary/50'
                            } ${userGroups.length === 0 && !isLoadingGroups ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                    sharingMode === 'all'
                                        ? 'bg-primary/20'
                                        : 'bg-primary/10 group-hover:bg-primary/20'
                                }`}>
                                    <Users className={`h-5 w-5 transition-colors ${
                                        sharingMode === 'all' ? 'text-primary' : 'text-primary/70'
                                    }`} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className={`font-semibold transition-colors ${
                                        sharingMode === 'all' ? 'text-primary' : 'group-hover:text-primary'
                                    }`}>
                                        All My Groups
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {userGroups.length > 0
                                            ? `Share with all ${userGroups.length} ${userGroups.length === 1 ? 'group' : 'groups'}`
                                            : 'You have no groups yet'
                                        }
                                    </p>
                                </div>
                                {sharingMode === 'all' && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || (sharingMode === 'specific' && selectedGroups.length === 0)}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
