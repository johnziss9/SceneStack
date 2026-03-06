using Microsoft.EntityFrameworkCore;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GroupService> _logger;
    private readonly IAuditService _auditService;

    public GroupService(ApplicationDbContext context, ILogger<GroupService> logger, IAuditService auditService)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task<Group?> GetByIdAsync(int id, int requestingUserId)
    {
        var group = await _context.Groups
            .AsNoTracking()
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
            .AsNoTracking()
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
            Members = g.Members
                .Where(m => m.User != null) // Filter out members with deleted users
                .Select(m => new GroupMemberResponse
                {
                    UserId = m.UserId,
                    GroupId = m.GroupId,
                    Role = (int)m.Role,
                    RoleName = m.Role.ToString(),
                    JoinedAt = m.JoinedAt,
                    Username = m.User.Username,
                    Email = m.User.Email,
                    IsDeactivated = m.User.IsDeactivated,
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

        // Audit log: Group created
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupCreated,
            Action = "Create",
            Success = true,
            EntityType = "Group",
            EntityId = group.Id.ToString(),
            NewValues = new { group.Id, group.Name, group.Description, group.CreatedById },
            AdditionalData = new Dictionary<string, object>
            {
                { "GroupName", group.Name },
                { "MemberCount", 1 }
            }
        });

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

        // Capture before state
        var oldValues = new { group.Name, group.Description };
        var changes = new Dictionary<string, object>();

        if (group.Name != request.Name)
        {
            changes["Name"] = new { Old = group.Name, New = request.Name };
        }

        if (group.Description != request.Description)
        {
            changes["Description"] = new { Old = group.Description, New = request.Description };
        }

        group.Name = request.Name;
        group.Description = request.Description;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Audit log: Group updated (only if changes were made)
        if (changes.Any())
        {
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = requestingUserId,
                Category = AuditEventCategory.Group,
                EventType = AuditEvents.GroupUpdated,
                Action = "Update",
                Success = true,
                EntityType = "Group",
                EntityId = id.ToString(),
                OldValues = oldValues,
                NewValues = new { group.Name, group.Description },
                AdditionalData = new Dictionary<string, object>
                {
                    { "GroupId", id },
                    { "ChangedFields", changes.Keys.ToList() },
                    { "FieldChanges", changes },
                    { "ActorRole", member.Role.ToString() }
                }
            });
        }

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

            // Audit log: Failed deletion attempt
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = requestingUserId,
                Category = AuditEventCategory.Security,
                EventType = AuditEvents.UnauthorizedAccess,
                Action = "Delete",
                Success = false,
                ErrorMessage = "User is not the group creator",
                EntityType = "Group",
                EntityId = id.ToString(),
                AdditionalData = new Dictionary<string, object>
                {
                    { "GroupId", id },
                    { "GroupCreatorId", group.CreatedById },
                    { "Reason", "Unauthorized - only creator can delete" },
                    { "AttemptedAction", "Group.Delete" }
                }
            });

            return false;
        }

        // Capture data before deletion
        var memberCount = group.Members.Count;

        group.IsDeleted = true;
        group.DeletedAt = DateTime.UtcNow;
        group.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Audit log: Group deleted
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = requestingUserId,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupDeleted,
            Action = "Delete",
            Success = true,
            EntityType = "Group",
            EntityId = id.ToString(),
            OldValues = new { group.Name, group.Description, MemberCount = memberCount },
            AdditionalData = new Dictionary<string, object>
            {
                { "GroupId", id },
                { "GroupName", group.Name },
                { "MemberCount", memberCount }
            }
        });

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

        // Audit log: Member added
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = requestingUserId,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupMemberAdded,
            Action = "Create",
            Success = true,
            EntityType = "GroupMember",
            EntityId = $"{groupId}_{request.UserId}",
            NewValues = new { GroupId = groupId, UserId = request.UserId, Role = ((GroupRole)request.Role).ToString() },
            AdditionalData = new Dictionary<string, object>
            {
                { "GroupId", groupId },
                { "AddedUserId", request.UserId },
                { "Role", ((GroupRole)request.Role).ToString() },
                { "ActorId", requestingUserId },
                { "ActorRole", requestingMember.Role.ToString() }
            }
        });

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

        // Audit log: Member removed or left
        var eventType = isSelfRemoval ? AuditEvents.GroupMemberLeft : AuditEvents.GroupMemberRemoved;
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = requestingUserId,
            Category = AuditEventCategory.Group,
            EventType = eventType,
            Action = "Delete",
            Success = true,
            EntityType = "GroupMember",
            EntityId = $"{groupId}_{memberUserId}",
            OldValues = new { GroupId = groupId, UserId = memberUserId, Role = memberToRemove.Role.ToString() },
            AdditionalData = new Dictionary<string, object>
            {
                { "GroupId", groupId },
                { "RemovedUserId", memberUserId },
                { "PreviousRole", memberToRemove.Role.ToString() },
                { "IsSelfRemoval", isSelfRemoval },
                { "ActorId", requestingUserId },
                { "ActorRole", requestingMember?.Role.ToString() ?? "Self" }
            }
        });

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

        // Audit log: Member role changed
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = requestingUserId,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupMemberRoleChanged,
            Action = "Update",
            Success = true,
            EntityType = "GroupMember",
            EntityId = $"{groupId}_{memberUserId}",
            OldValues = new { GroupId = groupId, UserId = memberUserId, Role = previousRole.ToString() },
            NewValues = new { GroupId = groupId, UserId = memberUserId, Role = ((GroupRole)request.Role).ToString() },
            AdditionalData = new Dictionary<string, object>
            {
                { "GroupId", groupId },
                { "TargetUserId", memberUserId },
                { "PreviousRole", previousRole.ToString() },
                { "NewRole", ((GroupRole)request.Role).ToString() },
                { "ActorId", requestingUserId },
                { "ActorRole", requestingMember.Role.ToString() }
            }
        });

        return memberToUpdate;
    }

    public async Task<IEnumerable<GroupMemberResponse>> GetGroupMembersAsync(int groupId, int requestingUserId)
    {
        var group = await _context.Groups
            .AsNoTracking()
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

        return group.Members
            .Where(m => m.User != null) // Filter out members with deleted users
            .Select(m => new GroupMemberResponse
            {
                UserId = m.UserId,
                GroupId = m.GroupId,
                Role = (int)m.Role,
                RoleName = m.Role.ToString(),
                JoinedAt = m.JoinedAt,
                Username = m.User.Username,
                Email = m.User.Email,
                IsDeactivated = m.User.IsDeactivated,
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

        // Free users can join 1 additional group (plus 1 they created = 2 total)
        var joinedGroupsCount = await _context.GroupMembers
            .CountAsync(gm => gm.UserId == userId && gm.Role != GroupRole.Creator);

        return joinedGroupsCount < 1;
    }

    public async Task<GroupStatsResponse?> GetGroupStatsAsync(int groupId, int requestingUserId)
    {
        // Verify requesting user is a member of the group
        var group = await _context.Groups
            .AsNoTracking()
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return null;

        if (!group.Members.Any(m => m.UserId == requestingUserId))
        {
            _logger.LogWarning("User {UserId} attempted to access stats for group {GroupId} without membership", requestingUserId, groupId);
            return null;
        }

        // Load all watches for movies shared with this group
        var groupWatches = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.Movie)
            .Include(w => w.User)
            .ToListAsync();

        // Apply privacy filtering — always include requesting user's own watches
        var visibleWatches = groupWatches
            .Where(w => w.UserId == requestingUserId || w.User.ShareWatches)
            .ToList();

        var totalWatches = visibleWatches.Count;
        var uniqueMovies = visibleWatches.Select(w => w.MovieId).Distinct().Count();

        // Average rating — respect ShareRatings setting for other members
        var ratedWatches = visibleWatches
            .Where(w => w.Rating.HasValue &&
                        (w.UserId == requestingUserId || w.User.ShareRatings))
            .ToList();

        double? averageGroupRating = ratedWatches.Any()
            ? Math.Round(ratedWatches.Average(w => w.Rating!.Value), 1)
            : null;

        // Per-member stats
        var memberStats = group.Members
            .Where(m => m.User != null) // Filter out members with deleted users
            .Select(m =>
            {
                var memberWatches = visibleWatches.Where(w => w.UserId == m.UserId).ToList();
                var memberRated = memberWatches
                    .Where(w => w.Rating.HasValue &&
                                (w.UserId == requestingUserId || m.User.ShareRatings))
                    .ToList();

                return new GroupMemberStats
                {
                    UserId = m.UserId,
                    Username = m.User.Username,
                    WatchCount = memberWatches.Count,
                    AverageRating = memberRated.Any()
                        ? Math.Round(memberRated.Average(w => w.Rating!.Value), 1)
                        : null,
                    IsDeactivated = m.User.IsDeactivated
                };
            })
            .OrderByDescending(ms => ms.WatchCount)
            .ToList();

        var mostActiveMember = memberStats.FirstOrDefault(ms => ms.WatchCount > 0)?.Username;

        // Shared movies — watched by 2 or more distinct members
        var sharedMovies = visibleWatches
            .GroupBy(w => w.MovieId)
            .Where(g => g.Select(w => w.UserId).Distinct().Count() >= 2)
            .OrderByDescending(g => g.Select(w => w.UserId).Distinct().Count())
            .Take(10)
            .Select(g =>
            {
                var first = g.First();
                return new SharedMovieStats
                {
                    Movie = new MovieBasicInfo
                    {
                        Id = first.Movie.Id,
                        TmdbId = first.Movie.TmdbId,
                        Title = first.Movie.Title,
                        Year = first.Movie.Year,
                        PosterPath = first.Movie.PosterPath,
                        Synopsis = first.Movie.Synopsis,
                        AiSynopsis = first.Movie.AiSynopsis
                    },
                    WatchedByCount = g.Select(w => w.UserId).Distinct().Count(),
                    WatchedByUsernames = g
                        .Select(w => w.User.Username)
                        .Distinct()
                        .ToList()
                };
            })
            .ToList();

        return new GroupStatsResponse
        {
            GroupId = groupId,
            GroupName = group.Name,
            TotalWatches = totalWatches,
            UniqueMovies = uniqueMovies,
            AverageGroupRating = averageGroupRating,
            MostActiveMember = mostActiveMember,
            MemberStats = memberStats,
            SharedMovies = sharedMovies
        };
    }
}