using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Controllers;

/// <summary>
/// Controller for managing user privacy settings
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PrivacyController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PrivacyController> _logger;
    private readonly IAuditService _auditService;

    public PrivacyController(ApplicationDbContext context, ILogger<PrivacyController> logger, IAuditService auditService)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
    }

    /// <summary>
    /// Get current user's privacy settings
    /// </summary>
    /// <returns>Privacy settings</returns>
    // GET: api/privacy
    [HttpGet]
    public async Task<ActionResult<UserPrivacySettingsResponse>> GetPrivacySettings()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting privacy settings for user {UserId}", userId);

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            _logger.LogWarning("User {UserId} not found", userId);
            return NotFound();
        }

        var response = new UserPrivacySettingsResponse
        {
            ShareWatches = user.ShareWatches,
            ShareRatings = user.ShareRatings,
            ShareNotes = user.ShareNotes
        };

        return Ok(response);
    }

    /// <summary>
    /// Update current user's privacy settings
    /// </summary>
    /// <param name="request">Updated privacy settings</param>
    /// <returns>Updated privacy settings</returns>
    // PUT: api/privacy
    [HttpPut]
    public async Task<ActionResult<UserPrivacySettingsResponse>> UpdatePrivacySettings(UpdatePrivacySettingsRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Updating privacy settings for user {UserId}", userId);

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            _logger.LogWarning("User {UserId} not found", userId);
            return NotFound();
        }

        // Capture before state
        var oldValues = new
        {
            ShareWatches = user.ShareWatches,
            ShareRatings = user.ShareRatings,
            ShareNotes = user.ShareNotes
        };

        var changes = new Dictionary<string, object>();

        // Update privacy settings
        if (request.ShareWatches.HasValue && user.ShareWatches != request.ShareWatches.Value)
        {
            changes["ShareWatches"] = new { Old = user.ShareWatches, New = request.ShareWatches.Value };
            user.ShareWatches = request.ShareWatches.Value;
        }

        if (request.ShareRatings.HasValue && user.ShareRatings != request.ShareRatings.Value)
        {
            changes["ShareRatings"] = new { Old = user.ShareRatings, New = request.ShareRatings.Value };
            user.ShareRatings = request.ShareRatings.Value;
        }

        if (request.ShareNotes.HasValue && user.ShareNotes != request.ShareNotes.Value)
        {
            changes["ShareNotes"] = new { Old = user.ShareNotes, New = request.ShareNotes.Value };
            user.ShareNotes = request.ShareNotes.Value;
        }

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Audit log: Privacy settings updated (only if changes were made)
        if (changes.Any())
        {
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = userId,
                Category = AuditEventCategory.Privacy,
                EventType = AuditEvents.PrivacySettingsUpdated,
                Action = "Update",
                Success = true,
                EntityType = "User",
                EntityId = userId.ToString(),
                OldValues = oldValues,
                NewValues = new
                {
                    ShareWatches = user.ShareWatches,
                    ShareRatings = user.ShareRatings,
                    ShareNotes = user.ShareNotes
                },
                AdditionalData = new Dictionary<string, object>
                {
                    { "ChangedSettings", changes.Keys.ToList() },
                    { "SettingChanges", changes }
                }
            });
        }

        _logger.LogInformation("Successfully updated privacy settings for user {UserId}", userId);

        var response = new UserPrivacySettingsResponse
        {
            ShareWatches = user.ShareWatches,
            ShareRatings = user.ShareRatings,
            ShareNotes = user.ShareNotes
        };

        return Ok(response);
    }
}