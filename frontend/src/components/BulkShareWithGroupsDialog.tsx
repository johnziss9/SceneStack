"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { groupApi } from "@/lib/api";
import { toast } from "sonner";
import type { GroupBasicInfo } from "@/types";

interface BulkShareWithGroupsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: (groupIds: number[], operation: 'add' | 'replace') => Promise<void>;
}

export function BulkShareWithGroupsDialog({
    open,
    onOpenChange,
    selectedCount,
    onConfirm,
}: BulkShareWithGroupsDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [userGroups, setUserGroups] = useState<GroupBasicInfo[]>([]);
    const [sharingMode, setSharingMode] = useState<'all' | 'specific'>('all');
    const [validationError, setValidationError] = useState<string>("");

    // Secondary modal state for specific groups
    const [isGroupSelectionOpen, setIsGroupSelectionOpen] = useState(false);
    const [tempSelectedGroups, setTempSelectedGroups] = useState<number[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
    const [operation, setOperation] = useState<'add' | 'replace'>('add');

    // Fetch user's groups when dialog opens
    useEffect(() => {
        if (open) {
            fetchUserGroups();
            // Reset state when opening
            setSharingMode('all');
            setSelectedGroups([]);
            setTempSelectedGroups([]);
            setOperation('add');
            setValidationError("");
        }
    }, [open]);

    const fetchUserGroups = async () => {
        try {
            setIsLoadingGroups(true);
            const groups = await groupApi.getUserGroups();
            setUserGroups(groups);
        } catch (err) {
            console.error("Failed to fetch groups:", err);
            toast.error("Failed to load groups");
        } finally {
            setIsLoadingGroups(false);
        }
    };

    const handleConfirm = async () => {
        // Validate
        if (sharingMode === 'specific' && selectedGroups.length === 0) {
            setValidationError("Please select at least one group");
            return;
        }

        setIsSubmitting(true);
        try {
            // If "all groups" is selected, pass all group IDs
            const groupIdsToShare = sharingMode === 'all'
                ? userGroups.map(g => g.id)
                : selectedGroups;

            // When sharing with all groups, always use 'replace' operation
            const operationToUse = sharingMode === 'all' ? 'replace' : operation;

            await onConfirm(groupIdsToShare, operationToUse);
            onOpenChange(false);
        } catch (error) {
            // Error handling is done in parent component
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Share with Groups</DialogTitle>
                        <DialogDescription>
                            Share {selectedCount} {selectedCount === 1 ? 'movie' : 'movies'} with your groups.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isLoadingGroups ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : userGroups.length === 0 ? (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    You are not a member of any groups yet. Create or join a group first.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-3">
                                {/* Card 1: All My Groups */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSharingMode('all');
                                        setSelectedGroups([]);
                                        setValidationError("");
                                    }}
                                    className={`group w-full relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                        sharingMode === 'all'
                                            ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                            : 'border-border bg-card hover:border-primary/50'
                                    }`}
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
                                                Share with all {userGroups.length} {userGroups.length === 1 ? 'group' : 'groups'}
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

                                {/* Card 2: Specific Groups */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSharingMode('specific');
                                        setValidationError("");
                                        setTempSelectedGroups(selectedGroups);
                                        setIsGroupSelectionOpen(true);
                                    }}
                                    className={`group w-full relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                                        sharingMode === 'specific'
                                            ? 'border-primary bg-gradient-to-r from-primary/10 to-transparent'
                                            : 'border-border bg-card hover:border-primary/50'
                                    }`}
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
                            </div>
                        )}

                        {/* Validation Error */}
                        {validationError && (
                            <p className="text-sm text-destructive">{validationError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting || isLoadingGroups || userGroups.length === 0}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Sharing
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Secondary Modal for Specific Group Selection */}
            <Dialog open={isGroupSelectionOpen} onOpenChange={(open) => {
                setIsGroupSelectionOpen(open);
                // If closing and no groups were selected, revert to 'all' mode
                if (!open) {
                    setTempSelectedGroups(selectedGroups); // Reset temp to actual
                    if (selectedGroups.length === 0) {
                        setSharingMode('all');
                    }
                }
            }}>
                <DialogContent className={`max-h-[80vh] flex flex-col ${userGroups.length > 5 ? 'sm:max-w-[700px]' : 'sm:max-w-[500px]'}`}>
                    <DialogHeader>
                        <DialogTitle>Select Groups to Share With</DialogTitle>
                        <DialogDescription>
                            Choose which groups to share these movies with
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* Operation Mode Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">How should we update sharing?</Label>
                            <div className="grid gap-3">
                                {/* Add to existing groups card */}
                                <button
                                    type="button"
                                    onClick={() => setOperation('add')}
                                    className={`relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:bg-accent ${
                                        operation === 'add'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted bg-card'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                            operation === 'add' ? 'border-primary' : 'border-muted-foreground'
                                        }`}>
                                            {operation === 'add' && (
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <span className="font-medium">Add to existing groups</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        Keep current sharing and add selected groups
                                    </p>
                                </button>

                                {/* Replace all sharing card */}
                                <button
                                    type="button"
                                    onClick={() => setOperation('replace')}
                                    className={`relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:bg-accent ${
                                        operation === 'replace'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted bg-card'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                            operation === 'replace' ? 'border-primary' : 'border-muted-foreground'
                                        }`}>
                                            {operation === 'replace' && (
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <span className="font-medium">Replace all sharing</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        Remove from other groups, use only selected groups
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Group Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Select groups:</Label>
                            <div className={`max-h-[300px] overflow-y-auto pr-2 gap-2 ${userGroups.length > 5 ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-2'}`}>
                                {userGroups.map((group) => (
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
                                ))}
                            </div>
                        </div>

                        {/* Info Alert */}
                        {operation === 'replace' && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    This will remove these movies from any other groups they're currently shared with.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsGroupSelectionOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setSelectedGroups(tempSelectedGroups);
                                setValidationError("");
                                setIsGroupSelectionOpen(false);
                            }}
                            disabled={tempSelectedGroups.length === 0}
                        >
                            Confirm ({tempSelectedGroups.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
