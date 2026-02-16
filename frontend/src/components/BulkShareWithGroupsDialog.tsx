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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
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
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [shareWithAllGroups, setShareWithAllGroups] = useState(false);
    const [operation, setOperation] = useState<'add' | 'replace'>('add');
    const [validationError, setValidationError] = useState<string>("");

    // Fetch user's groups when dialog opens
    useEffect(() => {
        if (open) {
            fetchUserGroups();
            // Reset state when opening
            setSelectedGroupIds([]);
            setShareWithAllGroups(false);
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

    const handleGroupToggle = (groupId: number) => {
        setSelectedGroupIds(prev => {
            if (prev.includes(groupId)) {
                return prev.filter(id => id !== groupId);
            } else {
                return [...prev, groupId];
            }
        });
        // Uncheck "all groups" when selecting specific groups
        setShareWithAllGroups(false);
        // Clear validation error when user makes a selection
        setValidationError("");
    };

    const handleAllGroupsToggle = (checked: boolean) => {
        setShareWithAllGroups(checked);
        if (checked) {
            // Clear specific group selections when "all groups" is checked
            setSelectedGroupIds([]);
        }
        setValidationError("");
    };

    const handleConfirm = async () => {
        // Validate: either "all groups" or at least one specific group must be selected
        if (!shareWithAllGroups && selectedGroupIds.length === 0) {
            setValidationError("Please select at least one group or check 'All my groups'");
            return;
        }

        setIsSubmitting(true);
        try {
            // If "all groups" is selected, pass all group IDs
            const groupIdsToShare = shareWithAllGroups 
                ? userGroups.map(g => g.id)
                : selectedGroupIds;
            
            await onConfirm(groupIdsToShare, operation);
            onOpenChange(false);
        } catch (error) {
            // Error handling is done in parent component
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Share with Groups</DialogTitle>
                    <DialogDescription>
                        Share {selectedCount} {selectedCount === 1 ? 'movie' : 'movies'} with your groups.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Operation Mode Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">How should we update sharing?</Label>
                        <RadioGroup value={operation} onValueChange={(v) => setOperation(v as 'add' | 'replace')}>
                            <div className="flex items-start space-x-3 space-y-0">
                                <RadioGroupItem value="add" id="add" />
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor="add" className="cursor-pointer font-medium">
                                        Add to existing groups
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Keep current sharing and add selected groups
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3 space-y-0">
                                <RadioGroupItem value="replace" id="replace" />
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor="replace" className="cursor-pointer font-medium">
                                        Replace all sharing
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Remove from other groups, use only selected groups
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Group Selection */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Select groups:</Label>
                        
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
                                {/* All My Groups Option */}
                                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                                    <Checkbox
                                        id="all-groups"
                                        checked={shareWithAllGroups}
                                        onCheckedChange={handleAllGroupsToggle}
                                        disabled={selectedGroupIds.length > 0}
                                    />
                                    <Label
                                        htmlFor="all-groups"
                                        className="flex-1 cursor-pointer font-medium"
                                    >
                                        All my groups
                                        <span className="text-xs text-muted-foreground ml-2">
                                            ({userGroups.length} {userGroups.length === 1 ? 'group' : 'groups'})
                                        </span>
                                    </Label>
                                </div>

                                {/* Individual Groups */}
                                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                                    {userGroups.map((group) => (
                                        <div key={group.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`group-${group.id}`}
                                                checked={selectedGroupIds.includes(group.id)}
                                                onCheckedChange={() => handleGroupToggle(group.id)}
                                                disabled={shareWithAllGroups}
                                            />
                                            <Label
                                                htmlFor={`group-${group.id}`}
                                                className="flex-1 cursor-pointer font-normal"
                                            >
                                                {group.name}
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({group.memberCount} {group.memberCount === 1 ? 'member' : 'members'})
                                                </span>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Validation Error */}
                        {validationError && (
                            <p className="text-sm text-destructive">{validationError}</p>
                        )}
                    </div>

                    {/* Info Alert */}
                    {operation === 'replace' && selectedGroupIds.length > 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This will remove these movies from any other groups they're currently shared with.
                            </AlertDescription>
                        </Alert>
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
    );
}