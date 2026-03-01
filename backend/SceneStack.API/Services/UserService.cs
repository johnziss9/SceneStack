using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using System.Text;
using System.Text.Json;
using System.IO.Compression;

namespace SceneStack.API.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<UserService> _logger;

    public UserService(ApplicationDbContext context, UserManager<ApplicationUser> userManager, ILogger<UserService> logger)
    {
        _context = context;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<User?> GetProfileAsync(int userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    public async Task<User?> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        // Check if username is being changed and if it's already taken
        if (!string.IsNullOrWhiteSpace(request.Username) && request.Username != user.Username)
        {
            var usernameExists = await _context.Users
                .AnyAsync(u => u.Username == request.Username && u.Id != userId);

            if (usernameExists)
            {
                throw new InvalidOperationException("Username is already taken");
            }

            user.Username = request.Username;

            // Update ApplicationUser username as well
            var authUser = await _userManager.Users
                .FirstOrDefaultAsync(u => u.DomainUserId == userId);
            if (authUser != null)
            {
                authUser.UserName = request.Username;
                await _userManager.UpdateAsync(authUser);
            }
        }

        // Update email
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            user.Email = request.Email;

            // Update ApplicationUser email as well
            var authUser = await _userManager.Users
                .FirstOrDefaultAsync(u => u.DomainUserId == userId);
            if (authUser != null)
            {
                authUser.Email = request.Email;
                await _userManager.UpdateAsync(authUser);
            }
        }

        // Update bio
        if (request.Bio != null)
        {
            user.Bio = request.Bio;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        // Validate that new password matches confirmation
        if (request.NewPassword != request.ConfirmPassword)
        {
            return false;
        }

        // Find the ApplicationUser by domain user ID
        var authUser = await _userManager.Users
            .FirstOrDefaultAsync(u => u.DomainUserId == userId);

        if (authUser == null)
        {
            return false;
        }

        // Verify current password
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, request.CurrentPassword);
        if (!isPasswordValid)
        {
            return false;
        }

        // Change password
        var result = await _userManager.ChangePasswordAsync(
            authUser,
            request.CurrentPassword,
            request.NewPassword
        );

        return result.Succeeded;
    }

    public async Task<bool> DeleteAccountAsync(int userId, string password)
    {
        // Find the ApplicationUser by domain user ID
        var authUser = await _userManager.Users
            .FirstOrDefaultAsync(u => u.DomainUserId == userId);

        if (authUser == null)
        {
            return false;
        }

        // Verify password before deletion
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, password);
        if (!isPasswordValid)
        {
            return false;
        }

        // Start the 30-day deletion process
        var domainUser = await _context.Users.FindAsync(userId);
        if (domainUser != null)
        {
            // Deactivate and schedule for deletion
            domainUser.IsDeactivated = true;
            domainUser.DeactivatedAt = DateTime.UtcNow;
            domainUser.DeletedAt = DateTime.UtcNow; // Start 30-day countdown
            domainUser.UpdatedAt = DateTime.UtcNow;
            // NOTE: IsDeleted will be set to true after 30 days by background job
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<(byte[] content, string contentType, string fileName)> ExportUserDataAsync(int userId, string format)
    {
        // Get user data
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        // Get all watches with movie details
        var watches = await _context.Watches
            .Where(w => w.UserId == userId)
            .Include(w => w.Movie)
            .Include(w => w.WatchGroups)
                .ThenInclude(wg => wg.Group)
            .OrderByDescending(w => w.WatchedDate)
            .Select(w => new
            {
                Title = w.Movie.Title,
                Year = w.Movie.Year,
                TmdbId = w.Movie.TmdbId,
                WatchedDate = w.WatchedDate,
                Rating = w.Rating,
                Location = w.WatchLocation,
                IsRewatch = w.IsRewatch,
                Privacy = w.IsPrivate ? "Private" : "Shared",
                SharedWithGroups = string.Join("; ", w.WatchGroups.Select(wg => wg.Group.Name)),
                Notes = w.Notes
            })
            .ToListAsync();

        // Get watchlist
        var watchlist = await _context.WatchlistItems
            .Where(wi => wi.UserId == userId && !wi.IsDeleted)
            .Include(wi => wi.Movie)
            .OrderBy(wi => wi.Priority)
            .Select(wi => new
            {
                Title = wi.Movie.Title,
                Year = wi.Movie.Year,
                TmdbId = wi.Movie.TmdbId,
                AddedDate = wi.AddedAt,
                Priority = wi.Priority,
                Notes = wi.Notes
            })
            .ToListAsync();

        // Get groups
        var groups = await _context.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Include(gm => gm.Group)
            .Select(gm => new
            {
                Name = gm.Group.Name,
                Role = gm.Role.ToString(),
                JoinedDate = gm.JoinedAt,
                MemberCount = _context.GroupMembers.Count(m => m.GroupId == gm.GroupId)
            })
            .ToListAsync();

        // Get AI usage stats (premium users only)
        var aiUsageStats = new List<object>();
        if (user.IsPremium)
        {
            aiUsageStats = await _context.AiUsages
                .Where(u => u.UserId == userId)
                .GroupBy(u => u.Feature)
                .Select(g => new
                {
                    Feature = g.Key,
                    TotalUsage = g.Count(),
                    TotalTokens = g.Sum(u => u.TokensUsed),
                    TotalCost = g.Sum(u => u.Cost)
                })
                .Cast<object>()
                .ToListAsync();
        }

        // Generate export based on format
        if (format == "csv")
        {
            return GenerateCsvExport(user, watches, watchlist, groups, aiUsageStats);
        }
        else
        {
            return GenerateJsonExport(user, watches, watchlist, groups, aiUsageStats);
        }
    }

    private (byte[] content, string contentType, string fileName) GenerateCsvExport(
        User user,
        IEnumerable<dynamic> watches,
        IEnumerable<dynamic> watchlist,
        IEnumerable<dynamic> groups,
        IEnumerable<object> aiUsageStats)
    {
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            // 1. Watches CSV
            var watchesCsv = new StringBuilder();
            watchesCsv.AppendLine("Title,Year,TMDB_ID,Watched_Date,Rating,Location,Rewatch,Privacy,Shared_With_Groups,Notes");
            foreach (var watch in watches)
            {
                watchesCsv.AppendLine($"\"{EscapeCsv(watch.Title)}\"," +
                              $"{watch.Year ?? ""}," +
                              $"{watch.TmdbId}," +
                              $"{watch.WatchedDate:yyyy-MM-dd}," +
                              $"{watch.Rating?.ToString("F1") ?? ""}," +
                              $"\"{EscapeCsv(watch.Location)}\"," +
                              $"{watch.IsRewatch}," +
                              $"\"{EscapeCsv(watch.Privacy)}\"," +
                              $"\"{EscapeCsv(watch.SharedWithGroups)}\"," +
                              $"\"{EscapeCsv(watch.Notes)}\"");
            }
            AddFileToZip(archive, "watches.csv", watchesCsv.ToString());

            // 2. Watchlist CSV
            var watchlistCsv = new StringBuilder();
            watchlistCsv.AppendLine("Title,Year,TMDB_ID,Added_Date,Priority,Notes");
            foreach (var item in watchlist)
            {
                watchlistCsv.AppendLine($"\"{EscapeCsv(item.Title)}\"," +
                              $"{item.Year ?? ""}," +
                              $"{item.TmdbId}," +
                              $"{item.AddedDate:yyyy-MM-dd}," +
                              $"{item.Priority}," +
                              $"\"{EscapeCsv(item.Notes)}\"");
            }
            AddFileToZip(archive, "watchlist.csv", watchlistCsv.ToString());

            // 3. Groups CSV
            var groupsCsv = new StringBuilder();
            groupsCsv.AppendLine("Group_Name,Role,Joined_Date,Member_Count");
            foreach (var group in groups)
            {
                groupsCsv.AppendLine($"\"{EscapeCsv(group.Name)}\"," +
                              $"\"{EscapeCsv(group.Role)}\"," +
                              $"{group.JoinedDate:yyyy-MM-dd}," +
                              $"{group.MemberCount}");
            }
            AddFileToZip(archive, "groups.csv", groupsCsv.ToString());

            // 4. Account CSV
            var accountCsv = new StringBuilder();
            accountCsv.AppendLine("Username,Email,Bio,Joined_Date,Is_Premium");
            accountCsv.AppendLine($"\"{EscapeCsv(user.Username)}\"," +
                          $"\"{EscapeCsv(user.Email)}\"," +
                          $"\"{EscapeCsv(user.Bio)}\"," +
                          $"{user.CreatedAt:yyyy-MM-dd}," +
                          $"{user.IsPremium}");
            AddFileToZip(archive, "account.csv", accountCsv.ToString());

            // 5. AI Usage Stats CSV (premium only)
            if (user.IsPremium && aiUsageStats.Any())
            {
                var aiStatsCsv = new StringBuilder();
                aiStatsCsv.AppendLine("Feature,Total_Usage,Total_Tokens,Total_Cost");
                foreach (dynamic stat in aiUsageStats)
                {
                    aiStatsCsv.AppendLine($"\"{EscapeCsv(stat.Feature)}\"," +
                                  $"{stat.TotalUsage}," +
                                  $"{stat.TotalTokens}," +
                                  $"{stat.TotalCost:F4}");
                }
                AddFileToZip(archive, "ai_usage_stats.csv", aiStatsCsv.ToString());
            }
        }

        memoryStream.Position = 0;
        var bytes = memoryStream.ToArray();
        var fileName = $"scenestack-export-{user.Username}-{DateTime.UtcNow:yyyy-MM-dd}.zip";

        return (bytes, "application/zip", fileName);
    }

    private void AddFileToZip(ZipArchive archive, string fileName, string content)
    {
        var entry = archive.CreateEntry(fileName);
        using var entryStream = entry.Open();
        using var writer = new StreamWriter(entryStream, Encoding.UTF8);
        writer.Write(content);
    }

    private (byte[] content, string contentType, string fileName) GenerateJsonExport(
        User user,
        IEnumerable<dynamic> watches,
        IEnumerable<dynamic> watchlist,
        IEnumerable<dynamic> groups,
        IEnumerable<object> aiUsageStats)
    {
        var exportData = new
        {
            export_date = DateTime.UtcNow,
            account = new
            {
                username = user.Username,
                email = user.Email,
                bio = user.Bio,
                joined_date = user.CreatedAt,
                is_premium = user.IsPremium
            },
            watches = watches.Select(w => new
            {
                title = w.Title,
                year = w.Year,
                tmdb_id = w.TmdbId,
                watched_date = w.WatchedDate,
                rating = w.Rating,
                location = w.Location,
                is_rewatch = w.IsRewatch,
                privacy = w.Privacy,
                shared_with_groups = w.SharedWithGroups?.Split(new[] { "; " }, StringSplitOptions.RemoveEmptyEntries),
                notes = w.Notes
            }),
            watchlist = watchlist.Select(wi => new
            {
                title = wi.Title,
                year = wi.Year,
                tmdb_id = wi.TmdbId,
                added_date = wi.AddedDate,
                priority = wi.Priority,
                notes = wi.Notes
            }),
            groups = groups.Select(g => new
            {
                name = g.Name,
                role = g.Role,
                joined_date = g.JoinedDate,
                member_count = g.MemberCount
            }),
            ai_usage_stats = aiUsageStats
        };

        var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var bytes = Encoding.UTF8.GetBytes(json);
        var fileName = $"scenestack-export-{user.Username}-{DateTime.UtcNow:yyyy-MM-dd}.json";

        return (bytes, "application/json", fileName);
    }

    private string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return "";

        // Escape double quotes by doubling them
        return value.Replace("\"", "\"\"");
    }

    public async Task<List<GroupWithTransferEligibilityResponse>> GetCreatedGroupsWithTransferEligibilityAsync(int userId)
    {
        // Get all groups where this user is the owner (CreatedById)
        var createdGroups = await _context.Groups
            .Where(g => g.CreatedById == userId && !g.IsDeleted)
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .AsSplitQuery()
            .ToListAsync();

        var result = new List<GroupWithTransferEligibilityResponse>();

        foreach (var group in createdGroups)
        {
            var eligibleMembers = new List<EligibleTransferMember>();

            // Get all members except the owner, excluding deleted and deactivated users
            var members = group.Members
                .Where(m => m.UserId != userId &&
                           m.User != null &&
                           !m.User.IsDeleted &&
                           !m.User.IsDeactivated)
                .ToList();

            foreach (var member in members)
            {
                // Check if member is eligible to receive ownership
                // Eligible if: Premium (unlimited groups) OR Free user who hasn't created a group
                bool isEligible;

                if (member.User.IsPremium)
                {
                    // Premium users can have unlimited groups
                    isEligible = true;
                }
                else
                {
                    // Free users can only create 1 group
                    var hasCreatedGroup = await _context.Groups
                        .AnyAsync(g => g.CreatedById == member.UserId && !g.IsDeleted);
                    isEligible = !hasCreatedGroup;
                }

                eligibleMembers.Add(new EligibleTransferMember(
                    UserId: member.UserId,
                    Username: member.User.Username,
                    IsPremium: member.User.IsPremium,
                    IsAdmin: member.Role == GroupRole.Admin || member.Role == GroupRole.Creator,
                    IsEligible: isEligible
                ));
            }

            result.Add(new GroupWithTransferEligibilityResponse(
                GroupId: group.Id,
                GroupName: group.Name,
                MemberCount: group.Members.Count,
                EligibleMembers: eligibleMembers,
                CanTransfer: eligibleMembers.Any(m => m.IsEligible)
            ));
        }

        return result;
    }

    public async Task ManageGroupsBeforeDeletionAsync(int userId, List<GroupActionRequest> groupActions)
    {
        // Validate all actions before storing
        foreach (var action in groupActions)
        {
            var group = await _context.Groups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == action.GroupId && g.CreatedById == userId && !g.IsDeleted);

            if (group == null)
            {
                throw new InvalidOperationException($"Group {action.GroupId} not found or you don't own it");
            }

            if (action.Action == "transfer")
            {
                if (!action.TransferToUserId.HasValue)
                {
                    throw new InvalidOperationException($"Transfer requires a target user ID for group {action.GroupId}");
                }

                // Verify the target user is a member of the group
                var targetMember = group.Members.FirstOrDefault(m => m.UserId == action.TransferToUserId.Value);
                if (targetMember == null)
                {
                    throw new InvalidOperationException($"User {action.TransferToUserId} is not a member of group {action.GroupId}");
                }

                // Verify the target user is active (not deleted or deactivated)
                var targetUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == action.TransferToUserId.Value);

                if (targetUser == null || targetUser.IsDeleted || targetUser.IsDeactivated)
                {
                    throw new InvalidOperationException($"User {action.TransferToUserId} is not eligible to receive group ownership (deleted or deactivated)");
                }
            }
            else if (action.Action != "delete")
            {
                throw new InvalidOperationException($"Invalid action: {action.Action}");
            }
        }

        // Store actions as JSON to be executed later (after 30 days or when background job runs)
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.PendingGroupActions = JsonSerializer.Serialize(groupActions);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task ExecutePendingGroupActionsAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.PendingGroupActions))
        {
            return;
        }

        // Deserialize the stored actions
        var groupActions = JsonSerializer.Deserialize<List<GroupActionRequest>>(user.PendingGroupActions);
        if (groupActions == null || groupActions.Count == 0)
        {
            return;
        }

        // Execute each action
        foreach (var action in groupActions)
        {
            var group = await _context.Groups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == action.GroupId && !g.IsDeleted);

            if (group == null)
            {
                continue; // Group was already deleted or doesn't exist
            }

            if (action.Action == "delete")
            {
                // Soft delete the group
                group.IsDeleted = true;
                group.DeletedAt = DateTime.UtcNow;
                group.UpdatedAt = DateTime.UtcNow;
            }
            else if (action.Action == "transfer")
            {
                if (!action.TransferToUserId.HasValue)
                {
                    continue;
                }

                // Verify the target user is still a member
                var targetMember = group.Members.FirstOrDefault(m => m.UserId == action.TransferToUserId.Value);
                if (targetMember == null)
                {
                    // Target member left the group, delete it instead
                    group.IsDeleted = true;
                    group.DeletedAt = DateTime.UtcNow;
                    group.UpdatedAt = DateTime.UtcNow;
                    continue;
                }

                // Verify the target user is still active (not deleted or deactivated)
                var targetUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == action.TransferToUserId.Value);

                if (targetUser == null || targetUser.IsDeleted || targetUser.IsDeactivated)
                {
                    // Target user is no longer active, delete the group instead
                    _logger.LogWarning(
                        "Cannot transfer group {GroupId} to user {UserId} - user is deleted or deactivated. Deleting group instead.",
                        group.Id,
                        action.TransferToUserId.Value);
                    group.IsDeleted = true;
                    group.DeletedAt = DateTime.UtcNow;
                    group.UpdatedAt = DateTime.UtcNow;
                    continue;
                }

                // Transfer ownership
                group.CreatedById = action.TransferToUserId.Value;
                group.UpdatedAt = DateTime.UtcNow;

                // Update the new owner's role to Creator
                targetMember.Role = GroupRole.Creator;

                // Remove the old creator from the group members
                var oldCreator = group.Members.FirstOrDefault(m => m.UserId == userId);
                if (oldCreator != null)
                {
                    _context.GroupMembers.Remove(oldCreator);
                }
            }
        }

        // Clear the pending actions
        user.PendingGroupActions = null;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeactivateAccountAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return false;
        }

        user.IsDeactivated = true;
        user.DeactivatedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ReactivateAccountAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return false;
        }

        user.IsDeactivated = false;
        user.DeactivatedAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        // If they were scheduled for deletion, cancel it
        user.IsDeleted = false;
        user.DeletedAt = null;

        // Clear any pending group actions (groups are safe, nothing happens to them)
        user.PendingGroupActions = null;

        await _context.SaveChangesAsync();

        return true;
    }
}
