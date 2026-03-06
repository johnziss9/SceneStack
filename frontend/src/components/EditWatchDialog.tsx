'use client';
import { log } from '@/lib/logger';

import { useState, useEffect, useRef } from 'react';
import { watchApi } from '@/lib';
import type { Watch, UpdateWatchRequest } from '@/types';
import { toast } from '@/lib/toast';
import { dateStringToISO, isoToDateString } from '@/lib/utils';
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
import { Slider } from '@/components/ui/slider';
import { statsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Repeat, X } from 'lucide-react';

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
    const [datePrecision, setDatePrecision] = useState<'full' | 'month' | 'year'>('full');
    const [watchedDate, setWatchedDate] = useState('');
    const [watchedMonth, setWatchedMonth] = useState('');
    const [watchedYear, setWatchedYear] = useState('');
    const [rating, setRating] = useState('');
    const [location, setLocation] = useState('');
    const [customLocation, setCustomLocation] = useState('');
    const [watchedWith, setWatchedWith] = useState('');
    const [notes, setNotes] = useState('');
    const [isRewatch, setIsRewatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [filteredLocationSuggestions, setFilteredLocationSuggestions] = useState<string[]>([]);
    const [watchedWithSuggestions, setWatchedWithSuggestions] = useState<string[]>([]);
    const [showWatchedWithSuggestions, setShowWatchedWithSuggestions] = useState(false);
    const [filteredWatchedWithSuggestions, setFilteredWatchedWithSuggestions] = useState<string[]>([]);

    // Validation errors
    const [dateError, setDateError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Refs for auto-scrolling to errors and focus management
    const formRef = useRef<HTMLFormElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const ratingRef = useRef<HTMLDivElement>(null);
    const locationRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    const { user } = useAuth();

    // Auto-focus first input when dialog opens
    useEffect(() => {
        if (open && dateInputRef.current) {
            // Small delay to ensure dialog animation completes
            const timer = setTimeout(() => {
                dateInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Populate form when watch changes OR when dialog opens
    useEffect(() => {
        if (watch && open) {
            const dateStr = isoToDateString(watch.watchedDate); // Extract YYYY-MM-DD
            setWatchedDate(dateStr);
            setWatchedMonth(dateStr.substring(0, 7)); // YYYY-MM
            setWatchedYear(dateStr.substring(0, 4)); // YYYY
            setDatePrecision('full'); // Default to full when editing
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

            // Fetch location suggestions
            if (user) {
                fetchLocationSuggestions();
                fetchWatchedWithSuggestions();
            }
        }
    }, [watch, open, user]);

    const fetchLocationSuggestions = async () => {
        try {
            const stats = await statsApi.getStats();
            const userLocations = stats.watchesByLocation
                .map(item => item.location)
                .filter(loc => loc !== 'Cinema' && loc !== 'Home'); // Filter out standard options

            // Common location suggestions
            const commonLocations = [
                "Drive-in",
                "Airplane",
                "Hotel",
                "Outdoor cinema",
                "Film festival",
                "Work",
                "School"
            ];

            // Combine user locations (first) with common locations
            const combined = [...new Set([...userLocations, ...commonLocations])];
            setLocationSuggestions(combined);
        } catch (err) {
            // If stats fail, just use common suggestions
            const commonLocations = [
                "Drive-in",
                "Airplane",
                "Hotel",
                "Outdoor cinema",
                "Film festival",
                "Work",
                "School"
            ];
            setLocationSuggestions(commonLocations);
        }
    };

    const fetchWatchedWithSuggestions = async () => {
        try {
            const watches = await watchApi.getWatches();
            const watchedWithValues = watches
                .map(w => w.watchedWith)
                .filter(val => val && val.trim().length > 0) as string[];

            // Get unique values
            const uniqueWatchedWith = [...new Set(watchedWithValues)];
            setWatchedWithSuggestions(uniqueWatchedWith);
        } catch (err) {
            // If fetch fails, just use empty suggestions
            setWatchedWithSuggestions([]);
        }
    };

    // Filter location suggestions based on input
    useEffect(() => {
        if (customLocation.trim()) {
            const filtered = locationSuggestions.filter(loc =>
                loc.toLowerCase().includes(customLocation.toLowerCase())
            );
            setFilteredLocationSuggestions(filtered);
        } else {
            setFilteredLocationSuggestions(locationSuggestions);
        }
    }, [customLocation, locationSuggestions]);

    // Filter watched with suggestions based on input
    useEffect(() => {
        if (watchedWith.trim()) {
            const filtered = watchedWithSuggestions.filter(val =>
                val.toLowerCase().includes(watchedWith.toLowerCase())
            );
            setFilteredWatchedWithSuggestions(filtered);
        } else {
            setFilteredWatchedWithSuggestions(watchedWithSuggestions);
        }
    }, [watchedWith, watchedWithSuggestions]);

    // Validation function
    const validateForm = (): boolean => {
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement | null> | null = null;

        // Reset errors
        setDateError(null);
        setRatingError(null);
        setLocationError(null);

        // Validate watch date based on precision
        if (datePrecision === 'full') {
            if (!watchedDate) {
                setDateError('Watch date is required');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = dateRef;
            } else {
                const selected = new Date(watchedDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (selected > today) {
                    setDateError('Watch date cannot be in the future');
                    isValid = false;
                    if (!firstErrorRef) firstErrorRef = dateRef;
                }
            }
        } else if (datePrecision === 'month') {
            if (!watchedMonth) {
                setDateError('Watch month is required');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = dateRef;
            } else {
                const [year, month] = watchedMonth.split('-').map(Number);
                const today = new Date();
                if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1)) {
                    setDateError('Watch month cannot be in the future');
                    isValid = false;
                    if (!firstErrorRef) firstErrorRef = dateRef;
                }
            }
        } else if (datePrecision === 'year') {
            if (!watchedYear) {
                setDateError('Watch year is required');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = dateRef;
            } else {
                const yearNum = parseInt(watchedYear);
                const currentYear = new Date().getFullYear();
                if (yearNum > currentYear) {
                    setDateError('Watch year cannot be in the future');
                    isValid = false;
                    if (!firstErrorRef) firstErrorRef = dateRef;
                }
            }
        }

        // Validate rating (1-10 if provided, slider enforces 0.5 steps)
        if (rating) {
            const ratingNum = parseFloat(rating);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
                setRatingError('Rating must be between 1 and 10');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = ratingRef;
            }
        }

        // Validate custom location (required when "Other" is selected)
        if (location === 'Other' && !customLocation.trim()) {
            setLocationError('Please specify the location');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = locationRef;
        }

        // Scroll to first error if validation failed
        if (!isValid && firstErrorRef?.current) {
            setTimeout(() => {
                firstErrorRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
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

            // Construct the final date based on precision
            let finalDate: string;
            if (datePrecision === 'full') {
                finalDate = watchedDate;
            } else if (datePrecision === 'month') {
                finalDate = `${watchedMonth}-01`; // First day of the month
            } else {
                finalDate = `${watchedYear}-01-01`; // First day of the year
            }

            const updateData: UpdateWatchRequest = {
                watchedDate: dateStringToISO(finalDate),
                rating: rating ? parseFloat(rating) : undefined,
                notes: notes || undefined,
                watchLocation: finalLocation || undefined,
                watchedWith: watchedWith || undefined,
                isRewatch,
            };

            await watchApi.updateWatch(watch.id, updateData);

            // Reset form
            setDatePrecision('full');
            setWatchedDate('');
            setWatchedMonth('');
            setWatchedYear('');
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
            log.error('Error updating watch', err);
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Watch: {watch.movie.title}</DialogTitle>
                    <DialogDescription>
                        Update the details of this watch entry
                    </DialogDescription>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-2" noValidate>
                    <div className="space-y-4">
                    {/* Watch Date */}
                    <div ref={dateRef} className="space-y-2">
                        <Label htmlFor="datePrecision">Date Watched *</Label>
                        <Select value={datePrecision} onValueChange={(value: 'full' | 'month' | 'year') => {
                            setDatePrecision(value);
                            setDateError(null);
                        }}>
                            <SelectTrigger id="datePrecision" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full">Full Date</SelectItem>
                                <SelectItem value="month">Month & Year</SelectItem>
                                <SelectItem value="year">Year Only</SelectItem>
                            </SelectContent>
                        </Select>

                        {datePrecision === 'full' && (
                            <Input
                                ref={dateInputRef}
                                id="watchedDate"
                                type="date"
                                value={watchedDate}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const selectedDate = e.target.value;
                                    setWatchedDate(selectedDate);
                                    setDateError(null);

                                    if (selectedDate) {
                                        const selected = new Date(selectedDate);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        if (selected > today) {
                                            setDateError('Watch date cannot be in the future');
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    if (!watchedDate) {
                                        setDateError('Watch date is required');
                                    }
                                }}
                                className={dateError ? 'border-destructive' : ''}
                            />
                        )}

                        {datePrecision === 'month' && (
                            <Input
                                ref={dateInputRef}
                                id="watchedMonth"
                                type="month"
                                value={watchedMonth}
                                max={new Date().toISOString().substring(0, 7)}
                                onChange={(e) => {
                                    setWatchedMonth(e.target.value);
                                    setDateError(null);
                                }}
                                onBlur={() => {
                                    if (!watchedMonth) {
                                        setDateError('Watch month is required');
                                    }
                                }}
                                className={dateError ? 'border-destructive' : ''}
                            />
                        )}

                        {datePrecision === 'year' && (
                            <Input
                                ref={dateInputRef}
                                id="watchedYear"
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={watchedYear}
                                onChange={(e) => {
                                    setWatchedYear(e.target.value);
                                    setDateError(null);
                                }}
                                onBlur={() => {
                                    if (!watchedYear) {
                                        setDateError('Watch year is required');
                                    }
                                }}
                                placeholder="Enter year (e.g., 2024)"
                                className={dateError ? 'border-destructive' : ''}
                            />
                        )}

                        {dateError && (
                            <p className="text-sm text-destructive">{dateError}</p>
                        )}
                    </div>

                    {/* Rating */}
                    <div ref={ratingRef} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Rating <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <div className="flex items-center gap-2">
                                {rating ? (
                                    <>
                                        <div className="text-sm font-semibold text-primary">
                                            {rating}/10
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setRating('')}
                                            className="p-1 hover:bg-muted rounded-sm transition-colors"
                                            title="Clear rating"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground">No rating</div>
                                )}
                            </div>
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
                        {ratingError && (
                            <p className="text-sm text-destructive">{ratingError}</p>
                        )}
                    </div>

                    {/* Location */}
                    <div ref={locationRef} className="space-y-2">
                        <Label htmlFor="location">Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="relative">
                            <Select value={location} onValueChange={setLocation}>
                                <SelectTrigger className={`w-full ${location ? "[&>svg]:hidden pr-8" : ""}`}>
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cinema">Cinema</SelectItem>
                                    <SelectItem value="Home">Home</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            {location && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocation('');
                                        setCustomLocation('');
                                        setLocationError(null);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors"
                                    title="Clear location"
                                >
                                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </div>

                        {/* Custom Location (if Other selected) */}
                        {location === 'Other' && (
                            <div className="relative">
                                <Input
                                    id="customLocation"
                                    type="text"
                                    value={customLocation}
                                    onChange={(e) => {
                                        setCustomLocation(e.target.value);
                                        setLocationError(null);
                                        setShowLocationSuggestions(true);
                                    }}
                                    onFocus={() => setShowLocationSuggestions(true)}
                                    onBlur={() => {
                                        // Delay to allow clicking on suggestions
                                        setTimeout(() => {
                                            setShowLocationSuggestions(false);
                                            if (location === 'Other' && !customLocation.trim()) {
                                                setLocationError('Please specify the location');
                                            }
                                        }, 200);
                                    }}
                                    placeholder="Enter location (e.g., Drive-in, Hotel)..."
                                    className={locationError ? 'border-destructive' : ''}
                                />
                                {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                                        {filteredLocationSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                                onClick={() => {
                                                    setCustomLocation(suggestion);
                                                    setShowLocationSuggestions(false);
                                                    setLocationError(null);
                                                }}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {locationError && (
                                    <p className="text-sm text-destructive mt-1">{locationError}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Watched With */}
                    <div className="space-y-2">
                        <Label htmlFor="watchedWith">Watched With <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="relative">
                            <Input
                                id="watchedWith"
                                type="text"
                                value={watchedWith}
                                onChange={(e) => {
                                    setWatchedWith(e.target.value);
                                    setShowWatchedWithSuggestions(true);
                                }}
                                onFocus={() => setShowWatchedWithSuggestions(true)}
                                onBlur={() => {
                                    // Delay to allow clicking on suggestions
                                    setTimeout(() => setShowWatchedWithSuggestions(false), 200);
                                }}
                                placeholder="e.g., Sarah, Mike"
                                className={watchedWith ? "pr-8" : ""}
                            />
                            {watchedWith && (
                                <button
                                    type="button"
                                    onClick={() => setWatchedWith('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors"
                                    title="Clear watched with"
                                >
                                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                            {showWatchedWithSuggestions && filteredWatchedWithSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                                    {filteredWatchedWithSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                            onClick={() => {
                                                setWatchedWith(suggestion);
                                                setShowWatchedWithSuggestions(false);
                                            }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Your thoughts..."
                            rows={4}
                        />
                    </div>

                    {/* Rewatch Card */}
                    <button
                        type="button"
                        onClick={() => setIsRewatch(!isRewatch)}
                        className={`group w-full relative overflow-hidden rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
                            isRewatch
                                ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                : 'border-border bg-card hover:border-primary/50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                isRewatch
                                    ? 'bg-primary/20'
                                    : 'bg-primary/10 group-hover:bg-primary/20'
                            }`}>
                                <Repeat className={`h-4 w-4 transition-colors ${
                                    isRewatch ? 'text-primary' : 'text-primary/70'
                                }`} />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`font-semibold text-sm transition-colors ${
                                    isRewatch ? 'text-primary' : 'group-hover:text-primary'
                                }`}>
                                    This is a rewatch
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    You've seen this movie before
                                </p>
                            </div>
                            {isRewatch && (
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </button>
                    </div>

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
    );
}