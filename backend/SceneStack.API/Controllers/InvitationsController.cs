using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;

namespace SceneStack.API.Controllers;

/// <summary>
/// Controller for managing group invitations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(
        IInvitationService invitationService,
        ILogger<InvitationsController> logger)
    {
        _invitationService = invitationService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new group invitation
    /// </summary>
    /// <param name="request">Invitation details</param>
    /// <returns>Created invitation</returns>
    /// POST: api/invitations
    [HttpPost]
    public async Task<ActionResult<InvitationResponse>> CreateInvitation(CreateInvitationRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} creating invitation for group {GroupId}", userId, request.GroupId);

        try
        {
            var invitation = await _invitationService.CreateInvitationAsync(userId, request);
            _logger.LogInformation("Invitation {InvitationId} created successfully", invitation.Id);
            return Ok(invitation);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized invitation attempt by user {UserId}", userId);
            return Unauthorized(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid invitation request by user {UserId}", userId);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invitation for user {UserId}", userId);
            return StatusCode(500, "An error occurred while creating the invitation");
        }
    }

    /// <summary>
    /// Get current user's pending invitations
    /// </summary>
    /// <returns>List of pending invitations</returns>
    /// GET: api/invitations/pending
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<InvitationResponse>>> GetPendingInvitations()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} fetching pending invitations", userId);

        try
        {
            var invitations = await _invitationService.GetUserPendingInvitationsAsync(userId);
            return Ok(invitations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending invitations for user {UserId}", userId);
            return StatusCode(500, "An error occurred while fetching invitations");
        }
    }

    /// <summary>
    /// Get count of pending invitations (for badge)
    /// </summary>
    /// <returns>Count of pending invitations</returns>
    /// GET: api/invitations/pending/count
    [HttpGet("pending/count")]
    public async Task<ActionResult<PendingInvitationsCountResponse>> GetPendingCount()
    {
        var userId = User.GetUserId();

        try
        {
            var count = await _invitationService.GetPendingInvitationsCountAsync(userId);
            return Ok(new PendingInvitationsCountResponse { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending invitations count for user {UserId}", userId);
            return StatusCode(500, "An error occurred while fetching invitation count");
        }
    }

    /// <summary>
    /// Respond to an invitation (accept/decline)
    /// </summary>
    /// <param name="id">Invitation ID</param>
    /// <param name="request">Response details</param>
    /// <returns>Updated invitation</returns>
    /// PUT: api/invitations/{id}/respond
    [HttpPut("{id}/respond")]
    public async Task<ActionResult<InvitationResponse>> RespondToInvitation(int id, RespondToInvitationRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} responding to invitation {InvitationId}", userId, id);

        try
        {
            var invitation = await _invitationService.RespondToInvitationAsync(id, userId, request);

            if (invitation == null)
            {
                _logger.LogWarning("Invitation {InvitationId} not found for user {UserId}", id, userId);
                return NotFound("Invitation not found");
            }

            _logger.LogInformation("Invitation {InvitationId} responded to successfully", id);
            return Ok(invitation);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized response attempt by user {UserId} for invitation {InvitationId}", userId, id);
            return Unauthorized(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid response to invitation {InvitationId} by user {UserId}", id, userId);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error responding to invitation {InvitationId} by user {UserId}", id, userId);
            return StatusCode(500, "An error occurred while responding to the invitation");
        }
    }

    /// <summary>
    /// Cancel an invitation (inviter only)
    /// </summary>
    /// <param name="id">Invitation ID</param>
    /// <returns>No content</returns>
    /// DELETE: api/invitations/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelInvitation(int id)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} cancelling invitation {InvitationId}", userId, id);

        try
        {
            var result = await _invitationService.CancelInvitationAsync(id, userId);

            if (!result)
            {
                _logger.LogWarning("Failed to cancel invitation {InvitationId} - not found or already processed", id);
                return NotFound("Invitation not found or already processed");
            }

            _logger.LogInformation("Invitation {InvitationId} cancelled successfully", id);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized cancel attempt by user {UserId} for invitation {InvitationId}", userId, id);
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling invitation {InvitationId} by user {UserId}", id, userId);
            return StatusCode(500, "An error occurred while cancelling the invitation");
        }
    }

    /// <summary>
    /// Get invitations sent for a group
    /// </summary>
    /// <param name="groupId">Group ID</param>
    /// <returns>List of sent invitations</returns>
    /// GET: api/invitations/group/{groupId}/sent
    [HttpGet("group/{groupId}/sent")]
    public async Task<ActionResult<IEnumerable<InvitationResponse>>> GetSentInvitations(int groupId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} fetching sent invitations for group {GroupId}", userId, groupId);

        try
        {
            var invitations = await _invitationService.GetSentInvitationsAsync(groupId, userId);
            return Ok(invitations);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access to sent invitations for group {GroupId} by user {UserId}", groupId, userId);
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sent invitations for group {GroupId} by user {UserId}", groupId, userId);
            return StatusCode(500, "An error occurred while fetching invitations");
        }
    }

    /// <summary>
    /// Search users for invitation
    /// </summary>
    /// <param name="query">Search query (username or email)</param>
    /// <param name="excludeGroupId">Optional group ID to exclude members from</param>
    /// <returns>List of user search results</returns>
    /// GET: api/invitations/search?query={query}&excludeGroupId={groupId}
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<UserSearchResult>>> SearchUsers([FromQuery] string query, [FromQuery] int? excludeGroupId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} searching users with query '{Query}'", userId, query);

        try
        {
            var request = new UserSearchRequest
            {
                Query = query,
                ExcludeGroupId = excludeGroupId
            };

            var results = await _invitationService.SearchUsersAsync(request, userId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching users with query '{Query}' by user {UserId}", query, userId);
            return StatusCode(500, "An error occurred while searching users");
        }
    }
}
