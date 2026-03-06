namespace SceneStack.API.Models;

/// <summary>
/// Categorizes audit events for filtering and organization
/// </summary>
public enum AuditEventCategory
{
    /// <summary>
    /// Authentication events: login, logout, registration
    /// </summary>
    Authentication = 0,

    /// <summary>
    /// Account management: profile updates, password changes, deletion
    /// </summary>
    Account = 1,

    /// <summary>
    /// Group operations: CRUD, membership, transfers
    /// </summary>
    Group = 2,

    /// <summary>
    /// Watch operations: CRUD, sharing
    /// </summary>
    Watch = 3,

    /// <summary>
    /// Watchlist operations
    /// </summary>
    Watchlist = 4,

    /// <summary>
    /// AI operations: insights, searches
    /// </summary>
    AI = 5,

    /// <summary>
    /// Privacy setting changes
    /// </summary>
    Privacy = 6,

    /// <summary>
    /// Security events: unauthorized access, rate limits
    /// </summary>
    Security = 7,

    /// <summary>
    /// System events: background jobs, system operations
    /// </summary>
    System = 8
}
