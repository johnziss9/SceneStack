using Microsoft.EntityFrameworkCore;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class WatchlistService : IWatchlistService
{
    private const int FreeTierLimit = 50;

    private readonly ApplicationDbContext _context;
    private readonly IMovieService _movieService;
    private readonly ILogger<WatchlistService> _logger;
    private readonly IAuditService _auditService;

    public WatchlistService(
        ApplicationDbContext context,
        IMovieService movieService,
        ILogger<WatchlistService> logger,
        IAuditService auditService)
    {
        _context = context;
        _movieService = movieService;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task<PaginatedWatchlistResponse> GetWatchlistAsync(int userId, int page = 1, int pageSize = 20, string sortBy = "priority-asc")
    {
        var baseQuery = _context.WatchlistItems
            .Include(wi => wi.Movie)
            .Where(wi => wi.UserId == userId);

        // priority-asc: 1, 2, 3... (highest priority first)
        // priority-desc: N...3, 2, 1 (lowest priority first)
        // recent: by AddedAt desc (ignore priority)
        var query = sortBy switch
        {
            "priority-asc" => baseQuery.OrderBy(wi => wi.Priority),
            "priority-desc" => baseQuery.OrderByDescending(wi => wi.Priority),
            "recent" => baseQuery.OrderByDescending(wi => wi.AddedAt),
            _ => baseQuery.OrderBy(wi => wi.Priority) // Default to priority-asc
        };

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedWatchlistResponse
        {
            Items = items.Select(ToResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages,
            HasMore = page < totalPages
        };
    }

    public async Task<WatchlistItem> AddToWatchlistAsync(int userId, int tmdbId, string? notes, int priority)
    {
        var movie = await _movieService.GetOrCreateFromTmdbAsync(tmdbId);
        if (movie == null)
            throw new InvalidOperationException($"Failed to retrieve movie with TMDb ID {tmdbId}");

        // Calculate the next priority (add to bottom of list)
        var maxPriority = await _context.WatchlistItems
            .Where(wi => wi.UserId == userId)
            .MaxAsync(wi => (int?)wi.Priority) ?? 0;

        var nextPriority = maxPriority + 1;

        // Check for a previously soft-deleted entry and restore it rather than inserting a duplicate
        var existing = await _context.WatchlistItems
            .IgnoreQueryFilters()
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movie.Id);

        if (existing != null)
        {
            if (!existing.IsDeleted)
                throw new InvalidOperationException("DUPLICATE"); // already on watchlist — controller handles as 409

            existing.IsDeleted = false;
            existing.DeletedAt = null;
            existing.Notes = notes;
            existing.Priority = nextPriority;
            existing.AddedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Audit log: Watchlist item re-added
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = userId,
                Category = AuditEventCategory.Watchlist,
                EventType = AuditEvents.WatchlistItemAdded,
                Action = "Create",
                Success = true,
                EntityType = "WatchlistItem",
                EntityId = existing.Id.ToString(),
                NewValues = new
                {
                    existing.Id,
                    existing.MovieId,
                    MovieTitle = existing.Movie.Title,
                    existing.Priority,
                    HasNotes = !string.IsNullOrEmpty(notes)
                },
                AdditionalData = new Dictionary<string, object>
                {
                    { "MovieId", existing.MovieId },
                    { "MovieTitle", existing.Movie.Title },
                    { "Priority", existing.Priority },
                    { "IsRestore", true }
                }
            });

            return existing;
        }

        var item = new WatchlistItem
        {
            UserId = userId,
            MovieId = movie.Id,
            Notes = notes,
            Priority = nextPriority,
            AddedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.WatchlistItems.Add(item);
        await _context.SaveChangesAsync();

        var reloadedItem = (await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.Id == item.Id))!;

        // Audit log: Watchlist item added
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = AuditEventCategory.Watchlist,
            EventType = AuditEvents.WatchlistItemAdded,
            Action = "Create",
            Success = true,
            EntityType = "WatchlistItem",
            EntityId = item.Id.ToString(),
            NewValues = new
            {
                item.Id,
                item.MovieId,
                MovieTitle = reloadedItem.Movie.Title,
                item.Priority,
                HasNotes = !string.IsNullOrEmpty(notes)
            },
            AdditionalData = new Dictionary<string, object>
            {
                { "MovieId", item.MovieId },
                { "MovieTitle", reloadedItem.Movie.Title },
                { "Priority", item.Priority },
                { "TmdbId", tmdbId }
            }
        });

        return reloadedItem;
    }

    public async Task<bool> RemoveFromWatchlistAsync(int userId, int movieId)
    {
        var item = await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movieId);

        if (item == null)
            return false;

        // Capture data before deletion
        var itemData = new
        {
            item.Id,
            item.MovieId,
            MovieTitle = item.Movie.Title,
            item.Priority,
            HasNotes = !string.IsNullOrEmpty(item.Notes)
        };

        // Soft delete the item
        item.IsDeleted = true;
        item.DeletedAt = DateTime.UtcNow;

        // IMPORTANT: Save the deletion FIRST so the database query excludes it
        await _context.SaveChangesAsync();

        // Renumber all remaining items to have sequential priorities
        var remainingItems = await _context.WatchlistItems
            .Where(wi => wi.UserId == userId && !wi.IsDeleted)
            .OrderBy(wi => wi.Priority)
            .ToListAsync();

        for (int i = 0; i < remainingItems.Count; i++)
        {
            remainingItems[i].Priority = i + 1;
        }

        await _context.SaveChangesAsync();

        // Audit log: Watchlist item removed
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = AuditEventCategory.Watchlist,
            EventType = AuditEvents.WatchlistItemRemoved,
            Action = "Delete",
            Success = true,
            EntityType = "WatchlistItem",
            EntityId = item.Id.ToString(),
            OldValues = itemData,
            AdditionalData = new Dictionary<string, object>
            {
                { "MovieId", movieId },
                { "MovieTitle", item.Movie.Title },
                { "OldPriority", itemData.Priority },
                { "RemainingCount", remainingItems.Count }
            }
        });

        return true;
    }

    public async Task<bool> IsOnWatchlistAsync(int userId, int movieId)
    {
        return await _context.WatchlistItems
            .AnyAsync(wi => wi.UserId == userId && wi.MovieId == movieId);
    }

    public async Task<WatchlistItem?> UpdateWatchlistItemAsync(int userId, int movieId, UpdateWatchlistItemRequest request)
    {
        var item = await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movieId);

        if (item == null)
            return null;

        // Capture before state
        var oldValues = new
        {
            item.Notes,
            item.Priority
        };

        var changes = new Dictionary<string, object>();

        if (request.Notes != null && item.Notes != request.Notes)
        {
            changes["Notes"] = new { Old = item.Notes != null, New = request.Notes != null };
            item.Notes = request.Notes;
        }

        if (request.Priority.HasValue && item.Priority != request.Priority.Value)
        {
            changes["Priority"] = new { Old = item.Priority, New = request.Priority.Value };
            item.Priority = request.Priority.Value;
        }

        await _context.SaveChangesAsync();

        // Audit log: Watchlist item updated (only if changes were made)
        if (changes.Any())
        {
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = userId,
                Category = AuditEventCategory.Watchlist,
                EventType = AuditEvents.WatchlistItemUpdated,
                Action = "Update",
                Success = true,
                EntityType = "WatchlistItem",
                EntityId = item.Id.ToString(),
                OldValues = oldValues,
                NewValues = new
                {
                    item.Notes,
                    item.Priority
                },
                AdditionalData = new Dictionary<string, object>
                {
                    { "MovieId", movieId },
                    { "MovieTitle", item.Movie.Title },
                    { "ChangedFields", changes.Keys.ToList() },
                    { "FieldChanges", changes }
                }
            });
        }

        return item;
    }

    public async Task<WatchlistItemResponse?> ReorderWatchlistItemAsync(int userId, int movieId, int newPriority)
    {
        var item = await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movieId);

        if (item == null)
            return null;

        var oldPriority = item.Priority;

        if (oldPriority == newPriority)
            return ToResponse(item); // No change needed

        // Get all user's watchlist items ordered by current priority
        var allItems = await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .Where(wi => wi.UserId == userId)
            .OrderBy(wi => wi.Priority)
            .ToListAsync();

        // Remove item from old position
        allItems.Remove(item);

        // Ensure newPriority is within valid range
        if (newPriority < 1)
            newPriority = 1;
        if (newPriority > allItems.Count + 1)
            newPriority = allItems.Count + 1;

        // Insert at new position (1-based index)
        allItems.Insert(newPriority - 1, item);

        // Renumber all items sequentially
        for (int i = 0; i < allItems.Count; i++)
        {
            allItems[i].Priority = i + 1;
        }

        await _context.SaveChangesAsync();

        // Audit log: Priority changed
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Category = AuditEventCategory.Watchlist,
            EventType = AuditEvents.WatchlistItemPriorityChanged,
            Action = "Update",
            Success = true,
            EntityType = "WatchlistItem",
            EntityId = item.Id.ToString(),
            OldValues = new { Priority = oldPriority },
            NewValues = new { Priority = newPriority },
            AdditionalData = new Dictionary<string, object>
            {
                { "MovieId", movieId },
                { "MovieTitle", item.Movie.Title },
                { "OldPriority", oldPriority },
                { "NewPriority", newPriority },
                { "TotalItems", allItems.Count }
            }
        });

        return ToResponse(item);
    }

    public async Task<int> GetWatchlistCountAsync(int userId)
    {
        return await _context.WatchlistItems
            .CountAsync(wi => wi.UserId == userId);
    }

    public async Task<bool> CanAddToWatchlistAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        if (user.IsPremium)
            return true;

        var count = await GetWatchlistCountAsync(userId);
        return count < FreeTierLimit;
    }

    private static WatchlistItemResponse ToResponse(WatchlistItem item) =>
        new()
        {
            Id = item.Id,
            MovieId = item.MovieId,
            Movie = new MovieBasicInfo
            {
                Id = item.Movie.Id,
                TmdbId = item.Movie.TmdbId,
                Title = item.Movie.Title,
                Year = item.Movie.Year,
                PosterPath = item.Movie.PosterPath,
                Synopsis = item.Movie.Synopsis,
                AiSynopsis = item.Movie.AiSynopsis
            },
            Notes = item.Notes,
            Priority = item.Priority,
            AddedAt = item.AddedAt
        };
}
