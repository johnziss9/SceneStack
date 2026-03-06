import { adminApi } from '@/lib/api/admin';
import { api } from '@/lib/api-client';
import { AuditEventCategory } from '@/types/admin';
import type { AuditLog, AuditLogListResponse, SystemHealth, DashboardStats } from '@/types/admin';

// Mock the api-client
jest.mock('@/lib/api-client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

describe('Admin API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAuditLogs', () => {
        const mockResponse: AuditLogListResponse = {
            logs: [
                {
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
                },
            ],
            totalCount: 1,
        };

        it('calls API with no filters when none provided', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await adminApi.getAuditLogs();

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs');
            expect(result).toEqual(mockResponse);
        });

        it('includes page parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ page: 2 });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?page=2');
        });

        it('includes pageSize parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ pageSize: 50 });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?pageSize=50');
        });

        it('includes userId parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ userId: 123 });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?userId=123');
        });

        it('includes username parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ username: 'john' });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?username=john');
        });

        it('includes category parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ category: AuditEventCategory.Authentication });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?category=0');
        });

        it('includes eventType parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ eventType: 'Login.Success' });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?eventType=Login.Success');
        });

        it('includes date range parameters in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({
                dateFrom: '2024-01-01',
                dateTo: '2024-01-31',
            });

            expect(api.get).toHaveBeenCalledWith(
                '/api/admin/audit-logs?dateFrom=2024-01-01&dateTo=2024-01-31'
            );
        });

        it('includes success parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ success: true });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?success=true');
        });

        it('includes success=false parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ success: false });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?success=false');
        });

        it('combines multiple filters in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({
                page: 2,
                pageSize: 25,
                username: 'john',
                category: AuditEventCategory.Group,
                success: true,
            });

            expect(api.get).toHaveBeenCalledWith(
                '/api/admin/audit-logs?page=2&pageSize=25&username=john&category=2&success=true'
            );
        });

        it('handles category value of 0 correctly', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            await adminApi.getAuditLogs({ category: 0 });

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs?category=0');
        });
    });

    describe('getAuditLogById', () => {
        const mockLog: AuditLog = {
            id: 42,
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
        };

        it('calls API with correct endpoint', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLog);

            const result = await adminApi.getAuditLogById(42);

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs/42');
            expect(result).toEqual(mockLog);
        });
    });

    describe('getUserAuditTrail', () => {
        const mockLogs: AuditLog[] = [
            {
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
            },
        ];

        it('calls API with default limit of 100', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            const result = await adminApi.getUserAuditTrail(123);

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs/user/123?limit=100');
            expect(result).toEqual(mockLogs);
        });

        it('calls API with custom limit', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            const result = await adminApi.getUserAuditTrail(123, 50);

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs/user/123?limit=50');
            expect(result).toEqual(mockLogs);
        });
    });

    describe('getSecurityEvents', () => {
        const mockEvents: AuditLog[] = [
            {
                id: 1,
                userId: 123,
                username: 'testuser',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                category: AuditEventCategory.Security,
                eventType: 'Security.FailedLogin',
                action: 'Failed login attempt',
                timestamp: '2024-01-15T10:30:00Z',
                entityType: null,
                entityId: null,
                oldValues: null,
                newValues: null,
                additionalData: null,
                success: false,
                errorMessage: 'Invalid credentials',
            },
        ];

        it('calls API with no date filters when none provided', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockEvents);

            const result = await adminApi.getSecurityEvents();

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs/security');
            expect(result).toEqual(mockEvents);
        });

        it('includes dateFrom parameter when provided', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockEvents);

            await adminApi.getSecurityEvents('2024-01-01');

            expect(api.get).toHaveBeenCalledWith('/api/admin/audit-logs/security?dateFrom=2024-01-01');
        });

        it('includes both date parameters when provided', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockEvents);

            await adminApi.getSecurityEvents('2024-01-01', '2024-01-31');

            expect(api.get).toHaveBeenCalledWith(
                '/api/admin/audit-logs/security?dateFrom=2024-01-01&dateTo=2024-01-31'
            );
        });
    });

    describe('getSystemHealth', () => {
        const mockHealth: SystemHealth = {
            totalAuditLogs: 1000,
            errorsLast7Days: 5,
            totalUsers: 150,
            databaseSizeBytes: 52428800,
            serverStartTime: '2024-01-01T00:00:00Z',
        };

        it('calls API with correct endpoint', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockHealth);

            const result = await adminApi.getSystemHealth();

            expect(api.get).toHaveBeenCalledWith('/api/admin/system/health');
            expect(result).toEqual(mockHealth);
        });
    });

    describe('getDashboardStats', () => {
        const mockStats: DashboardStats = {
            auditLogsLast24Hours: 100,
            errorsLast7Days: 3,
            activeUsersLast7Days: 50,
            recentAuditLogs: [
                {
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
                },
            ],
        };

        it('calls API with correct endpoint', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockStats);

            const result = await adminApi.getDashboardStats();

            expect(api.get).toHaveBeenCalledWith('/api/admin/dashboard/stats');
            expect(result).toEqual(mockStats);
        });
    });

    describe('searchLogs', () => {
        const mockLogs = [
            '[2024-01-15 10:30:00.123 +00:00] [INF] [CorrelationId: 123-abc] Test log message',
            '[2024-01-15 10:31:00.456 +00:00] [ERR] [CorrelationId: 456-def] Error message',
        ];

        it('calls API with no filters when none provided', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            const result = await adminApi.searchLogs();

            expect(api.get).toHaveBeenCalledWith('/api/admin/logs/search');
            expect(result).toEqual(mockLogs);
        });

        it('includes correlationId parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({ correlationId: '123-abc' });

            expect(api.get).toHaveBeenCalledWith('/api/admin/logs/search?correlationId=123-abc');
        });

        it('includes level parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({ level: 'Error' });

            expect(api.get).toHaveBeenCalledWith('/api/admin/logs/search?level=Error');
        });

        it('includes date range parameters in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({
                dateFrom: '2024-01-01T00:00:00',
                dateTo: '2024-01-31T23:59:59',
            });

            // URLSearchParams encodes colons as %3A
            expect(api.get).toHaveBeenCalledWith(
                '/api/admin/logs/search?dateFrom=2024-01-01T00%3A00%3A00&dateTo=2024-01-31T23%3A59%3A59'
            );
        });

        it('includes message parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({ message: 'error' });

            expect(api.get).toHaveBeenCalledWith('/api/admin/logs/search?message=error');
        });

        it('includes limit parameter in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({ limit: 500 });

            expect(api.get).toHaveBeenCalledWith('/api/admin/logs/search?limit=500');
        });

        it('combines multiple filters in query string', async () => {
            (api.get as jest.Mock).mockResolvedValue(mockLogs);

            await adminApi.searchLogs({
                correlationId: '123-abc',
                level: 'Error',
                message: 'failed',
                limit: 200,
            });

            expect(api.get).toHaveBeenCalledWith(
                '/api/admin/logs/search?correlationId=123-abc&level=Error&message=failed&limit=200'
            );
        });
    });

    describe('Error handling', () => {
        it('propagates API errors from getAuditLogs', async () => {
            const error = new Error('Network error');
            (api.get as jest.Mock).mockRejectedValue(error);

            await expect(adminApi.getAuditLogs()).rejects.toThrow('Network error');
        });

        it('propagates API errors from getSystemHealth', async () => {
            const error = new Error('Server error');
            (api.get as jest.Mock).mockRejectedValue(error);

            await expect(adminApi.getSystemHealth()).rejects.toThrow('Server error');
        });

        it('propagates API errors from searchLogs', async () => {
            const error = new Error('Unauthorized');
            (api.get as jest.Mock).mockRejectedValue(error);

            await expect(adminApi.searchLogs()).rejects.toThrow('Unauthorized');
        });
    });
});
