import { toast } from './toast';
import { ApiError } from './api-client';

/**
 * Helper function to show error toasts
 * Automatically extracts error messages from various error types
 */
export function showErrorToast(error: unknown, fallbackMessage: string = 'An error occurred') {
    if (error instanceof ApiError) {
        toast.error(error.message || fallbackMessage);
    } else if (error instanceof Error) {
        toast.error(error.message || fallbackMessage);
    } else {
        toast.error(fallbackMessage);
    }
}
