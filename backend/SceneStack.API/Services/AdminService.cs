using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs.Admin;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminService> _logger;

    public AdminService(ApplicationDbContext context, ILogger<AdminService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AuditLogListResponse> GetAuditLogsAsync(
        int page = 1,
        int pageSize = 50,
        int? userId = null,
        string? username = null,
        AuditEventCategory? category = null,
        string? eventType = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        bool? success = null)
    {
        var query = _context.AuditLogs.AsQueryable();

        // Apply filters
        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (!string.IsNullOrEmpty(username))
        {
            // Get user IDs that match the username
            var userIds = _context.Users
                .Where(u => u.Username.Contains(username))
                .Select(u => u.Id)
                .ToList();

            if (userIds.Any())
            {
                query = query.Where(a => a.UserId.HasValue && userIds.Contains(a.UserId.Value));
            }
            else
            {
                // No matching users, so no results
                query = query.Where(a => false);
            }
        }

        if (category.HasValue)
        {
            query = query.Where(a => a.Category == category.Value);
        }

        if (!string.IsNullOrEmpty(eventType))
        {
            query = query.Where(a => a.EventType.Contains(eventType));
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(a => a.Timestamp >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(a => a.Timestamp <= dateTo.Value);
        }

        if (success.HasValue)
        {
            query = query.Where(a => a.Success == success.Value);
        }

        // Get total count
        var totalCount = await query.CountAsync();

        // Apply pagination and get results
        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.UserId.HasValue ? _context.Users.Where(u => u.Id == a.UserId.Value).Select(u => u.Username).FirstOrDefault() : null,
                a.IpAddress,
                a.UserAgent,
                a.Category,
                a.EventType,
                a.Action,
                a.Timestamp,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.AdditionalData,
                a.Success,
                a.ErrorMessage
            ))
            .ToListAsync();

        return new AuditLogListResponse(logs, totalCount, page, pageSize);
    }

    public async Task<AuditLogDto?> GetAuditLogByIdAsync(long id)
    {
        var auditLog = await _context.AuditLogs.FindAsync(id);

        if (auditLog == null)
        {
            return null;
        }

        string? username = null;
        if (auditLog.UserId.HasValue)
        {
            username = await _context.Users
                .Where(u => u.Id == auditLog.UserId.Value)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();
        }

        return new AuditLogDto(
            auditLog.Id,
            auditLog.UserId,
            username,
            auditLog.IpAddress,
            auditLog.UserAgent,
            auditLog.Category,
            auditLog.EventType,
            auditLog.Action,
            auditLog.Timestamp,
            auditLog.EntityType,
            auditLog.EntityId,
            auditLog.OldValues,
            auditLog.NewValues,
            auditLog.AdditionalData,
            auditLog.Success,
            auditLog.ErrorMessage
        );
    }

    public async Task<List<AuditLogDto>> GetUserAuditTrailAsync(int userId, int limit = 100)
    {
        var logs = await _context.AuditLogs
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                _context.Users.Where(u => u.Id == userId).Select(u => u.Username).FirstOrDefault(),
                a.IpAddress,
                a.UserAgent,
                a.Category,
                a.EventType,
                a.Action,
                a.Timestamp,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.AdditionalData,
                a.Success,
                a.ErrorMessage
            ))
            .ToListAsync();

        return logs;
    }

    public async Task<List<AuditLogDto>> GetSecurityEventsAsync(DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var query = _context.AuditLogs
            .Where(a => a.Category == AuditEventCategory.Security ||
                       a.Category == AuditEventCategory.Authentication ||
                       !a.Success);

        if (dateFrom.HasValue)
        {
            query = query.Where(a => a.Timestamp >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(a => a.Timestamp <= dateTo.Value);
        }

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Take(100)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.UserId.HasValue ? _context.Users.Where(u => u.Id == a.UserId.Value).Select(u => u.Username).FirstOrDefault() : null,
                a.IpAddress,
                a.UserAgent,
                a.Category,
                a.EventType,
                a.Action,
                a.Timestamp,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.AdditionalData,
                a.Success,
                a.ErrorMessage
            ))
            .ToListAsync();

        return logs;
    }

    public async Task<SystemHealthDto> GetSystemHealthAsync()
    {
        var totalAuditLogs = await _context.AuditLogs.CountAsync();

        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var errorsLast7Days = await _context.AuditLogs
            .Where(a => !a.Success && a.Timestamp >= weekAgo)
            .CountAsync();

        var totalUsers = await _context.Users.CountAsync();

        // Get database size (PostgreSQL specific)
        var databaseSize = 0L;
        try
        {
            using var command = _context.Database.GetDbConnection().CreateCommand();
            command.CommandText = "SELECT pg_database_size(current_database())";
            await _context.Database.OpenConnectionAsync();
            var result = await command.ExecuteScalarAsync();
            if (result != null && result != DBNull.Value)
            {
                databaseSize = Convert.ToInt64(result);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get database size");
        }
        finally
        {
            if (_context.Database.IsRelational())
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        // Use application start time (tracked in static variable)
        var serverStartTime = Program.ApplicationStartTime;

        return new SystemHealthDto(
            totalAuditLogs,
            errorsLast7Days,
            totalUsers,
            databaseSize,
            serverStartTime
        );
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var yesterday = DateTime.UtcNow.AddDays(-1);
        var weekAgo = DateTime.UtcNow.AddDays(-7);

        var auditLogsLast24Hours = await _context.AuditLogs
            .Where(a => a.Timestamp >= yesterday)
            .CountAsync();

        var errorsLast7Days = await _context.AuditLogs
            .Where(a => !a.Success && a.Timestamp >= weekAgo)
            .CountAsync();

        var activeUsersLast7Days = await _context.AuditLogs
            .Where(a => a.Timestamp >= weekAgo && a.UserId.HasValue)
            .Select(a => a.UserId!.Value)
            .Distinct()
            .CountAsync();

        var recentAuditLogs = await _context.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.UserId.HasValue ? _context.Users.Where(u => u.Id == a.UserId.Value).Select(u => u.Username).FirstOrDefault() : null,
                a.IpAddress,
                a.UserAgent,
                a.Category,
                a.EventType,
                a.Action,
                a.Timestamp,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.AdditionalData,
                a.Success,
                a.ErrorMessage
            ))
            .ToListAsync();

        return new DashboardStatsDto(
            auditLogsLast24Hours,
            errorsLast7Days,
            activeUsersLast7Days,
            recentAuditLogs
        );
    }

    public async Task<List<string>> SearchLogsAsync(
        string? correlationId = null,
        string? level = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? message = null,
        int limit = 100)
    {
        // This searches Serilog log files on disk
        var logDirectory = "logs";
        var logFiles = new List<string>();

        if (!Directory.Exists(logDirectory))
        {
            _logger.LogWarning("Log directory not found: {LogDirectory}", logDirectory);
            return new List<string>();
        }

        // Determine which log files to search based on date range
        var filesToSearch = new List<string>();

        if (dateFrom.HasValue || dateTo.HasValue)
        {
            var startDate = dateFrom ?? DateTime.UtcNow.AddDays(-7);
            var endDate = dateTo ?? DateTime.UtcNow;

            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                var fileName = $"scenestack-{date:yyyyMMdd}.log";
                var filePath = Path.Combine(logDirectory, fileName);
                if (File.Exists(filePath))
                {
                    filesToSearch.Add(filePath);
                }
            }
        }
        else
        {
            // Search today's log file by default
            var todayLogFile = Path.Combine(logDirectory, $"scenestack-{DateTime.UtcNow:yyyyMMdd}.log");
            if (File.Exists(todayLogFile))
            {
                filesToSearch.Add(todayLogFile);
            }
        }

        var matchingLines = new List<string>();

        // Process files in reverse order (newest first)
        foreach (var file in filesToSearch.OrderByDescending(f => f))
        {
            try
            {
                var lines = await File.ReadAllLinesAsync(file);

                // Process lines in reverse order (newest first)
                for (int i = lines.Length - 1; i >= 0; i--)
                {
                    var line = lines[i];
                    var matches = true;

                    if (!string.IsNullOrEmpty(correlationId) && !line.Contains(correlationId, StringComparison.OrdinalIgnoreCase))
                    {
                        matches = false;
                    }

                    if (!string.IsNullOrEmpty(level) && !line.Contains($"[{level}]", StringComparison.OrdinalIgnoreCase))
                    {
                        matches = false;
                    }

                    if (!string.IsNullOrEmpty(message) && !line.Contains(message, StringComparison.OrdinalIgnoreCase))
                    {
                        matches = false;
                    }

                    if (matches)
                    {
                        matchingLines.Add(line);

                        if (matchingLines.Count >= limit)
                        {
                            return matchingLines;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read log file: {FilePath}", file);
            }
        }

        return matchingLines;
    }
}
