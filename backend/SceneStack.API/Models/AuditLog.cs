namespace SceneStack.API.Models;

/// <summary>
/// Comprehensive audit log for tracking all user activities and system events
/// </summary>
public class AuditLog
{
    /// <summary>
    /// Primary key (bigint for large-scale retention)
    /// </summary>
    public long Id { get; set; }

    // ========== WHO ==========

    /// <summary>
    /// User who performed the action (nullable for anonymous events like failed logins)
    /// </summary>
    public int? UserId { get; set; }

    /// <summary>
    /// IP address of the request (IPv4 or IPv6)
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent string (browser/device information)
    /// </summary>
    public string? UserAgent { get; set; }

    // ========== WHAT ==========

    /// <summary>
    /// High-level category of the event
    /// </summary>
    public AuditEventCategory Category { get; set; }

    /// <summary>
    /// Specific event type (e.g., "Login.Success", "Group.Created")
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>
    /// Action performed (Create, Read, Update, Delete, Execute, etc.)
    /// </summary>
    public string Action { get; set; } = string.Empty;

    // ========== WHEN ==========

    /// <summary>
    /// When the event occurred (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // ========== WHERE (Entity) ==========

    /// <summary>
    /// Type of entity affected (e.g., "Group", "Watch", "User")
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// ID of the affected entity (stored as string for flexibility)
    /// </summary>
    public string? EntityId { get; set; }

    // ========== DETAILS ==========

    /// <summary>
    /// JSON representation of entity state before the action
    /// </summary>
    public string? OldValues { get; set; }

    /// <summary>
    /// JSON representation of entity state after the action
    /// </summary>
    public string? NewValues { get; set; }

    /// <summary>
    /// Additional context data (JSON)
    /// </summary>
    public string? AdditionalData { get; set; }

    // ========== RESULT ==========

    /// <summary>
    /// Whether the action was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Error message if the action failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    // ========== NAVIGATION PROPERTIES ==========

    /// <summary>
    /// User who performed the action
    /// </summary>
    public User? User { get; set; }
}
