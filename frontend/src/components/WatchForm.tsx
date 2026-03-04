"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, Users, Repeat, X } from 'lucide-react';
import { watchApi } from '@/lib';
import type { TmdbMovie, CreateWatchRequest, GroupBasicInfo } from '@/types';
import { groupApi, statsApi } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/lib/toast';
import { dateStringToISO } from '@/lib/utils';

interface WatchFormProps {
    movie: TmdbMovie | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    isFirstWatch?: boolean; // If true, show privacy fields. If false, hide them (privacy already set)
}

export function WatchForm({ movie, open, onOpenChange, onSuccess, isFirstWatch = true }: WatchFormProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for auto-scrolling to errors and focus management
    const formRef = useRef<HTMLFormElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const ratingRef = useRef<HTMLDivElement>(null);
    const locationRef = useRef<HTMLDivElement>(null);
    const privacyRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Validation errors
    const [dateError, setDateError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Form state
    const [datePrecision, setDatePrecision] = useState<'full' | 'month' | 'year'>('full');
    const [watchedDate, setWatchedDate] = useState(
        new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    );
    const [watchedMonth, setWatchedMonth] = useState(
        new Date().toISOString().substring(0, 7) // Current month in YYYY-MM format
    );
    const [watchedYear, setWatchedYear] = useState(
        new Date().getFullYear().toString() // Current year
    );
    const [rating, setRating] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [watchLocation, setWatchLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState('');
    const [watchedWith, setWatchedWith] = useState('');
    const [isRewatch, setIsRewatch] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [filteredLocationSuggestions, setFilteredLocationSuggestions] = useState<string[]>([]);
    const [watchedWithSuggestions, setWatchedWithSuggestions] = useState<string[]>([]);
    const [showWatchedWithSuggestions, setShowWatchedWithSuggestions] = useState(false);
    const [filteredWatchedWithSuggestions, setFilteredWatchedWithSuggestions] = useState<string[]>([]);

    // Privacy & Sharing - Simplified state management
    type SharingMode = 'private' | 'specific' | 'all';
    const [sharingMode, setSharingMode] = useState<SharingMode | null>(null); // No default - user must choose
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [privacyError, setPrivacyError] = useState<string | null>(null);

    // Group selection modal
    const [isGroupSelectionOpen, setIsGroupSelectionOpen] = useState(false);
    const [tempSelectedGroups, setTempSelectedGroups] = useState<number[]>([]);

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

    // Fetch user's groups when dialog opens (only for first watch)
    useEffect(() => {
        if (open && user) {
            if (isFirstWatch) {
                fetchUserGroups();
            }
            fetchLocationSuggestions();
            fetchWatchedWithSuggestions();
        }
    }, [open, user, isFirstWatch]);

    const fetchUserGroups = async () => {
        try {
            setIsLoadingGroups(true);
            const groups = await groupApi.getUserGroups();
            setUserGroups(groups);
        } catch (err) {
            console.error('Failed to fetch groups:', err);
            // Don't show error toast, groups are optional
        } finally {
            setIsLoadingGroups(false);
        }
    };

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
        setPrivacyError(null);

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
        if (watchLocation === "Other" && !customLocation.trim()) {
            setLocationError('Please specify the location');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = locationRef;
        }

        // Validate privacy selection (only required for first watch)
        if (isFirstWatch) {
            if (!sharingMode) {
                setPrivacyError('Please select a privacy option');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = privacyRef;
            } else if (sharingMode === 'specific' && selectedGroups.length === 0) {
                setPrivacyError('Please select at least one group to share with');
                isValid = false;
                if (!firstErrorRef) firstErrorRef = privacyRef;
            }
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

        if (!movie) return;

        // Validate form before submitting
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Construct the final date based on precision
            let finalDate: string;
            if (datePrecision === 'full') {
                finalDate = watchedDate;
            } else if (datePrecision === 'month') {
                finalDate = `${watchedMonth}-01`; // First day of the month
            } else {
                finalDate = `${watchedYear}-01-01`; // First day of the year
            }

            const watchData: CreateWatchRequest = {
                tmdbId: movie.id,
                watchedDate: dateStringToISO(finalDate),
                rating: rating ? parseFloat(rating) : undefined,
                notes: notes || undefined,
                watchLocation: watchLocation === "Other" ? customLocation : watchLocation || undefined,
                watchedWith: watchedWith || undefined,
                isRewatch,
                // Only include privacy data on first watch
                ...(isFirstWatch && {
                    isPrivate: sharingMode === 'private',
                    groupIds: sharingMode === 'all'
                        ? userGroups.map(g => g.id)
                        : sharingMode === 'specific'
                        ? selectedGroups
                        : undefined,
                }),
            };

            await watchApi.createWatch(watchData);

            // Success! Reset form and close dialog
            resetForm();
            onOpenChange(false);
            toast.success(`${movie.title} added to watched list`, {
                action: {
                    label: 'View All',
                    onClick: () => router.push('/watched'),
                },
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
        setDatePrecision('full');
        setWatchedDate(new Date().toISOString().split('T')[0]);
        setWatchedMonth(new Date().toISOString().substring(0, 7));
        setWatchedYear(new Date().getFullYear().toString());
        setRating('');
        setNotes('');
        setWatchLocation('');
        setCustomLocation('');
        setWatchedWith('');
        setIsRewatch(false);
        setSharingMode(null); // Reset to no selection - user must choose
        setSelectedGroups([]);
        setError(null);
        setDateError(null);
        setRatingError(null);
        setLocationError(null);
        setPrivacyError(null);
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
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={`${isFirstWatch ? 'sm:max-w-[900px]' : 'sm:max-w-[500px]'} max-h-[90vh] flex flex-col`}>
                <DialogHeader>
                    <DialogTitle>Log Watch</DialogTitle>
                    <DialogDescription>
                        {movie.title} {movieYear && `(${movieYear})`}
                    </DialogDescription>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-2" noValidate>
                    <div className={`grid grid-cols-1 ${isFirstWatch ? 'lg:grid-cols-2' : ''} gap-6`}>
                        {/* Left Column - Form Fields */}
                        <div className="space-y-4">
                    {/* Watch Date */}
                    <div ref={dateRef} className="space-y-2">
                        <Label htmlFor="datePrecision">Watch Date *</Label>
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
                            <Select value={watchLocation} onValueChange={setWatchLocation}>
                                <SelectTrigger id="location" className={`w-full ${watchLocation ? "[&>svg]:hidden pr-8" : ""}`}>
                                    <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cinema">Cinema</SelectItem>
                                    <SelectItem value="Home">Home</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            {watchLocation && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setWatchLocation('');
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

                        {/* Show text input when "Other" is selected */}
                        {watchLocation === "Other" && (
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Enter location (e.g., Drive-in, Hotel)..."
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
                                            if (watchLocation === "Other" && !customLocation.trim()) {
                                                setLocationError('Please specify the location');
                                            }
                                        }, 200);
                                    }}
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
                            placeholder="Your thoughts about this movie..."
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
                    {/* End Left Column */}

                    {/* Right Column - Privacy & Sharing (only shown on first watch) */}
                    {isFirstWatch && (
                    <div ref={privacyRef} className="space-y-4">
                        <Label className="text-base">Privacy & Sharing *</Label>

                        {/* Three Privacy Cards - Horizontal Layout */}
                        <div className={`space-y-3 p-3 rounded-lg border transition-colors ${
                            privacyError ? 'border-destructive bg-destructive/5' : 'border-transparent'
                        }`}>
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
                                    // Always open the modal when clicking this card
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
                            <p className="text-sm text-destructive">{privacyError}</p>
                        )}
                    </div>
                    )}
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
                                        id={`modal-group-${group.id}`}
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
                                        htmlFor={`modal-group-${group.id}`}
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
                            setTempSelectedGroups(selectedGroups); // Reset to original
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