using SceneStack.API.DTOs.Admin;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IAdminService
{
    Task<AuditLogListResponse> GetAuditLogsAsync(
        int page = 1,
        int pageSize = 50,
        int? userId = null,
        string? username = null,
        AuditEventCategory? category = null,
        string? eventType = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        bool? success = null);

    Task<AuditLogDto?> GetAuditLogByIdAsync(long id);

    Task<List<AuditLogDto>> GetUserAuditTrailAsync(int userId, int limit = 100);

    Task<List<AuditLogDto>> GetSecurityEventsAsync(DateTime? dateFrom = null, DateTime? dateTo = null);

    Task<SystemHealthDto> GetSystemHealthAsync();

    Task<DashboardStatsDto> GetDashboardStatsAsync();

    Task<List<string>> SearchLogsAsync(
        string? correlationId = null,
        string? level = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? message = null,
        int limit = 100);
}
