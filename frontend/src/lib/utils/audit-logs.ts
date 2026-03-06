/**
 * Audit Log Utilities
 * Functions for formatting and exporting audit log data
 */

import type { AuditLog } from '@/types/admin';
import { AuditEventCategory } from '@/types/admin';
import { toCSV, downloadCSV } from './csv';

/**
 * Gets the human-readable name for an audit event category
 */
export function getCategoryName(category: AuditEventCategory): string {
    const names: Record<AuditEventCategory, string> = {
        [AuditEventCategory.Authentication]: 'Authentication',
        [AuditEventCategory.Account]: 'Account',
        [AuditEventCategory.Group]: 'Group',
        [AuditEventCategory.Watch]: 'Watch',
        [AuditEventCategory.Watchlist]: 'Watchlist',
        [AuditEventCategory.AI]: 'AI',
        [AuditEventCategory.Privacy]: 'Privacy',
        [AuditEventCategory.Security]: 'Security',
        [AuditEventCategory.System]: 'System',
    };
    return names[category] || 'Unknown';
}

/**
 * Converts audit logs to CSV format and downloads the file
 * @param logs - Array of audit logs to export
 * @param filename - Optional filename (defaults to audit-logs-{date})
 */
export function exportAuditLogsToCSV(logs: AuditLog[], filename?: string): void {
    if (!logs || logs.length === 0) {
        return;
    }

    const headers = [
        'ID',
        'Timestamp',
        'Username',
        'IP Address',
        'Category',
        'Event Type',
        'Action',
        'Status',
        'Entity Type',
        'Entity ID',
        'Error Message'
    ];

    const rows = logs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.username || 'Anonymous',
        log.ipAddress,
        getCategoryName(log.category),
        log.eventType,
        log.action,
        log.success ? 'Success' : 'Failed',
        log.entityType || '',
        log.entityId || '',
        log.errorMessage || ''
    ]);

    const csvContent = toCSV(headers, rows);
    const filenameWithDate = filename || `audit-logs-${new Date().toISOString().split('T')[0]}`;
    downloadCSV(csvContent, filenameWithDate);
}
