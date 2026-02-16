using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;

namespace SceneStack.API.Controllers;

/// <summary>
/// Controller for managing groups and group memberships
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;
    private readonly IGroupFeedService _groupFeedService;
    private readonly IGroupRecommendationsService _groupRecommendationsService;
    private readonly ILogger<GroupsController> _logger;

    public GroupsController(
        IGroupService groupService,
        IGroupFeedService groupFeedService,
        IGroupRecommendationsService groupRecommendationsService,
        ILogger<GroupsController> logger)
    {
        _groupService = groupService;
        _groupFeedService = groupFeedService;
        _groupRecommendationsService = groupRecommendationsService;
        _logger = logger;
    }

    /// <summary>
    /// Get all groups the current user is a member of
    /// </summary>
    /// <returns>List of groups</returns>
    // GET: api/groups
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroupResponse>>> GetUserGroups()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting groups for user {UserId}", userId);

        var groups = await _groupService.GetUserGroupsAsync(userId);
        return Ok(groups);
    }

    /// <summary>
    /// Get a specific group by ID
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <returns>Group details</returns>
    // GET: api/groups/5
    [HttpGet("{id}")]
    public async Task<ActionResult<GroupResponse>> GetGroup(int id)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting group {GroupId}", userId, id);

        var group = await _groupService.GetByIdAsync(id, userId);

        if (group == null)
        {
            _logger.LogWarning("Group {GroupId} not found or user {UserId} not authorized", id, userId);
            return NotFound();
        }

        // Map to response
        var response = new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            CreatedById = group.CreatedById,
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            CreatedBy = new UserBasicInfo
            {
                Id = group.CreatedBy.Id,
                Username = group.CreatedBy.Username,
                Email = group.CreatedBy.Email
            },
            Members = group.Members.Select(m => new GroupMemberResponse
            {
                UserId = m.UserId,
                GroupId = m.GroupId,
                Role = (int)m.Role,
                RoleName = m.Role.ToString(),
                JoinedAt = m.JoinedAt,
                User = new UserBasicInfo
                {
                    Id = m.User.Id,
                    Username = m.User.Username,
                    Email = m.User.Email
                }
            }).ToList(),
            MemberCount = group.Members.Count
        };

        return Ok(response);
    }

    /// <summary>
    /// Create a new group
    /// </summary>
    /// <param name="request">Group creation details</param>
    /// <returns>Created group</returns>
    // POST: api/groups
    [HttpPost]
    public async Task<ActionResult<GroupResponse>> CreateGroup(CreateGroupRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} creating group '{GroupName}'", userId, request.Name);

        try
        {
            var group = await _groupService.CreateAsync(userId, request);

            // Map to response
            var response = new GroupResponse
            {
                Id = group.Id,
                Name = group.Name,
                Description = group.Description,
                CreatedById = group.CreatedById,
                CreatedAt = group.CreatedAt,
                UpdatedAt = group.UpdatedAt,
                CreatedBy = new UserBasicInfo
                {
                    Id = group.CreatedBy.Id,
                    Username = group.CreatedBy.Username,
                    Email = group.CreatedBy.Email
                },
                Members = group.Members.Select(m => new GroupMemberResponse
                {
                    UserId = m.UserId,
                    GroupId = m.GroupId,
                    Role = (int)m.Role,
                    RoleName = m.Role.ToString(),
                    JoinedAt = m.JoinedAt,
                    User = new UserBasicInfo
                    {
                        Id = m.User.Id,
                        Username = m.User.Username,
                        Email = m.User.Email
                    }
                }).ToList(),
                MemberCount = group.Members.Count
            };

            _logger.LogInformation("Successfully created group {GroupId}", group.Id);
            return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to create group: {Message}", userId, ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating group for user {UserId}", userId);
            return StatusCode(500, $"Error creating group: {ex.Message}");
        }
    }

    /// <summary>
    /// Update group details
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="request">Updated group details</param>
    /// <returns>Updated group</returns>
    // PUT: api/groups/5
    [HttpPut("{id}")]
    public async Task<ActionResult<GroupResponse>> UpdateGroup(int id, UpdateGroupRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} updating group {GroupId}", userId, id);

        var group = await _groupService.UpdateAsync(id, userId, request);

        if (group == null)
        {
            _logger.LogWarning("Group {GroupId} not found or user {UserId} not authorized", id, userId);
            return NotFound();
        }

        // Map to response
        var response = new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            CreatedById = group.CreatedById,
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            CreatedBy = new UserBasicInfo
            {
                Id = group.CreatedBy.Id,
                Username = group.CreatedBy.Username,
                Email = group.CreatedBy.Email
            },
            Members = group.Members.Select(m => new GroupMemberResponse
            {
                UserId = m.UserId,
                GroupId = m.GroupId,
                Role = (int)m.Role,
                RoleName = m.Role.ToString(),
                JoinedAt = m.JoinedAt,
                User = new UserBasicInfo
                {
                    Id = m.User.Id,
                    Username = m.User.Username,
                    Email = m.User.Email
                }
            }).ToList(),
            MemberCount = group.Members.Count
        };

        return Ok(response);
    }

    /// <summary>
    /// Delete a group (soft delete)
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <returns>No content</returns>
    // DELETE: api/groups/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(int id)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} deleting group {GroupId}", userId, id);

        var result = await _groupService.DeleteAsync(id, userId);

        if (!result)
        {
            _logger.LogWarning("Group {GroupId} not found or user {UserId} not authorized", id, userId);
            return NotFound();
        }

        _logger.LogInformation("Successfully deleted group {GroupId}", id);
        return NoContent();
    }

    /// <summary>
    /// Get all members of a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <returns>List of group members</returns>
    // GET: api/groups/5/members
    [HttpGet("{id}/members")]
    public async Task<ActionResult<IEnumerable<GroupMemberResponse>>> GetGroupMembers(int id)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting members of group {GroupId}", userId, id);

        var members = await _groupService.GetGroupMembersAsync(id, userId);

        if (!members.Any())
        {
            _logger.LogWarning("No members found for group {GroupId} or user {UserId} not authorized", id, userId);
            return Ok(new List<GroupMemberResponse>()); // Return empty list
        }

        return Ok(members);
    }

    /// <summary>
    /// Get the activity feed for a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="skip">Number of items to skip</param>
    /// <param name="take">Number of items to take</param>
    /// <returns>List of watch activities</returns>
    // GET: api/groups/5/feed
    [HttpGet("{id}/feed")]
    public async Task<ActionResult<IEnumerable<GroupFeedItemResponse>>> GetGroupFeed(
        int id, 
        [FromQuery] int skip = 0, 
        [FromQuery] int take = 20)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting feed for group {GroupId} (skip: {Skip}, take: {Take})", 
            userId, id, skip, take);

        try
        {
            var feedItems = await _groupFeedService.GetGroupFeedAsync(id, userId, skip, take);

            if (!feedItems.Any())
            {
                _logger.LogInformation("No feed items found for group {GroupId}", id);
                return Ok(new List<GroupFeedItemResponse>());
            }

            _logger.LogInformation("Returning {Count} feed items for group {GroupId}", feedItems.Count, id);
            return Ok(feedItems);
        }
        catch (UnauthorizedAccessException)
        {
            _logger.LogWarning("User {UserId} not authorized to access feed for group {GroupId}", userId, id);
            return Unauthorized("You must be a member of this group to view its feed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting feed for group {GroupId}", id);
            return StatusCode(500, $"Error getting group feed: {ex.Message}");
        }
    }

    /// <summary>
    /// Add a member to a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="request">Member details</param>
    /// <returns>Added member details</returns>
    // POST: api/groups/5/members
    [HttpPost("{id}/members")]
    public async Task<ActionResult<GroupMemberResponse>> AddMember(int id, AddMemberRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} adding member {MemberUserId} to group {GroupId}", userId, request.UserId, id);

        try
        {
            var member = await _groupService.AddMemberAsync(id, userId, request);

            if (member == null)
            {
                _logger.LogWarning("Failed to add member to group {GroupId} - group not found or user {UserId} not authorized", id, userId);
                return NotFound();
            }

            // Reload to get User navigation property
            var members = await _groupService.GetGroupMembersAsync(id, userId);
            var response = members.FirstOrDefault(m => m.UserId == request.UserId);

            _logger.LogInformation("Successfully added member {MemberUserId} to group {GroupId}", request.UserId, id);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to add member to group {GroupId}: {Message}", id, ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding member to group {GroupId}", id);
            return StatusCode(500, $"Error adding member: {ex.Message}");
        }
    }

    /// <summary>
    /// Remove a member from a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="userId">User ID to remove</param>
    /// <returns>No content</returns>
    // DELETE: api/groups/5/members/10
    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(int id, int userId)
    {
        var requestingUserId = User.GetUserId();
        _logger.LogInformation("User {RequestingUserId} removing member {UserId} from group {GroupId}", requestingUserId, userId, id);

        try
        {
            var result = await _groupService.RemoveMemberAsync(id, userId, requestingUserId);

            if (!result)
            {
                _logger.LogWarning("Failed to remove member {UserId} from group {GroupId}", userId, id);
                return NotFound();
            }

            _logger.LogInformation("Successfully removed member {UserId} from group {GroupId}", userId, id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to remove member from group {GroupId}: {Message}", id, ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing member from group {GroupId}", id);
            return StatusCode(500, $"Error removing member: {ex.Message}");
        }
    }

    /// <summary>
    /// Update a member's role in a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="userId">User ID</param>
    /// <param name="request">Role update details</param>
    /// <returns>Updated member details</returns>
    // PUT: api/groups/5/members/10/role
    [HttpPut("{id}/members/{userId}/role")]
    public async Task<ActionResult<GroupMemberResponse>> UpdateMemberRole(int id, int userId, UpdateMemberRoleRequest request)
    {
        var requestingUserId = User.GetUserId();
        _logger.LogInformation("User {RequestingUserId} updating role for member {UserId} in group {GroupId}", requestingUserId, userId, id);

        try
        {
            var member = await _groupService.UpdateMemberRoleAsync(id, userId, requestingUserId, request);

            if (member == null)
            {
                _logger.LogWarning("Failed to update member role in group {GroupId} - not found or not authorized", id);
                return NotFound();
            }

            // Reload to get full response
            var members = await _groupService.GetGroupMembersAsync(id, requestingUserId);
            var response = members.FirstOrDefault(m => m.UserId == userId);

            _logger.LogInformation("Successfully updated role for member {UserId} in group {GroupId}", userId, id);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to update member role in group {GroupId}: {Message}", id, ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating member role in group {GroupId}", id);
            return StatusCode(500, $"Error updating member role: {ex.Message}");
        }
    }

    /// <summary>
    /// Get movie recommendations for a group
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <param name="count">Number of recommendations to return (default: 10)</param>
    /// <returns>List of recommended movies</returns>
    // GET: api/groups/5/recommendations
    [HttpGet("{id}/recommendations")]
    public async Task<ActionResult<IEnumerable<TmdbMovie>>> GetGroupRecommendations(int id, [FromQuery] int count = 10)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting recommendations for group {GroupId}", userId, id);

        try
        {
            var recommendations = await _groupRecommendationsService.GetGroupRecommendationsAsync(id, userId, count);

            if (!recommendations.Any())
            {
                _logger.LogInformation("No recommendations found for group {GroupId}", id);
                return Ok(new List<TmdbMovie>());
            }

            _logger.LogInformation("Returning {Count} recommendations for group {GroupId}", recommendations.Count, id);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendations for group {GroupId}", id);
            return StatusCode(500, $"Error getting recommendations: {ex.Message}");
        }
    }

    /// <summary>
    /// Get group viewing stats with recommendations
    /// </summary>
    /// <param name="id">Group ID</param>
    /// <returns>Group stats and recommendations</returns>
    // GET: api/groups/5/recommendations/stats
    [HttpGet("{id}/recommendations/stats")]
    public async Task<ActionResult<GroupRecommendationStats>> GetGroupRecommendationStats(int id)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting recommendation stats for group {GroupId}", userId, id);

        try
        {
            var stats = await _groupRecommendationsService.GetGroupRecommendationStatsAsync(id, userId);

            if (stats.GroupName == "Unauthorized")
            {
                _logger.LogWarning("User {UserId} not authorized to access group {GroupId}", userId, id);
                return Unauthorized("You must be a member of this group to view stats");
            }

            if (stats.GroupName == "Not Found")
            {
                _logger.LogWarning("Group {GroupId} not found", id);
                return NotFound();
            }

            _logger.LogInformation("Returning recommendation stats for group {GroupId}", id);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation stats for group {GroupId}", id);
            return StatusCode(500, $"Error getting recommendation stats: {ex.Message}");
        }
    }
}