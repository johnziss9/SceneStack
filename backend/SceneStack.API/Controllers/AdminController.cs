using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs.Admin;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Controllers;

[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
[ApiController]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IAdminService adminService, ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated audit logs with optional filters
    /// </summary>
    [HttpGet("audit-logs")]
    public async Task<ActionResult<AuditLogListResponse>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] int? userId = null,
        [FromQuery] string? username = null,
        [FromQuery] AuditEventCategory? category = null,
        [FromQuery] string? eventType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] bool? success = null)
    {
        try
        {
            var result = await _adminService.GetAuditLogsAsync(
                page,
                pageSize,
                userId,
                username,
                category,
                eventType,
                dateFrom,
                dateTo,
                success);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get audit logs");
            return StatusCode(500, "An error occurred while retrieving audit logs");
        }
    }

    /// <summary>
    /// Get a single audit log by ID
    /// </summary>
    [HttpGet("audit-logs/{id}")]
    public async Task<ActionResult<AuditLogDto>> GetAuditLogById(long id)
    {
        try
        {
            var auditLog = await _adminService.GetAuditLogByIdAsync(id);

            if (auditLog == null)
            {
                return NotFound();
            }

            return Ok(auditLog);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get audit log {AuditLogId}", id);
            return StatusCode(500, "An error occurred while retrieving the audit log");
        }
    }

    /// <summary>
    /// Get audit trail for a specific user
    /// </summary>
    [HttpGet("audit-logs/user/{userId}")]
    public async Task<ActionResult<List<AuditLogDto>>> GetUserAuditTrail(int userId, [FromQuery] int limit = 100)
    {
        try
        {
            var logs = await _adminService.GetUserAuditTrailAsync(userId, limit);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get audit trail for user {UserId}", userId);
            return StatusCode(500, "An error occurred while retrieving user audit trail");
        }
    }

    /// <summary>
    /// Get security-related audit events
    /// </summary>
    [HttpGet("audit-logs/security")]
    public async Task<ActionResult<List<AuditLogDto>>> GetSecurityEvents(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        try
        {
            var logs = await _adminService.GetSecurityEventsAsync(dateFrom, dateTo);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get security events");
            return StatusCode(500, "An error occurred while retrieving security events");
        }
    }

    /// <summary>
    /// Get system health metrics
    /// </summary>
    [HttpGet("system/health")]
    public async Task<ActionResult<SystemHealthDto>> GetSystemHealth()
    {
        try
        {
            var health = await _adminService.GetSystemHealthAsync();
            return Ok(health);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get system health");
            return StatusCode(500, "An error occurred while retrieving system health");
        }
    }

    /// <summary>
    /// Get dashboard statistics
    /// </summary>
    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
    {
        try
        {
            var stats = await _adminService.GetDashboardStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get dashboard stats");
            return StatusCode(500, "An error occurred while retrieving dashboard stats");
        }
    }

    /// <summary>
    /// Search application logs
    /// </summary>
    [HttpGet("logs/search")]
    public async Task<ActionResult<List<string>>> SearchLogs(
        [FromQuery] string? correlationId = null,
        [FromQuery] string? level = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? message = null,
        [FromQuery] int limit = 100)
    {
        try
        {
            var logs = await _adminService.SearchLogsAsync(
                correlationId,
                level,
                dateFrom,
                dateTo,
                message,
                limit);

            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search logs");
            return StatusCode(500, "An error occurred while searching logs");
        }
    }
}
