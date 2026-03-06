import { getCategoryName, exportAuditLogsToCSV } from '@/lib/utils/audit-logs';
import { AuditEventCategory } from '@/types/admin';
import type { AuditLog } from '@/types/admin';

// Mock the csv utils module
jest.mock('@/lib/utils/csv', () => ({
    toCSV: jest.fn(),
    downloadCSV: jest.fn(),
    escapeCSVField: jest.fn((field) => String(field ?? '')),
}));

import { toCSV, downloadCSV } from '@/lib/utils/csv';

describe('Audit Log Utilities', () => {
    describe('getCategoryName', () => {
        it('returns correct names for all categories', () => {
            expect(getCategoryName(AuditEventCategory.Authentication)).toBe('Authentication');
            expect(getCategoryName(AuditEventCategory.Account)).toBe('Account');
            expect(getCategoryName(AuditEventCategory.Group)).toBe('Group');
            expect(getCategoryName(AuditEventCategory.Watch)).toBe('Watch');
            expect(getCategoryName(AuditEventCategory.Watchlist)).toBe('Watchlist');
            expect(getCategoryName(AuditEventCategory.AI)).toBe('AI');
            expect(getCategoryName(AuditEventCategory.Privacy)).toBe('Privacy');
            expect(getCategoryName(AuditEventCategory.Security)).toBe('Security');
            expect(getCategoryName(AuditEventCategory.System)).toBe('System');
        });

        it('returns "Unknown" for invalid category', () => {
            expect(getCategoryName(999 as AuditEventCategory)).toBe('Unknown');
        });
    });

    describe('exportAuditLogsToCSV', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            (toCSV as jest.Mock).mockReturnValue('mocked,csv,content');
        });

        const createMockLog = (overrides?: Partial<AuditLog>): AuditLog => ({
            id: 1,
            userId: 123,
            username: 'testuser',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            category: AuditEventCategory.Authentication,
            eventType: 'Login.Success',
            action: 'User logged in',
            timestamp: '2024-01-15T10:30:00Z',
            entityType: null,
            entityId: null,
            oldValues: null,
            newValues: null,
            additionalData: null,
            success: true,
            errorMessage: null,
            ...overrides,
        });

        it('does nothing when logs array is empty', () => {
            exportAuditLogsToCSV([]);

            expect(toCSV).not.toHaveBeenCalled();
            expect(downloadCSV).not.toHaveBeenCalled();
        });

        it('does nothing when logs is null', () => {
            exportAuditLogsToCSV(null as any);

            expect(toCSV).not.toHaveBeenCalled();
            expect(downloadCSV).not.toHaveBeenCalled();
        });

        it('converts logs to CSV with correct headers', () => {
            const logs = [createMockLog()];

            exportAuditLogsToCSV(logs);

            expect(toCSV).toHaveBeenCalledWith(
                [
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
                ],
                expect.any(Array)
            );
        });

        it('formats log data correctly for CSV', () => {
            const log = createMockLog({
                id: 42,
                username: 'john',
                ipAddress: '10.0.0.1',
                category: AuditEventCategory.Group,
                eventType: 'Group.Created',
                action: 'Created new group',
                timestamp: '2024-02-20T15:45:30Z',
                success: true,
                entityType: 'Group',
                entityId: '100',
                errorMessage: null,
            });

            exportAuditLogsToCSV([log]);

            const expectedRow = [
                42,
                '2024-02-20T15:45:30.000Z',
                'john',
                '10.0.0.1',
                'Group',
                'Group.Created',
                'Created new group',
                'Success',
                'Group',
                '100',
                ''
            ];

            expect(toCSV).toHaveBeenCalledWith(expect.any(Array), [expectedRow]);
        });

        it('handles failed events correctly', () => {
            const log = createMockLog({
                success: false,
                errorMessage: 'Authentication failed',
            });

            exportAuditLogsToCSV([log]);

            const rows = toCSV.mock.calls[0][1];
            expect(rows[0][7]).toBe('Failed'); // Status column
            expect(rows[0][10]).toBe('Authentication failed'); // Error message column
        });

        it('handles null username as "Anonymous"', () => {
            const log = createMockLog({ username: null });

            exportAuditLogsToCSV([log]);

            const rows = toCSV.mock.calls[0][1];
            expect(rows[0][2]).toBe('Anonymous');
        });

        it('handles null optional fields as empty strings', () => {
            const log = createMockLog({
                entityType: null,
                entityId: null,
                errorMessage: null,
            });

            exportAuditLogsToCSV([log]);

            const rows = toCSV.mock.calls[0][1];
            expect(rows[0][8]).toBe(''); // Entity Type
            expect(rows[0][9]).toBe(''); // Entity ID
            expect(rows[0][10]).toBe(''); // Error Message
        });

        it('processes multiple logs correctly', () => {
            const logs = [
                createMockLog({ id: 1, username: 'user1' }),
                createMockLog({ id: 2, username: 'user2' }),
                createMockLog({ id: 3, username: 'user3' }),
            ];

            exportAuditLogsToCSV(logs);

            const rows = toCSV.mock.calls[0][1];
            expect(rows).toHaveLength(3);
            expect(rows[0][0]).toBe(1);
            expect(rows[1][0]).toBe(2);
            expect(rows[2][0]).toBe(3);
        });

        it('uses default filename with current date when not provided', () => {
            const logs = [createMockLog()];
            const today = new Date().toISOString().split('T')[0];

            exportAuditLogsToCSV(logs);

            expect(downloadCSV).toHaveBeenCalledWith(
                'mocked,csv,content',
                `audit-logs-${today}`
            );
        });

        it('uses custom filename when provided', () => {
            const logs = [createMockLog()];

            exportAuditLogsToCSV(logs, 'custom-export');

            expect(downloadCSV).toHaveBeenCalledWith(
                'mocked,csv,content',
                'custom-export'
            );
        });

        it('converts timestamps to ISO format', () => {
            const log = createMockLog({
                timestamp: '2024-03-25T08:15:45Z',
            });

            exportAuditLogsToCSV([log]);

            const rows = toCSV.mock.calls[0][1];
            expect(rows[0][1]).toBe('2024-03-25T08:15:45.000Z');
        });

        it('maps all category types correctly', () => {
            const categories = [
                AuditEventCategory.Authentication,
                AuditEventCategory.Account,
                AuditEventCategory.Group,
                AuditEventCategory.Watch,
                AuditEventCategory.Watchlist,
                AuditEventCategory.AI,
                AuditEventCategory.Privacy,
                AuditEventCategory.Security,
                AuditEventCategory.System,
            ];

            const expectedNames = [
                'Authentication',
                'Account',
                'Group',
                'Watch',
                'Watchlist',
                'AI',
                'Privacy',
                'Security',
                'System',
            ];

            const logs = categories.map((cat, idx) =>
                createMockLog({ id: idx, category: cat })
            );

            exportAuditLogsToCSV(logs);

            const rows = toCSV.mock.calls[0][1];
            rows.forEach((row, idx) => {
                expect(row[4]).toBe(expectedNames[idx]); // Category column
            });
        });
    });
});
