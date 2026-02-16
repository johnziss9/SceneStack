'use client';

import { useState, useEffect } from 'react';
import { watchApi } from '@/lib';
import type { Watch, UpdateWatchRequest } from '@/types';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [shareWithAllGroups, setShareWithAllGroups] = useState(false);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

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
            setIsPrivate(watch.isPrivate || false);
            // Note: groupIds will be set after fetching groups

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

            // Set selected groups based on watch's groupIds
            if (watch?.groupIds) {
                // Check if all groups are selected (meaning "All my groups" was chosen)
                const allGroupIds = groups.map(g => g.id).sort();
                const watchGroupIds = [...watch.groupIds].sort();
                const isAllGroups = allGroupIds.length === watchGroupIds.length && 
                                allGroupIds.every((id, index) => id === watchGroupIds[index]);
                
                if (isAllGroups) {
                    setShareWithAllGroups(true);
                    setSelectedGroups([]);
                } else {
                    setShareWithAllGroups(false);
                    setSelectedGroups(watch.groupIds);
                }
            } else {
                setShareWithAllGroups(false);
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

        // Validate rating (1-10 if provided)
        if (rating && (parseInt(rating) < 1 || parseInt(rating) > 10)) {
            setRatingError('Rating must be between 1 and 10');
            isValid = false;
        }

        // Validate custom location (required when "Other" is selected)
        if (location === 'Other' && !customLocation.trim()) {
            setLocationError('Please specify the location');
            isValid = false;
        }

        // Validate privacy + groups combination
        if (!isPrivate && selectedGroups.length === 0 && !shareWithAllGroups) {
            setPrivacyError('Please select at least one group to share with, or mark as private');
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
                rating: rating ? parseInt(rating) : undefined,
                notes: notes || undefined,
                watchLocation: finalLocation || undefined,
                watchedWith: watchedWith || undefined,
                isRewatch,
                isPrivate,
                groupIds: shareWithAllGroups 
                    ? userGroups.map(g => g.id) // Send all group IDs if "all groups" is selected
                    : (selectedGroups.length > 0 ? selectedGroups : undefined),
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
            setIsPrivate(false);
            setSelectedGroups([]);
            setShareWithAllGroups(false);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Watch: {watch.movie.title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                    <div className="space-y-2">
                        <Label htmlFor="rating">Rating (1-10)</Label>
                        <Input
                            id="rating"
                            type="number"
                            value={rating}
                            onChange={(e) => {
                                setRating(e.target.value);
                                setRatingError(null);
                            }}
                            onBlur={() => {
                                if (rating && (parseInt(rating) < 1 || parseInt(rating) > 10)) {
                                    setRatingError('Rating must be between 1 and 10');
                                }
                            }}
                            placeholder="Optional"
                            className={ratingError ? 'border-destructive' : ''}
                        />
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

                    {/* Privacy & Sharing Section - Orange Border Container */}
                    <div className="border-2 border-primary rounded-lg p-4 space-y-4">
                        {/* Privacy Checkbox */}
                        <div className="flex items-center gap-2">
                            <input
                                id="isPrivate"
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setIsPrivate(checked);
                                setPrivacyError(null); // Clear error when changing privacy
                                // If marking as private, clear group selections
                                if (checked) {
                                    setSelectedGroups([]);
                                    setShareWithAllGroups(false);
                                }
                            }}
                            className="h-4 w-4 rounded border-input bg-background"
                        />
                        <Label htmlFor="isPrivate" className="cursor-pointer">
                            Mark as private (only I can see this)
                        </Label>
                    </div>

                    {/* Share with Groups */}
                    <div className="space-y-2">
                        <Label className={isPrivate ? 'text-muted-foreground' : ''}>
                            Share with groups
                        </Label>
                        
                        {/* Case 1: User has no groups */}
                        {userGroups.length === 0 && !isLoadingGroups && (
                            <div className="border rounded-md p-3 bg-muted/50">
                                <p className="text-sm text-muted-foreground">
                                    {isPrivate 
                                        ? "You're not a member of any groups yet"
                                        : "Join a group to share your watches, or keep this watch private"
                                    }
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    💡 Create or join a group to share your watches
                                </p>
                            </div>
                        )}

                        {/* Case 2: User has groups */}
                        {userGroups.length > 0 && (
                            <>
                                {/* All My Groups Checkbox */}
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="edit-shareWithAllGroups"
                                        checked={shareWithAllGroups}
                                        disabled={isPrivate || selectedGroups.length > 0}
                                        onCheckedChange={(checked) => {
                                            setShareWithAllGroups(checked as boolean);
                                            setPrivacyError(null);
                                            if (checked) {
                                                setSelectedGroups([]); // Clear specific selections
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor="edit-shareWithAllGroups"
                                        className={`cursor-pointer ${isPrivate || selectedGroups.length > 0 ? 'text-muted-foreground' : ''}`}
                                    >
                                        All my groups
                                    </Label>
                                </div>

                                {/* Specific Groups Selection */}
                                <div className="space-y-2">
                                    <Label className={isPrivate || shareWithAllGroups ? 'text-muted-foreground' : ''}>
                                        Select specific groups:
                                    </Label>
                                    <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                                        {isLoadingGroups ? (
                                            <p className="text-sm text-muted-foreground">Loading groups...</p>
                                        ) : (
                                            userGroups.map((group) => (
                                                <div key={group.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`edit-group-${group.id}`}
                                                        checked={selectedGroups.includes(group.id)}
                                                        disabled={isPrivate || shareWithAllGroups}
                                                        onCheckedChange={(checked) => {
                                                            setPrivacyError(null);
                                                            if (checked) {
                                                                setSelectedGroups([...selectedGroups, group.id]);
                                                                setShareWithAllGroups(false); // Disable "all groups" when specific selected
                                                            } else {
                                                                setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor={`edit-group-${group.id}`}
                                                        className={`cursor-pointer text-sm font-normal ${
                                                            isPrivate || shareWithAllGroups ? 'text-muted-foreground' : ''
                                                        }`}
                                                    >
                                                        {group.name}
                                                        <span className="text-muted-foreground ml-2">
                                                            ({group.memberCount} {group.memberCount === 1 ? 'member' : 'members'})
                                                        </span>
                                                    </Label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Privacy Error Message */}
                        {privacyError && (
                            <p className="text-sm text-destructive">⚠️ {privacyError}</p>
                        )}
                    </div>
                </div>
                {/* End Privacy & Sharing Section */}

                {/* Error Message */}
                {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
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
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}