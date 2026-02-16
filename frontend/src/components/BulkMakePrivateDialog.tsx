"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface BulkMakePrivateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: () => Promise<void>;
}

export function BulkMakePrivateDialog({
    open,
    onOpenChange,
    selectedCount,
    onConfirm,
}: BulkMakePrivateDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
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
                    <DialogTitle>Make Movies Private</DialogTitle>
                    <DialogDescription>
                        You are about to make {selectedCount} {selectedCount === 1 ? 'movie' : 'movies'} private.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            This will:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Mark all selected movies as private</li>
                                <li>Remove them from all group sharing</li>
                                <li>Hide them from group feeds</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <p className="text-sm text-muted-foreground">
                        You can always share these movies with groups again later.
                    </p>
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
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Make Private
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}