using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

/// <summary>
/// Service for logging audit events
/// </summary>
public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(
        ApplicationDbContext context,
        ILogger<AuditService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Log an audit event
    /// </summary>
    public async Task LogAsync(AuditLogEntry entry)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;

            var auditLog = new AuditLog
            {
                UserId = entry.UserId,
                Category = entry.Category,
                EventType = entry.EventType,
                Action = entry.Action,
                Success = entry.Success,
                ErrorMessage = entry.ErrorMessage,
                EntityType = entry.EntityType,
                EntityId = entry.EntityId,
                OldValues = entry.OldValues != null ? JsonSerializer.Serialize(entry.OldValues) : null,
                NewValues = entry.NewValues != null ? JsonSerializer.Serialize(entry.NewValues) : null,
                AdditionalData = entry.AdditionalData != null ? JsonSerializer.Serialize(entry.AdditionalData) : null,
                IpAddress = entry.IpAddress ?? httpContext?.Connection.RemoteIpAddress?.ToString(),
                UserAgent = entry.UserAgent ?? httpContext?.Request.Headers.UserAgent.ToString(),
                Timestamp = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // CRITICAL: Audit logging failures should NEVER break the application
            _logger.LogError(ex, "Failed to write audit log for event {EventType}", entry.EventType);
        }
    }

    /// <summary>
    /// Log an authentication event
    /// </summary>
    public async Task LogAuthenticationAsync(
        int? userId,
        string eventType,
        bool success,
        string? errorMessage = null,
        Dictionary<string, object>? additionalData = null)
    {
        await LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = AuditEventCategory.Authentication,
            EventType = eventType,
            Action = "Authenticate",
            Success = success,
            ErrorMessage = errorMessage,
            AdditionalData = additionalData
        });
    }

    /// <summary>
    /// Log an entity change with before/after values
    /// </summary>
    public async Task LogEntityChangeAsync<T>(
        int userId,
        string eventType,
        string action,
        T? oldEntity,
        T? newEntity,
        Dictionary<string, object>? additionalData = null)
        where T : class
    {
        var entityType = typeof(T).Name;
        string? entityId = null;

        // Extract ID if entity has one
        var idProp = typeof(T).GetProperty("Id");
        if (newEntity != null && idProp != null)
        {
            entityId = idProp.GetValue(newEntity)?.ToString();
        }
        else if (oldEntity != null && idProp != null)
        {
            entityId = idProp.GetValue(oldEntity)?.ToString();
        }

        await LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = GetCategoryForEntityType(entityType),
            EventType = eventType,
            Action = action,
            Success = true,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldEntity,
            NewValues = newEntity,
            AdditionalData = additionalData
        });
    }

    /// <summary>
    /// Log a simple event
    /// </summary>
    public async Task LogSimpleEventAsync(
        int userId,
        AuditEventCategory category,
        string eventType,
        bool success = true,
        string? errorMessage = null)
    {
        await LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = category,
            EventType = eventType,
            Action = "Execute",
            Success = success,
            ErrorMessage = errorMessage
        });
    }

    /// <summary>
    /// Get audit trail for a user
    /// </summary>
    public async Task<IEnumerable<AuditLog>> GetUserAuditTrailAsync(
        int userId,
        DateTime? from = null,
        DateTime? to = null)
    {
        var query = _context.AuditLogs.Where(a => a.UserId == userId);

        if (from.HasValue)
            query = query.Where(a => a.Timestamp >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.Timestamp <= to.Value);

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(1000)  // Limit for performance
            .ToListAsync();
    }

    /// <summary>
    /// Get security events
    /// </summary>
    public async Task<IEnumerable<AuditLog>> GetSecurityEventsAsync(
        DateTime? from = null,
        int limit = 100)
    {
        var query = _context.AuditLogs.Where(a =>
            a.Category == AuditEventCategory.Security ||
            (a.Category == AuditEventCategory.Authentication && !a.Success));

        if (from.HasValue)
            query = query.Where(a => a.Timestamp >= from.Value);

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }

    /// <summary>
    /// Get failed login attempts
    /// </summary>
    public async Task<IEnumerable<AuditLog>> GetFailedLoginsAsync(
        string? ipAddress = null,
        int limit = 100)
    {
        var query = _context.AuditLogs.Where(a =>
            a.Category == AuditEventCategory.Authentication &&
            a.EventType.Contains("Login.Failed"));

        if (!string.IsNullOrEmpty(ipAddress))
            query = query.Where(a => a.IpAddress == ipAddress);

        return await query
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();
    }

    /// <summary>
    /// Map entity type to audit category
    /// </summary>
    private AuditEventCategory GetCategoryForEntityType(string entityType)
    {
        return entityType switch
        {
            "User" => AuditEventCategory.Account,
            "Group" => AuditEventCategory.Group,
            "GroupMember" => AuditEventCategory.Group,
            "Watch" => AuditEventCategory.Watch,
            "WatchlistItem" => AuditEventCategory.Watchlist,
            "AiInsight" => AuditEventCategory.AI,
            _ => AuditEventCategory.System
        };
    }
}
