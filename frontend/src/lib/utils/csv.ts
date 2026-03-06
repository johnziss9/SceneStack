/**
 * CSV Export Utilities
 * Provides functions for generating and downloading CSV files
 */

/**
 * Escapes a CSV field value
 * Fields containing commas, quotes, or newlines are wrapped in quotes
 * Quotes within the value are escaped as double quotes
 */
export function escapeCSVField(field: string | number | null | undefined): string {
    const str = String(field ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Converts data to CSV format
 * @param headers - Array of column header names
 * @param rows - Array of row data (each row is an array of values)
 * @returns CSV formatted string
 */
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const csvRows = [
        headers.map(escapeCSVField).join(','),
        ...rows.map(row => row.map(escapeCSVField).join(','))
    ];
    return csvRows.join('\n');
}

/**
 * Downloads a CSV file to the user's computer
 * @param content - CSV content as string
 * @param filename - Name of the file to download (without .csv extension)
 */
export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
