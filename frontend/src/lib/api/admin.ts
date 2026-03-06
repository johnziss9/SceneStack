import { api } from '../api-client';
import type {
    AuditLog,
    AuditLogListResponse,
    SystemHealth,
    DashboardStats,
    AuditLogFilters,
    LogSearchFilters,
} from '@/types/admin';

export const adminApi = {
    // Audit Logs
    getAuditLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogListResponse> => {
        const params = new URLSearchParams();

        if (filters.page) params.append('page', filters.page.toString());
        if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
        if (filters.userId) params.append('userId', filters.userId.toString());
        if (filters.username) params.append('username', filters.username);
        if (filters.category !== undefined) params.append('category', filters.category.toString());
        if (filters.eventType) params.append('eventType', filters.eventType);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.success !== undefined) params.append('success', filters.success.toString());

        const queryString = params.toString();
        return api.get<AuditLogListResponse>(
            `/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`
        );
    },

    getAuditLogById: async (id: number): Promise<AuditLog> => {
        return api.get<AuditLog>(`/api/admin/audit-logs/${id}`);
    },

    getUserAuditTrail: async (userId: number, limit: number = 100): Promise<AuditLog[]> => {
        return api.get<AuditLog[]>(`/api/admin/audit-logs/user/${userId}?limit=${limit}`);
    },

    getSecurityEvents: async (dateFrom?: string, dateTo?: string): Promise<AuditLog[]> => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        const queryString = params.toString();
        return api.get<AuditLog[]>(
            `/api/admin/audit-logs/security${queryString ? `?${queryString}` : ''}`
        );
    },

    // System Health
    getSystemHealth: async (): Promise<SystemHealth> => {
        return api.get<SystemHealth>('/api/admin/system/health');
    },

    // Dashboard Stats
    getDashboardStats: async (): Promise<DashboardStats> => {
        return api.get<DashboardStats>('/api/admin/dashboard/stats');
    },

    // Application Logs
    searchLogs: async (filters: LogSearchFilters = {}): Promise<string[]> => {
        const params = new URLSearchParams();

        if (filters.correlationId) params.append('correlationId', filters.correlationId);
        if (filters.level) params.append('level', filters.level);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.message) params.append('message', filters.message);
        if (filters.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        return api.get<string[]>(
            `/api/admin/logs/search${queryString ? `?${queryString}` : ''}`
        );
    },
};
