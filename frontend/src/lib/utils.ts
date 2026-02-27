import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a date string (YYYY-MM-DD) to ISO format at noon local time.
 * This prevents timezone shifts from changing the date.
 *
 * Example: "2024-01-15" -> "2024-01-15T12:00:00.000Z" (or equivalent in user's timezone)
 */
export function dateStringToISO(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon local time to avoid timezone boundary issues
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.toISOString();
}

/**
 * Extracts the date part (YYYY-MM-DD) from an ISO date string.
 *
 * Example: "2024-01-15T12:00:00.000Z" -> "2024-01-15"
 */
export function isoToDateString(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Formats an ISO date string for display.
 * Extracts date part first to avoid timezone issues.
 *
 * Example: "2024-01-15T12:00:00.000Z" -> "Jan 15, 2024"
 */
export function formatWatchDate(isoString: string, options?: Intl.DateTimeFormatOptions): string {
  const dateString = isoToDateString(isoString);
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon to avoid timezone boundary issues when formatting
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return date.toLocaleDateString("en-US", options || defaultOptions);
}
