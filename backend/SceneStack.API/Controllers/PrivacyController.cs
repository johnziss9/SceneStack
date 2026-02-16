using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;

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

    public PrivacyController(ApplicationDbContext context, ILogger<PrivacyController> logger)
    {
        _context = context;
        _logger = logger;
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

        // Update privacy settings
        if (request.ShareWatches.HasValue)
            user.ShareWatches = request.ShareWatches.Value;

        if (request.ShareRatings.HasValue)
            user.ShareRatings = request.ShareRatings.Value;

        if (request.ShareNotes.HasValue)
            user.ShareNotes = request.ShareNotes.Value;

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

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