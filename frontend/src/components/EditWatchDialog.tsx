'use client';

import { useState, useEffect } from 'react';
import { watchApi } from '@/lib';
import type { Watch, UpdateWatchRequest } from '@/types';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { groupApi } from '@/lib/api';
import type { GroupBasicInfo } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Lock, Users } from 'lucide-react';

interface EditWatchDialogProps {
    watch: Watch | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function EditWatchDialog({
    watch,
    open,
    onOpenChange,
    onSuccess,
}: EditWatchDialogProps) {
    const [watchedDate, setWatchedDate] = useState('');
    const [rating, setRating] = useState('');
    const [location, setLocation] = useState('');
    const [customLocation, setCustomLocation] = useState('');
    const [watchedWith, setWatchedWith] = useState('');
    const [notes, setNotes] = useState('');
    const [isRewatch, setIsRewatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Privacy & Sharing - Simplified state management
    type SharingMode = 'private' | 'specific' | 'all';
    const [sharingMode, setSharingMode] = useState<SharingMode>('private');
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

    // Group selection modal
    const [isGroupSelectionOpen, setIsGroupSelectionOpen] = useState(false);
    const [tempSelectedGroups, setTempSelectedGroups] = useState<number[]>([]);

    // Validation errors
    const [dateError, setDateError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const { user } = useAuth();

    // Populate form when watch changes OR when dialog opens
    useEffect(() => {
        if (watch && open) {
            setWatchedDate(watch.watchedDate.split('T')[0]); // Extract YYYY-MM-DD
            setRating(watch.rating?.toString() || '');

            // Handle location
            if (watch.watchLocation && !['Cinema', 'Home'].includes(watch.watchLocation)) {
                setLocation('Other');
                setCustomLocation(watch.watchLocation);
            } else {
                setLocation(watch.watchLocation || '');
                setCustomLocation('');
            }

            setWatchedWith(watch.watchedWith || '');
            setNotes(watch.notes || '');
            setIsRewatch(watch.isRewatch);
            // Note: sharingMode and groupIds will be set after fetching groups

            // Clear validation errors when dialog opens
            setDateError(null);
            setRatingError(null);
            setLocationError(null);

            // Fetch user's groups
            if (user) {
                fetchUserGroups();
            }
        }
    }, [watch, open, user]);

    const fetchUserGroups = async () => {
        try {
            setIsLoadingGroups(true);
            const groups = await groupApi.getUserGroups();
            setUserGroups(groups);

            // If watch is private, set mode to private
            if (watch?.isPrivate) {
                setSharingMode('private');
                setSelectedGroups([]);
            }
            // Set sharing mode based on watch's groupIds
            else if (watch?.groupIds && watch.groupIds.length > 0) {
                // Check if all groups are selected (meaning "All my groups" was chosen)
                const allGroupIds = groups.map(g => g.id).sort();
                const watchGroupIds = [...watch.groupIds].sort();
                const isAllGroups = allGroupIds.length === watchGroupIds.length &&
                                allGroupIds.every((id, index) => id === watchGroupIds[index]);

                if (isAllGroups) {
                    setSharingMode('all');
                    setSelectedGroups([]);
                } else {
                    setSharingMode('specific');
                    setSelectedGroups(watch.groupIds);
                }
            } else {
                setSharingMode('private');
                setSelectedGroups([]);
            }
        } catch (err) {
            console.error('Failed to fetch groups:', err);
            // Don't show error toast, groups are optional
        } finally {
            setIsLoadingGroups(false);
        }
    };

    // Validation function
    const validateForm = (): boolean => {
        let isValid = true;

        // Reset errors
        setDateError(null);
        setRatingError(null);
        setLocationError(null);
        setPrivacyError(null);

        // Validate watch date (required)
        if (!watchedDate) {
            setDateError('Watch date is required');
            isValid = false;
        }

        // Validate rating (1-10 if provided, slider enforces 0.5 steps)
        if (rating) {
            const ratingNum = parseFloat(rating);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
                setRatingError('Rating must be between 1 and 10');
                isValid = false;
            }
        }

        // Validate custom location (required when "Other" is selected)
        if (location === 'Other' && !customLocation.trim()) {
            setLocationError('Please specify the location');
            isValid = false;
        }

        // Validate privacy + groups combination
        if (sharingMode === 'specific' && selectedGroups.length === 0) {
            setPrivacyError('Please select at least one group to share with');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!watch) return;

        // Validate form before submitting
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const finalLocation = location === 'Other' ? customLocation : location;

            const updateData: UpdateWatchRequest = {
                watchedDate: new Date(watchedDate).toISOString(),
                rating: rating ? parseFloat(rating) : undefined,
                notes: notes || undefined,
                watchLocation: finalLocation || undefined,
                watchedWith: watchedWith || undefined,
                isRewatch,
                isPrivate: sharingMode === 'private',
                groupIds: sharingMode === 'all'
                    ? userGroups.map(g => g.id) // Send all group IDs if "all groups" is selected
                    : sharingMode === 'specific'
                    ? selectedGroups
                    : undefined,
            };

            await watchApi.updateWatch(watch.id, updateData);

            // Reset form
            setWatchedDate('');
            setRating('');
            setLocation('');
            setCustomLocation('');
            setWatchedWith('');
            setNotes('');
            setIsRewatch(false);
            setSharingMode('private');
            setSelectedGroups([]);
            setDateError(null);
            setRatingError(null);
            setLocationError(null);
            setPrivacyError(null);

            toast.success('Watch updated successfully!', {
                description: `Updated ${watch.movie.title}`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            console.error('Error updating watch:', err);
            toast.error('Failed to update watch', {
                description: 'Please try again later',
            });
            setError('Failed to update watch. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!watch) return null;

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Watch: {watch.movie.title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-2" noValidate>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Form Fields */}
                        <div className="space-y-4">
                    {/* Watch Date */}
                    <div className="space-y-2">
                        <Label htmlFor="watchedDate">Date Watched *</Label>
                        <Input
                            id="watchedDate"
                            type="date"
                            value={watchedDate}
                            onChange={(e) => {
                                setWatchedDate(e.target.value);
                                setDateError(null);
                            }}
                            onBlur={() => {
                                if (!watchedDate) {
                                    setDateError('Watch date is required');
                                }
                            }}
                            className={dateError ? 'border-destructive' : ''}
                        />
                        {dateError && (
                            <p className="text-sm text-destructive">{dateError}</p>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Rating <span className="text-muted-foreground">(Optional)</span></Label>
                            {rating && (
                                <div className="text-sm font-semibold text-foreground">
                                    {rating}/10
                                </div>
                            )}
                        </div>
                        <Slider
                            value={[rating ? parseFloat(rating) : 5]}
                            onValueChange={(value) => {
                                setRating(value[0].toString());
                                setRatingError(null);
                            }}
                            min={1}
                            max={10}
                            step={0.5}
                            className="py-4"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                        {ratingError && (
                            <p className="text-sm text-destructive">{ratingError}</p>
                        )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cinema">Cinema</SelectItem>
                                <SelectItem value="Home">Home</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Custom Location (if Other selected) */}
                        {location === 'Other' && (
                            <>
                                <Input
                                    id="customLocation"
                                    type="text"
                                    value={customLocation}
                                    onChange={(e) => {
                                        setCustomLocation(e.target.value);
                                        setLocationError(null);
                                    }}
                                    onBlur={() => {
                                        if (location === 'Other' && !customLocation.trim()) {
                                            setLocationError('Please specify the location');
                                        }
                                    }}
                                    placeholder="Enter location"
                                    className={locationError ? 'border-destructive' : ''}
                                />
                                {locationError && (
                                    <p className="text-sm text-destructive">{locationError}</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Watched With */}
                    <div>
                        <Label htmlFor="watchedWith">Watched With</Label>
                        <Input
                            id="watchedWith"
                            type="text"
                            value={watchedWith}
                            onChange={(e) => setWatchedWith(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Your thoughts..."
                            rows={4}
                        />
                    </div>

                    {/* Rewatch Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isRewatch"
                            checked={isRewatch}
                            onChange={(e) => setIsRewatch(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <Label htmlFor="isRewatch" className="cursor-pointer">
                            This is a rewatch
                        </Label>
                    </div>
                    </div>
                    {/* End Left Column */}

                    {/* Right Column - Privacy & Sharing */}
                    <div className="space-y-4">
                        <Label className="text-base">Privacy & Sharing</Label>

                        {/* Three Privacy Cards - Horizontal Layout */}
                        <div className="space-y-3">
                            {/* Card 1: Private */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSharingMode('private');
                                    setSelectedGroups([]);
                                    setPrivacyError(null);
                                }}
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
                                            Only you can see this
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

                            {/* Card 2: Specific Groups */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (userGroups.length === 0 && !isLoadingGroups) return;
                                    setSharingMode('specific');
                                    setPrivacyError(null);
                                    setTempSelectedGroups(selectedGroups);
                                    setIsGroupSelectionOpen(true);
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
                                                ? `✓ ${selectedGroups.length} ${selectedGroups.length === 1 ? 'group' : 'groups'} selected - Click to change`
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

                            {/* Card 3: All My Groups */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSharingMode('all');
                                    setSelectedGroups([]);
                                    setPrivacyError(null);
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
                                            Share with everyone
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

                        {/* No Groups Message */}
                        {userGroups.length === 0 && !isLoadingGroups && (
                            <div className="border rounded-lg p-4 bg-muted/50">
                                <p className="text-sm text-muted-foreground">
                                    You're not a member of any groups yet
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    💡 Create or join a group to share your watches
                                </p>
                            </div>
                        )}

                        {/* Privacy Error Message */}
                        {privacyError && (
                            <p className="text-sm text-destructive">⚠️ {privacyError}</p>
                        )}
                    </div>
                    {/* End Right Column */}

                    </div>
                    {/* End Grid */}

                    {/* Error Message */}
                    {error && (
                        <p className="text-sm text-destructive mt-4">{error}</p>
                    )}

                    {/* Submit Button */}
                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Group Selection Modal */}
        <Dialog open={isGroupSelectionOpen} onOpenChange={setIsGroupSelectionOpen}>
            <DialogContent className={`max-h-[80vh] flex flex-col ${userGroups.length > 5 ? 'sm:max-w-[700px]' : 'sm:max-w-[500px]'}`}>
                <DialogHeader>
                    <DialogTitle>Select Groups to Share With</DialogTitle>
                    <DialogDescription>
                        Choose which groups can see this watch
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className={`gap-2 ${userGroups.length > 5 ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-2'}`}>
                        {isLoadingGroups ? (
                            <p className="text-sm text-muted-foreground">Loading groups...</p>
                        ) : userGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No groups available</p>
                        ) : (
                            userGroups.map((group) => (
                                <div
                                    key={group.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                                >
                                    <Checkbox
                                        id={`edit-modal-group-${group.id}`}
                                        checked={tempSelectedGroups.includes(group.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setTempSelectedGroups([...tempSelectedGroups, group.id]);
                                            } else {
                                                setTempSelectedGroups(tempSelectedGroups.filter(id => id !== group.id));
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor={`edit-modal-group-${group.id}`}
                                        className="cursor-pointer flex-1 font-normal"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{group.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                            </span>
                                        </div>
                                    </Label>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setIsGroupSelectionOpen(false);
                            setTempSelectedGroups(selectedGroups);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            setSelectedGroups(tempSelectedGroups);
                            setPrivacyError(null);
                            setIsGroupSelectionOpen(false);
                        }}
                    >
                        Confirm ({tempSelectedGroups.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}