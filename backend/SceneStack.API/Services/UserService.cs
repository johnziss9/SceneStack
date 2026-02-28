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

    public UserService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
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

        // Soft delete the domain user
        var domainUser = await _context.Users.FindAsync(userId);
        if (domainUser != null)
        {
            domainUser.IsDeleted = true;
            domainUser.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // Delete the ApplicationUser (hard delete from Identity)
        var result = await _userManager.DeleteAsync(authUser);

        return result.Succeeded;
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
}
