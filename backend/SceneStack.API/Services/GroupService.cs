using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GroupService> _logger;

    public GroupService(ApplicationDbContext context, ILogger<GroupService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Group?> GetByIdAsync(int id, int requestingUserId)
    {
        var group = await _context.Groups
            .Include(g => g.CreatedBy)
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return null;

        // Check if user is a member of the group
        var isMember = group.Members.Any(m => m.UserId == requestingUserId);
        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to access group {GroupId} without membership", requestingUserId, id);
            return null;
        }

        return group;
    }

    public async Task<IEnumerable<GroupResponse>> GetUserGroupsAsync(int userId)
    {
        var groups = await _context.Groups
            .Include(g => g.CreatedBy)
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Where(g => g.Members.Any(m => m.UserId == userId))
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return groups.Select(g => new GroupResponse
        {
            Id = g.Id,
            Name = g.Name,
            Description = g.Description,
            CreatedById = g.CreatedById,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt,
            CreatedBy = new UserBasicInfo
            {
                Id = g.CreatedBy.Id,
                Username = g.CreatedBy.Username,
                Email = g.CreatedBy.Email
            },
            Members = g.Members.Select(m => new GroupMemberResponse
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
            MemberCount = g.Members.Count
        });
    }

    public async Task<Group> CreateAsync(int userId, CreateGroupRequest request)
    {
        // Check if user can create a group (free tier limit)
        if (!await CanUserCreateGroupAsync(userId))
        {
            throw new InvalidOperationException("User has reached the maximum number of groups they can create");
        }

        var group = new Group
        {
            Name = request.Name,
            Description = request.Description,
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        // Add creator as a member with Creator role
        var creatorMember = new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };

        _context.GroupMembers.Add(creatorMember);

        // Log to history
        var history = new GroupMemberHistory
        {
            GroupId = group.Id,
            UserId = userId,
            Action = GroupMemberAction.Added,
            ActorId = userId,
            NewRole = GroupRole.Creator,
            Timestamp = DateTime.UtcNow
        };

        _context.GroupMemberHistories.Add(history);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        return (await GetByIdAsync(group.Id, userId))!;
    }

    public async Task<Group?> UpdateAsync(int id, int requestingUserId, UpdateGroupRequest request)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return null;

        // Check if user is creator or admin
        var member = group.Members.FirstOrDefault(m => m.UserId == requestingUserId);
        if (member == null || (member.Role != GroupRole.Creator && member.Role != GroupRole.Admin))
        {
            _logger.LogWarning("User {UserId} attempted to update group {GroupId} without permission", requestingUserId, id);
            return null;
        }

        group.Name = request.Name;
        group.Description = request.Description;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, requestingUserId);
    }

    public async Task<bool> DeleteAsync(int id, int requestingUserId)
    {
        var group = await _context.Groups
            .IgnoreQueryFilters()
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted);

        if (group == null)
            return false;

        // Only creator can delete
        if (group.CreatedById != requestingUserId)
        {
            _logger.LogWarning("User {UserId} attempted to delete group {GroupId} without creator permission", requestingUserId, id);
            return false;
        }

        group.IsDeleted = true;
        group.DeletedAt = DateTime.UtcNow;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<GroupMember?> AddMemberAsync(int groupId, int requestingUserId, AddMemberRequest request)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return null;

        // Check if requesting user is creator or admin
        var requestingMember = group.Members.FirstOrDefault(m => m.UserId == requestingUserId);
        if (requestingMember == null || (requestingMember.Role != GroupRole.Creator && requestingMember.Role != GroupRole.Admin))
        {
            _logger.LogWarning("User {UserId} attempted to add member to group {GroupId} without permission", requestingUserId, groupId);
            return null;
        }

        // Check if user is already a member
        if (group.Members.Any(m => m.UserId == request.UserId))
        {
            throw new InvalidOperationException("User is already a member of this group");
        }

        // Check if user can join more groups (free tier limit)
        if (!await CanUserJoinGroupAsync(request.UserId))
        {
            throw new InvalidOperationException("User has reached the maximum number of groups they can join");
        }

        var newMember = new GroupMember
        {
            GroupId = groupId,
            UserId = request.UserId,
            Role = (GroupRole)request.Role,
            JoinedAt = DateTime.UtcNow
        };

        _context.GroupMembers.Add(newMember);

        // Log to history
        var history = new GroupMemberHistory
        {
            GroupId = groupId,
            UserId = request.UserId,
            Action = GroupMemberAction.Added,
            ActorId = requestingUserId,
            NewRole = (GroupRole)request.Role,
            Timestamp = DateTime.UtcNow
        };

        _context.GroupMemberHistories.Add(history);
        await _context.SaveChangesAsync();

        return newMember;
    }

    public async Task<bool> RemoveMemberAsync(int groupId, int memberUserId, int requestingUserId)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return false;

        var memberToRemove = group.Members.FirstOrDefault(m => m.UserId == memberUserId);
        if (memberToRemove == null)
            return false;

        // Cannot remove creator
        if (memberToRemove.Role == GroupRole.Creator)
        {
            throw new InvalidOperationException("Cannot remove the group creator");
        }

        // Check permissions: creator or admin can remove, or user removing themselves
        var requestingMember = group.Members.FirstOrDefault(m => m.UserId == requestingUserId);
        var isSelfRemoval = memberUserId == requestingUserId;
        var hasPermission = requestingMember != null &&
                           (requestingMember.Role == GroupRole.Creator || requestingMember.Role == GroupRole.Admin);

        if (!isSelfRemoval && !hasPermission)
        {
            _logger.LogWarning("User {UserId} attempted to remove member from group {GroupId} without permission", requestingUserId, groupId);
            return false;
        }

        _context.GroupMembers.Remove(memberToRemove);

        // Log to history
        var history = new GroupMemberHistory
        {
            GroupId = groupId,
            UserId = memberUserId,
            Action = isSelfRemoval ? GroupMemberAction.Left : GroupMemberAction.Removed,
            ActorId = requestingUserId,
            PreviousRole = memberToRemove.Role,
            Timestamp = DateTime.UtcNow
        };

        _context.GroupMemberHistories.Add(history);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<GroupMember?> UpdateMemberRoleAsync(int groupId, int memberUserId, int requestingUserId, UpdateMemberRoleRequest request)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return null;

        var memberToUpdate = group.Members.FirstOrDefault(m => m.UserId == memberUserId);
        if (memberToUpdate == null)
            return null;

        // Cannot change creator role
        if (memberToUpdate.Role == GroupRole.Creator)
        {
            throw new InvalidOperationException("Cannot change the role of the group creator");
        }

        // Check if requesting user is creator or admin
        var requestingMember = group.Members.FirstOrDefault(m => m.UserId == requestingUserId);
        if (requestingMember == null || (requestingMember.Role != GroupRole.Creator && requestingMember.Role != GroupRole.Admin))
        {
            _logger.LogWarning("User {UserId} attempted to update member role in group {GroupId} without permission", requestingUserId, groupId);
            return null;
        }

        var previousRole = memberToUpdate.Role;
        memberToUpdate.Role = (GroupRole)request.Role;

        // Log to history
        var history = new GroupMemberHistory
        {
            GroupId = groupId,
            UserId = memberUserId,
            Action = GroupMemberAction.RoleChanged,
            ActorId = requestingUserId,
            PreviousRole = previousRole,
            NewRole = (GroupRole)request.Role,
            Timestamp = DateTime.UtcNow
        };

        _context.GroupMemberHistories.Add(history);
        await _context.SaveChangesAsync();

        return memberToUpdate;
    }

    public async Task<IEnumerable<GroupMemberResponse>> GetGroupMembersAsync(int groupId, int requestingUserId)
    {
        var group = await _context.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return Enumerable.Empty<GroupMemberResponse>();

        // Check if user is a member
        if (!group.Members.Any(m => m.UserId == requestingUserId))
        {
            _logger.LogWarning("User {UserId} attempted to view members of group {GroupId} without membership", requestingUserId, groupId);
            return Enumerable.Empty<GroupMemberResponse>();
        }

        return group.Members.Select(m => new GroupMemberResponse
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
        });
    }

    public async Task<bool> CanUserCreateGroupAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        // Premium users can create unlimited groups
        if (user.IsPremium)
            return true;

        // Free users can create 1 group
        var createdGroupsCount = await _context.Groups
            .CountAsync(g => g.CreatedById == userId);

        return createdGroupsCount < 1;
    }

    public async Task<bool> CanUserJoinGroupAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        // Premium users can join unlimited groups
        if (user.IsPremium)
            return true;

        // Free users can join 2 additional groups (plus 1 they created = 3 total)
        var joinedGroupsCount = await _context.GroupMembers
            .CountAsync(gm => gm.UserId == userId && gm.Role != GroupRole.Creator);

        return joinedGroupsCount < 2;
    }
}