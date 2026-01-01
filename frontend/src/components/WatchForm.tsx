"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { watchApi } from '@/lib';
import type { TmdbMovie, CreateWatchRequest } from '@/types';
import { toast } from 'sonner';

interface WatchFormProps {
    movie: TmdbMovie | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function WatchForm({ movie, open, onOpenChange, onSuccess }: WatchFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [watchedDate, setWatchedDate] = useState(
        new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    );
    const [rating, setRating] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [watchLocation, setWatchLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState('');
    const [watchedWith, setWatchedWith] = useState('');
    const [isRewatch, setIsRewatch] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!movie) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const watchData: CreateWatchRequest = {
                tmdbId: movie.id,
                userId: 1, // Hardcoded for Phase 1 (no auth yet)
                watchedDate: new Date(watchedDate).toISOString(),
                rating: rating ? parseInt(rating) : undefined,
                notes: notes || undefined,
                watchLocation: watchLocation === "Other" ? customLocation : watchLocation || undefined,
                watchedWith: watchedWith || undefined,
                isRewatch,
            };

            await watchApi.createWatch(watchData);

            // Success! Reset form and close dialog
            resetForm();
            onOpenChange(false);
            toast.success('Watch logged successfully!', {
                description: `Added ${movie.title} to your watched list`,
            });
            onSuccess();
        } catch (err) {
            console.error('Failed to create watch:', err);
            toast.error('Failed to add watch', {
                description: 'Please try again later',
            });
            setError('Failed to add watch. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setWatchedDate(new Date().toISOString().split('T')[0]);
        setRating('');
        setNotes('');
        setWatchLocation('');
        setCustomLocation('');
        setWatchedWith('');
        setIsRewatch(false);
        setError(null);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && !isSubmitting) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    if (!movie) return null;

    const movieYear = movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : '';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Log Watch</DialogTitle>
                    <DialogDescription>
                        {movie.title} {movieYear && `(${movieYear})`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Watch Date */}
                    <div className="space-y-2">
                        <Label htmlFor="watchedDate">Watch Date *</Label>
                        <Input
                            id="watchedDate"
                            type="date"
                            value={watchedDate}
                            onChange={(e) => setWatchedDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                        <Label htmlFor="rating">Rating (1-10)</Label>
                        <Input
                            id="rating"
                            type="number"
                            min="1"
                            max="10"
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Select value={watchLocation} onValueChange={setWatchLocation}>
                            <SelectTrigger id="location">
                                <SelectValue placeholder="Select location (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cinema">Cinema</SelectItem>
                                <SelectItem value="Home">Home</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Show text input when "Other" is selected */}
                        {watchLocation === "Other" && (
                            <Input
                                type="text"
                                placeholder="Enter location (e.g., Friend's house, Drive-in)..."
                                value={customLocation}
                                onChange={(e) => setCustomLocation(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Watched With */}
                    <div className="space-y-2">
                        <Label htmlFor="watchedWith">Watched With</Label>
                        <Input
                            id="watchedWith"
                            type="text"
                            value={watchedWith}
                            onChange={(e) => setWatchedWith(e.target.value)}
                            placeholder="e.g., Sarah, Mike (optional)"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Your thoughts about this movie... (optional)"
                            rows={4}
                        />
                    </div>

                    {/* Rewatch Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            id="isRewatch"
                            type="checkbox"
                            checked={isRewatch}
                            onChange={(e) => setIsRewatch(e.target.checked)}
                            className="h-4 w-4 rounded border-input bg-background"
                        />
                        <Label htmlFor="isRewatch" className="cursor-pointer">
                            This is a rewatch
                        </Label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {/* Submit Button */}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Watch'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}