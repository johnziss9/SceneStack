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

    // Validation errors
    const [dateError, setDateError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

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

            // Clear validation errors when dialog opens
            setDateError(null);
            setRatingError(null);
            setLocationError(null);
        }
    }, [watch, open]);

    // Validation function
    const validateForm = (): boolean => {
        let isValid = true;

        // Reset errors
        setDateError(null);
        setRatingError(null);
        setLocationError(null);

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

        return isValid;
    };

    // Check if form is valid (for disabling submit button)
    const isFormValid = (): boolean => {
        if (!watchedDate) return false;
        if (rating && (parseInt(rating) < 1 || parseInt(rating) > 10)) return false;
        if (location === 'Other' && !customLocation.trim()) return false;
        return true;
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
            setDateError(null);
            setRatingError(null);
            setLocationError(null);

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
                        <Button type="submit" disabled={isSubmitting || !isFormValid()}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}