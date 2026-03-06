export enum AuditEventCategory {
    Authentication = 0,
    Account = 1,
    Group = 2,
    Watch = 3,
    Watchlist = 4,
    AI = 5,
    Privacy = 6,
    Security = 7,
    System = 8,
}

export interface AuditLog {
    id: number;
    userId: number | null;
    username: string | null;
    ipAddress: string;
    userAgent: string;
    category: AuditEventCategory;
    eventType: string;
    action: string;
    timestamp: string;
    entityType: string | null;
    entityId: string | null;
    oldValues: string | null;
    newValues: string | null;
    additionalData: string | null;
    success: boolean;
    errorMessage: string | null;
}

export interface AuditLogListResponse {
    logs: AuditLog[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface SystemHealth {
    totalAuditLogs: number;
    errorsLast7Days: number;
    totalUsers: number;
    databaseSizeBytes: number;
    serverStartTime: string;
}

export interface DashboardStats {
    auditLogsLast24Hours: number;
    errorsLast7Days: number;
    activeUsersLast7Days: number;
    recentAuditLogs: AuditLog[];
}

export interface AuditLogFilters {
    page?: number;
    pageSize?: number;
    userId?: number;
    username?: string;
    category?: AuditEventCategory;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
    success?: boolean;
}

export interface LogSearchFilters {
    correlationId?: string;
    level?: string;
    dateFrom?: string;
    dateTo?: string;
    message?: string;
    limit?: number;
}
