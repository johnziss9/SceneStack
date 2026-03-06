using SceneStack.API.Models;

namespace SceneStack.API.DTOs;

/// <summary>
/// DTO for creating audit log entries
/// </summary>
public class AuditLogEntry
{
    public int? UserId { get; set; }
    public AuditEventCategory Category { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public bool Success { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public object? OldValues { get; set; }
    public object? NewValues { get; set; }
    public Dictionary<string, object>? AdditionalData { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
