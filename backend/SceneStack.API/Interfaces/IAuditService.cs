using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

/// <summary>
/// Service for logging audit events to track all user activities and system events
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Log an audit event
    /// </summary>
    Task LogAsync(AuditLogEntry entry);

    /// <summary>
    /// Log an authentication event (login, logout, registration)
    /// </summary>
    Task LogAuthenticationAsync(
        int? userId,
        string eventType,
        bool success,
        string? errorMessage = null,
        Dictionary<string, object>? additionalData = null);

    /// <summary>
    /// Log an entity change with before/after values
    /// </summary>
    Task LogEntityChangeAsync<T>(
        int userId,
        string eventType,
        string action,
        T? oldEntity,
        T? newEntity,
        Dictionary<string, object>? additionalData = null)
        where T : class;

    /// <summary>
    /// Log a simple event without entity details
    /// </summary>
    Task LogSimpleEventAsync(
        int userId,
        AuditEventCategory category,
        string eventType,
        bool success = true,
        string? errorMessage = null);

    // Query methods (for future admin dashboard)

    /// <summary>
    /// Get audit trail for a specific user
    /// </summary>
    Task<IEnumerable<AuditLog>> GetUserAuditTrailAsync(
        int userId,
        DateTime? from = null,
        DateTime? to = null);

    /// <summary>
    /// Get security events (unauthorized access, failed logins, etc.)
    /// </summary>
    Task<IEnumerable<AuditLog>> GetSecurityEventsAsync(
        DateTime? from = null,
        int limit = 100);

    /// <summary>
    /// Get failed login attempts (for security monitoring)
    /// </summary>
    Task<IEnumerable<AuditLog>> GetFailedLoginsAsync(
        string? ipAddress = null,
        int limit = 100);
}
