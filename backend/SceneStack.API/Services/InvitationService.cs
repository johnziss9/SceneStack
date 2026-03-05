using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class InvitationService : IInvitationService
{
    private readonly ApplicationDbContext _context;
    private readonly IGroupService _groupService;
    private readonly ILogger<InvitationService> _logger;

    public InvitationService(
        ApplicationDbContext context,
        IGroupService groupService,
        ILogger<InvitationService> logger)
    {
        _context = context;
        _groupService = groupService;
        _logger = logger;
    }

    public async Task<InvitationResponse> CreateInvitationAsync(int requestingUserId, CreateInvitationRequest request)
    {
        // Validate group exists and requesting user is admin/creator
        var group = await _context.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == request.GroupId);

        if (group == null)
        {
            _logger.LogWarning("User {UserId} attempted to create invitation for non-existent group {GroupId}",
                requestingUserId, request.GroupId);
            throw new InvalidOperationException("Group not found");
        }

        var requesterMember = group.Members.FirstOrDefault(m => m.UserId == requestingUserId);
        if (requesterMember == null || (requesterMember.Role != GroupRole.Creator && requesterMember.Role != GroupRole.Admin))
        {
            _logger.LogWarning("User {UserId} attempted to create invitation without admin permissions for group {GroupId}",
                requestingUserId, request.GroupId);
            throw new UnauthorizedAccessException("Only admins and creators can send invitations");
        }

        // Validate invited user exists and is not deactivated
        var invitedUser = await _context.Users.FindAsync(request.InvitedUserId);
        if (invitedUser == null)
        {
            _logger.LogWarning("User {UserId} attempted to invite non-existent user {InvitedUserId}",
                requestingUserId, request.InvitedUserId);
            throw new InvalidOperationException("User not found");
        }

        if (invitedUser.IsDeactivated)
        {
            _logger.LogWarning("User {UserId} attempted to invite deactivated user {InvitedUserId}",
                requestingUserId, request.InvitedUserId);
            throw new InvalidOperationException("Cannot invite deactivated users");
        }

        // Check not already a member
        if (group.Members.Any(m => m.UserId == request.InvitedUserId))
        {
            _logger.LogWarning("User {UserId} attempted to invite existing member {InvitedUserId} to group {GroupId}",
                requestingUserId, request.InvitedUserId, request.GroupId);
            throw new InvalidOperationException("User is already a member of this group");
        }

        // Check no existing pending invitation
        var existingInvitation = await _context.GroupInvitations
            .FirstOrDefaultAsync(gi => gi.GroupId == request.GroupId
                && gi.InvitedUserId == request.InvitedUserId
                && gi.Status == InvitationStatus.Pending);

        if (existingInvitation != null)
        {
            _logger.LogWarning("User {UserId} attempted to create duplicate invitation for user {InvitedUserId} to group {GroupId}",
                requestingUserId, request.InvitedUserId, request.GroupId);
            throw new InvalidOperationException("User already has a pending invitation to this group");
        }

        // Check user can join more groups
        if (!await _groupService.CanUserJoinGroupAsync(request.InvitedUserId))
        {
            _logger.LogWarning("User {UserId} attempted to invite user {InvitedUserId} who has reached group limit",
                requestingUserId, request.InvitedUserId);
            throw new InvalidOperationException("User has reached their group limit");
        }

        // Spam prevention: max 5 pending invitations per group
        var pendingCount = await _context.GroupInvitations
            .CountAsync(gi => gi.GroupId == request.GroupId && gi.Status == InvitationStatus.Pending);

        if (pendingCount >= 5)
        {
            _logger.LogWarning("Group {GroupId} has reached maximum pending invitations limit", request.GroupId);
            throw new InvalidOperationException("This group has too many pending invitations. Please wait for some to be processed.");
        }

        // Create invitation
        var invitation = new GroupInvitation
        {
            GroupId = request.GroupId,
            InvitedUserId = request.InvitedUserId,
            InvitedByUserId = requestingUserId,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        _context.GroupInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} created invitation {InvitationId} for user {InvitedUserId} to group {GroupId}",
            requestingUserId, invitation.Id, request.InvitedUserId, request.GroupId);

        return await GetInvitationResponseAsync(invitation.Id);
    }

    public async Task<IEnumerable<InvitationResponse>> GetUserPendingInvitationsAsync(int userId)
    {
        var invitations = await _context.GroupInvitations
            .AsNoTracking()
            .Include(i => i.Group)
            .Include(i => i.InvitedUser)
            .Include(i => i.InvitedByUser)
            .Where(i => i.InvitedUserId == userId && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var responses = new List<InvitationResponse>();
        foreach (var invitation in invitations)
        {
            // Get current member count
            var memberCount = await _context.GroupMembers
                .CountAsync(gm => gm.GroupId == invitation.GroupId);

            responses.Add(new InvitationResponse
            {
                Id = invitation.Id,
                GroupId = invitation.GroupId,
                GroupName = invitation.Group?.Name ?? "Unknown",
                GroupDescription = invitation.Group?.Description,
                GroupMemberCount = memberCount,
                InvitedUserId = invitation.InvitedUserId,
                InvitedUsername = invitation.InvitedUser?.Username ?? "Unknown",
                InvitedUserEmail = invitation.InvitedUser?.Email ?? "Unknown",
                InvitedByUserId = invitation.InvitedByUserId,
                InvitedByUsername = invitation.InvitedByUser?.Username ?? "Unknown",
                Status = (int)invitation.Status,
                CreatedAt = invitation.CreatedAt,
                RespondedAt = invitation.RespondedAt,
                ExpiresAt = invitation.ExpiresAt
            });
        }

        return responses;
    }

    public async Task<int> GetPendingInvitationsCountAsync(int userId)
    {
        return await _context.GroupInvitations
            .CountAsync(gi => gi.InvitedUserId == userId && gi.Status == InvitationStatus.Pending);
    }

    public async Task<InvitationResponse?> RespondToInvitationAsync(int invitationId, int userId, RespondToInvitationRequest request)
    {
        var invitation = await _context.GroupInvitations
            .Include(i => i.Group)
                .ThenInclude(g => g.Members)
            .Include(i => i.InvitedByUser)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation == null)
        {
            _logger.LogWarning("User {UserId} attempted to respond to non-existent invitation {InvitationId}",
                userId, invitationId);
            return null;
        }

        // Verify user is the invited user
        if (invitation.InvitedUserId != userId)
        {
            _logger.LogWarning("User {UserId} attempted to respond to invitation {InvitationId} meant for user {InvitedUserId}",
                userId, invitationId, invitation.InvitedUserId);
            throw new UnauthorizedAccessException("You can only respond to your own invitations");
        }

        // Check status is pending
        if (invitation.Status != InvitationStatus.Pending)
        {
            _logger.LogWarning("User {UserId} attempted to respond to invitation {InvitationId} with status {Status}",
                userId, invitationId, invitation.Status);
            throw new InvalidOperationException("This invitation has already been responded to");
        }

        // Check expiration
        if (invitation.ExpiresAt.HasValue && invitation.ExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("User {UserId} attempted to respond to expired invitation {InvitationId}",
                userId, invitationId);
            throw new InvalidOperationException("This invitation has expired");
        }

        // Check if group still exists
        if (invitation.Group == null || invitation.Group.IsDeleted)
        {
            invitation.Status = InvitationStatus.Cancelled;
            await _context.SaveChangesAsync();
            _logger.LogWarning("User {UserId} attempted to respond to invitation {InvitationId} for deleted group",
                userId, invitationId);
            throw new InvalidOperationException("This group no longer exists");
        }

        if (request.Accept)
        {
            // Re-check group limit (race condition protection)
            if (!await _groupService.CanUserJoinGroupAsync(userId))
            {
                _logger.LogWarning("User {UserId} cannot accept invitation {InvitationId} - group limit reached",
                    userId, invitationId);
                throw new InvalidOperationException("You have reached your group limit");
            }

            // Check not already a member (race condition protection)
            if (invitation.Group.Members.Any(m => m.UserId == userId))
            {
                invitation.Status = InvitationStatus.Cancelled;
                await _context.SaveChangesAsync();
                _logger.LogWarning("User {UserId} is already a member when accepting invitation {InvitationId}",
                    userId, invitationId);
                throw new InvalidOperationException("You are already a member of this group");
            }

            // Add as member
            var member = new GroupMember
            {
                GroupId = invitation.GroupId,
                UserId = userId,
                Role = GroupRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMembers.Add(member);

            // Log history
            var history = new GroupMemberHistory
            {
                GroupId = invitation.GroupId,
                UserId = userId,
                Action = GroupMemberAction.Added,
                ActorId = userId,  // Self-added via invitation
                NewRole = GroupRole.Member,
                Timestamp = DateTime.UtcNow
            };

            _context.GroupMemberHistories.Add(history);

            invitation.Status = InvitationStatus.Accepted;
            _logger.LogInformation("User {UserId} accepted invitation {InvitationId} to group {GroupId}",
                userId, invitationId, invitation.GroupId);
        }
        else
        {
            invitation.Status = InvitationStatus.Declined;
            _logger.LogInformation("User {UserId} declined invitation {InvitationId} to group {GroupId}",
                userId, invitationId, invitation.GroupId);
        }

        invitation.RespondedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetInvitationResponseAsync(invitation.Id);
    }

    public async Task<bool> CancelInvitationAsync(int invitationId, int requestingUserId)
    {
        var invitation = await _context.GroupInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation == null)
        {
            return false;
        }

        // Only inviter can cancel
        if (invitation.InvitedByUserId != requestingUserId)
        {
            _logger.LogWarning("User {UserId} attempted to cancel invitation {InvitationId} created by user {InvitedByUserId}",
                requestingUserId, invitationId, invitation.InvitedByUserId);
            throw new UnauthorizedAccessException("You can only cancel invitations you created");
        }

        // Can only cancel pending invitations
        if (invitation.Status != InvitationStatus.Pending)
        {
            return false;
        }

        invitation.Status = InvitationStatus.Cancelled;
        invitation.RespondedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} cancelled invitation {InvitationId}", requestingUserId, invitationId);

        return true;
    }

    public async Task<IEnumerable<InvitationResponse>> GetSentInvitationsAsync(int groupId, int requestingUserId)
    {
        // Verify user is member of group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to view invitations for group {GroupId} without membership",
                requestingUserId, groupId);
            throw new UnauthorizedAccessException("You must be a member of this group to view invitations");
        }

        var invitations = await _context.GroupInvitations
            .AsNoTracking()
            .Include(i => i.Group)
            .Include(i => i.InvitedUser)
            .Include(i => i.InvitedByUser)
            .Where(i => i.GroupId == groupId && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var responses = new List<InvitationResponse>();
        foreach (var invitation in invitations)
        {
            var memberCount = await _context.GroupMembers
                .CountAsync(gm => gm.GroupId == invitation.GroupId);

            responses.Add(new InvitationResponse
            {
                Id = invitation.Id,
                GroupId = invitation.GroupId,
                GroupName = invitation.Group?.Name ?? "Unknown",
                GroupDescription = invitation.Group?.Description,
                GroupMemberCount = memberCount,
                InvitedUserId = invitation.InvitedUserId,
                InvitedUsername = invitation.InvitedUser?.Username ?? "Unknown",
                InvitedUserEmail = invitation.InvitedUser?.Email ?? "Unknown",
                InvitedByUserId = invitation.InvitedByUserId,
                InvitedByUsername = invitation.InvitedByUser?.Username ?? "Unknown",
                Status = (int)invitation.Status,
                CreatedAt = invitation.CreatedAt,
                RespondedAt = invitation.RespondedAt,
                ExpiresAt = invitation.ExpiresAt
            });
        }

        return responses;
    }

    public async Task<IEnumerable<UserSearchResult>> SearchUsersAsync(UserSearchRequest request, int requestingUserId)
    {
        var query = request.Query.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(query))
        {
            return Enumerable.Empty<UserSearchResult>();
        }

        // Get users matching username or email
        var users = await _context.Users
            .Where(u => !u.IsDeleted
                && !u.IsDeactivated
                && u.Id != requestingUserId
                && (u.Username.ToLower().Contains(query) || u.Email.ToLower().Contains(query)))
            .Take(20)
            .ToListAsync();

        // Exclude members and pending invitations if group specified
        if (request.ExcludeGroupId.HasValue)
        {
            var memberIds = await _context.GroupMembers
                .Where(gm => gm.GroupId == request.ExcludeGroupId.Value)
                .Select(gm => gm.UserId)
                .ToListAsync();

            users = users.Where(u => !memberIds.Contains(u.Id)).ToList();

            // Also exclude users with pending invitations
            var pendingInvitedIds = await _context.GroupInvitations
                .Where(gi => gi.GroupId == request.ExcludeGroupId.Value
                    && gi.Status == InvitationStatus.Pending)
                .Select(gi => gi.InvitedUserId)
                .ToListAsync();

            users = users.Where(u => !pendingInvitedIds.Contains(u.Id)).ToList();
        }

        // Map to results with tier check
        var results = new List<UserSearchResult>();
        foreach (var user in users)
        {
            var canJoin = await _groupService.CanUserJoinGroupAsync(user.Id);
            results.Add(new UserSearchResult
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                IsPremium = user.IsPremium,
                IsDeactivated = user.IsDeactivated,
                CanJoinMoreGroups = canJoin
            });
        }

        return results;
    }

    private async Task<InvitationResponse> GetInvitationResponseAsync(int invitationId)
    {
        var invitation = await _context.GroupInvitations
            .AsNoTracking()
            .Include(i => i.Group)
            .Include(i => i.InvitedUser)
            .Include(i => i.InvitedByUser)
            .FirstOrDefaultAsync(i => i.Id == invitationId);

        if (invitation == null)
        {
            throw new InvalidOperationException("Invitation not found");
        }

        var memberCount = await _context.GroupMembers
            .CountAsync(gm => gm.GroupId == invitation.GroupId);

        return new InvitationResponse
        {
            Id = invitation.Id,
            GroupId = invitation.GroupId,
            GroupName = invitation.Group?.Name ?? "Unknown",
            GroupDescription = invitation.Group?.Description,
            GroupMemberCount = memberCount,
            InvitedUserId = invitation.InvitedUserId,
            InvitedUsername = invitation.InvitedUser?.Username ?? "Unknown",
            InvitedUserEmail = invitation.InvitedUser?.Email ?? "Unknown",
            InvitedByUserId = invitation.InvitedByUserId,
            InvitedByUsername = invitation.InvitedByUser?.Username ?? "Unknown",
            Status = (int)invitation.Status,
            CreatedAt = invitation.CreatedAt,
            RespondedAt = invitation.RespondedAt,
            ExpiresAt = invitation.ExpiresAt
        };
    }
}
