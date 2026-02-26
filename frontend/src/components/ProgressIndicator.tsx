"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
    total: number;
    current: number;
    operation: string;
    showPercentage?: boolean;
}

export function ProgressIndicator({
    total,
    current,
    operation,
    showPercentage = true,
}: ProgressIndicatorProps) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className="space-y-3 p-6 rounded-lg bg-card border border-border">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                    {/* Modern spinner in the corner */}
                    <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary border-r-primary/50 animate-spin" />
                </div>
                <div className="flex-1">
                    <p className="font-medium">{operation}</p>
                    <p className="text-sm text-muted-foreground">
                        Processing {current} of {total.toLocaleString()} {total === 1 ? 'item' : 'items'}
                    </p>
                </div>
                {showPercentage && (
                    <div className="text-2xl font-bold text-primary">
                        {percentage}%
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <Progress value={percentage} className="h-2" />
        </div>
    );
}
