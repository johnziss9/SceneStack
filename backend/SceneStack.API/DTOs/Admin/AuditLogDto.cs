using SceneStack.API.Models;

namespace SceneStack.API.DTOs.Admin;

public record AuditLogDto(
    long Id,
    int? UserId,
    string? Username,
    string IpAddress,
    string UserAgent,
    AuditEventCategory Category,
    string EventType,
    string Action,
    DateTime Timestamp,
    string? EntityType,
    string? EntityId,
    string? OldValues,
    string? NewValues,
    string? AdditionalData,
    bool Success,
    string? ErrorMessage
);

public record AuditLogListResponse(
    List<AuditLogDto> Logs,
    int TotalCount,
    int Page,
    int PageSize
);

public record SystemHealthDto(
    int TotalAuditLogs,
    int ErrorsLast7Days,
    int TotalUsers,
    long DatabaseSizeBytes,
    DateTime ServerStartTime
);

public record DashboardStatsDto(
    int AuditLogsLast24Hours,
    int ErrorsLast7Days,
    int ActiveUsersLast7Days,
    List<AuditLogDto> RecentAuditLogs
);
