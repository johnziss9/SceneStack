'use client';

import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Crown, Users, AlertTriangle, Trash2, ArrowRightLeft } from 'lucide-react';
import type { GroupWithTransferEligibility } from '@/types/groupTransfer';

interface GroupAction {
    groupId: number;
    action: 'delete' | 'transfer';
    transferToUserId?: number;
}

interface GroupManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groups: GroupWithTransferEligibility[];
    onComplete: (actions: GroupAction[]) => void;
}

export function GroupManagementModal({
    open,
    onOpenChange,
    groups,
    onComplete,
}: GroupManagementModalProps) {
    const [groupActions, setGroupActions] = useState<Map<number, GroupAction>>(new Map());

    // Reset when dialog opens and auto-handle solo groups
    useEffect(() => {
        if (open) {
            const initialActions = new Map<number, GroupAction>();

            // Automatically mark solo groups for deletion
            groups.forEach(group => {
                if (group.memberCount === 1) {
                    initialActions.set(group.groupId, {
                        groupId: group.groupId,
                        action: 'delete',
                    });
                }
            });

            setGroupActions(initialActions);
        }
    }, [open, groups]);

    const handleActionChange = (groupId: number, action: 'delete' | 'transfer') => {
        const newActions = new Map(groupActions);
        newActions.set(groupId, { groupId, action });
        setGroupActions(newActions);
    };

    const handleTransferUserChange = (groupId: number, userId: number) => {
        const newActions = new Map(groupActions);
        const currentAction = newActions.get(groupId);
        if (currentAction) {
            newActions.set(groupId, { ...currentAction, transferToUserId: userId });
        }
        setGroupActions(newActions);
    };

    const allGroupsHandled = groups.every(group => {
        const action = groupActions.get(group.groupId);
        if (!action) return false;
        if (action.action === 'transfer' && !action.transferToUserId) return false;
        return true;
    });

    const handleProceed = () => {
        if (allGroupsHandled) {
            onComplete(Array.from(groupActions.values()));
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <AlertDialogTitle>Manage Your Groups Before Deletion</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        You have created {groups.length} {groups.length === 1 ? 'group' : 'groups'}.
                        You must decide what to do with {groups.length === 1 ? 'it' : 'them'} before deleting your account.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-4">
                    {groups.map((group) => {
                        const action = groupActions.get(group.groupId);
                        const isSoloGroup = group.memberCount === 1;

                        return (
                            <div
                                key={group.groupId}
                                className="border rounded-lg p-4 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-base">{group.groupName}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isSoloGroup ? (
                                    <div className="p-3 border border-orange-500/50 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                                        <p className="text-sm text-orange-700 dark:text-orange-400">
                                            This group only has you as a member and will be automatically deleted.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor={`action-${group.groupId}`}>What would you like to do?</Label>
                                            <Select
                                                value={action?.action || ''}
                                                onValueChange={(value) => handleActionChange(group.groupId, value as 'delete' | 'transfer')}
                                            >
                                                <SelectTrigger id={`action-${group.groupId}`}>
                                                    <SelectValue placeholder="Choose an action..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="delete">
                                                        <div className="flex items-center gap-2">
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete this group
                                                        </div>
                                                    </SelectItem>
                                                    {group.canTransfer && (
                                                        <SelectItem value="transfer">
                                                            <div className="flex items-center gap-2">
                                                                <ArrowRightLeft className="h-4 w-4" />
                                                                Transfer ownership
                                                            </div>
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {action?.action === 'transfer' && (
                                            <div className="space-y-2">
                                                <Label htmlFor={`transfer-${group.groupId}`}>Transfer to</Label>
                                                <Select
                                                    value={action.transferToUserId?.toString() || ''}
                                                    onValueChange={(value) => handleTransferUserChange(group.groupId, parseInt(value))}
                                                >
                                                    <SelectTrigger id={`transfer-${group.groupId}`}>
                                                        <SelectValue placeholder="Select a member..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {group.eligibleMembers
                                                            .filter(m => m.isEligible)
                                                            .map((member) => (
                                                                <SelectItem key={member.userId} value={member.userId.toString()}>
                                                                    <div className="flex items-center gap-2">
                                                                        {member.username}
                                                                        {member.isPremium && <Crown className="h-3 w-3 text-yellow-500" />}
                                                                        {member.isAdmin && <span className="text-xs text-muted-foreground">(Admin)</span>}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {!group.canTransfer && (
                                            <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                                                <p className="text-sm text-destructive">
                                                    No eligible members to transfer to. This group must be deleted.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleProceed}
                        disabled={!allGroupsHandled}
                    >
                        Continue to Delete Account
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
