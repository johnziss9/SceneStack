using Microsoft.EntityFrameworkCore;
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

    public WatchlistService(
        ApplicationDbContext context,
        IMovieService movieService,
        ILogger<WatchlistService> logger)
    {
        _context = context;
        _movieService = movieService;
        _logger = logger;
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

        return (await _context.WatchlistItems
            .Include(wi => wi.Movie)
            .FirstOrDefaultAsync(wi => wi.Id == item.Id))!;
    }

    public async Task<bool> RemoveFromWatchlistAsync(int userId, int movieId)
    {
        var item = await _context.WatchlistItems
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movieId);

        if (item == null)
            return false;

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

        if (request.Notes != null)
            item.Notes = request.Notes;

        if (request.Priority.HasValue)
            item.Priority = request.Priority.Value;

        await _context.SaveChangesAsync();
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
