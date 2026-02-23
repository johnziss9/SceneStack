import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ExternalToast } from 'sonner';

const commonStyle = {
    background: 'oklch(0.25 0.025 240)',
    border: '2px solid oklch(0.62 0.16 38)',
    color: 'oklch(0.98 0 0)',
};

export const toast = {
    success: (message: string, options?: ExternalToast & {
        description?: string;
        action?: { label: string; onClick: () => void };
    }) => {
        return sonnerToast.success(message, {
            ...options,
            icon: <CheckCircle2 className="h-5 w-5" style={{ color: 'oklch(0.70 0.20 145)' }} />,
            style: commonStyle,
        });
    },

    error: (message: string, options?: ExternalToast & {
        description?: string;
    }) => {
        return sonnerToast.error(message, {
            ...options,
            icon: <XCircle className="h-5 w-5" style={{ color: 'oklch(0.65 0.25 25)' }} />,
            style: commonStyle,
        });
    },

    warning: (message: string, options?: ExternalToast & {
        description?: string;
    }) => {
        return sonnerToast.warning(message, {
            ...options,
            icon: <AlertTriangle className="h-5 w-5" style={{ color: 'oklch(0.70 0.18 55)' }} />,
            style: commonStyle,
        });
    },
};
