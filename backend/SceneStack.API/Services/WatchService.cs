using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class WatchService : IWatchService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<WatchService> _logger;

    public WatchService(ApplicationDbContext context, ILogger<WatchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Watch?> GetByIdAsync(int id)
    {
        return await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);
    }

    public async Task<IEnumerable<Watch>> GetAllAsync(int? userId = null, int? groupId = null)
    {
        var query = _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Include(w => w.WatchGroups)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(w => w.UserId == userId.Value);
        }

        if (groupId.HasValue)
        {
            query = query.Where(w => w.WatchGroups.Any(wg => wg.GroupId == groupId.Value));
        }

        return await query
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();
    }

    public async Task<PaginatedGroupedWatchesResponse> GetGroupedWatchesAsync(GetGroupedWatchesRequest request)
    {
        // Step 1: Build a server-side filtered + grouped + sorted query.
        // All filters are pushed to the DB to support accurate server-side pagination.
        var watchesQuery = _context.Watches
            .Where(w => w.UserId == request.UserId)
            .AsQueryable();

        // Watch-level pre-group filters
        if (!string.IsNullOrWhiteSpace(request.Search))
            watchesQuery = watchesQuery.Where(w => EF.Functions.ILike(w.Movie.Title, $"%{request.Search}%"));

        if (request.GroupId.HasValue)
            watchesQuery = watchesQuery.Where(w => w.WatchGroups.Any(wg => wg.GroupId == request.GroupId.Value));

        if (request.WatchedFrom.HasValue)
            watchesQuery = watchesQuery.Where(w => w.WatchedDate >= request.WatchedFrom.Value);

        if (request.WatchedTo.HasValue)
            watchesQuery = watchesQuery.Where(w => w.WatchedDate <= request.WatchedTo.Value);

        // Group by movie and compute per-movie aggregates
        var slimQuery = watchesQuery
            .GroupBy(w => new { w.MovieId, MovieTitle = w.Movie.Title })
            .Select(g => new SlimGroup
            {
                MovieId = g.Key.MovieId,
                MovieTitle = g.Key.MovieTitle,
                MaxWatchDate = g.Max(w => w.WatchedDate),
                AvgRating = g.Where(w => w.Rating != null).Average(w => (double?)w.Rating),
                WatchCount = g.Count(),
                HasRewatch = g.Any(w => w.IsRewatch)
            })
            .AsQueryable();

        // Post-group filters
        if (request.RewatchOnly == true)
            slimQuery = slimQuery.Where(g => g.HasRewatch);

        if (request.UnratedOnly == true)
            slimQuery = slimQuery.Where(g => g.AvgRating == null);

        if (request.RatingMin.HasValue)
            slimQuery = slimQuery.Where(g => g.AvgRating >= request.RatingMin.Value);

        if (request.RatingMax.HasValue)
            slimQuery = slimQuery.Where(g => g.AvgRating <= request.RatingMax.Value);

        // Sort
        IQueryable<SlimGroup> orderedQuery = request.SortBy switch
        {
            "title"        => slimQuery.OrderBy(g => g.MovieTitle),
            "highestRated" => slimQuery.OrderByDescending(g => g.AvgRating).ThenByDescending(g => g.MaxWatchDate),
            "mostWatched"  => slimQuery.OrderByDescending(g => g.WatchCount).ThenByDescending(g => g.MaxWatchDate),
            _              => slimQuery.OrderByDescending(g => g.MaxWatchDate)
        };

        var totalCount = await orderedQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        var pagedSlim = await orderedQuery
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        if (!pagedSlim.Any())
        {
            return new PaginatedGroupedWatchesResponse
            {
                Items = new List<GroupedWatchesResponse>(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = totalPages,
                HasMore = false
            };
        }

        var pagedMovieIds = pagedSlim.Select(g => g.MovieId).ToList();

        // Step 2: Fetch full watch + movie data only for the paged movie IDs
        var watches = await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.WatchGroups)
            .Where(w => w.UserId == request.UserId && pagedMovieIds.Contains(w.MovieId))
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();

        // Group in memory (page-sized data only) preserving the DB sort order
        var grouped = pagedSlim
            .Select(slim =>
            {
                var g = watches.Where(w => w.MovieId == slim.MovieId).ToList();
                return new GroupedWatchesResponse
                {
                    MovieId = slim.MovieId,
                    Movie = new MovieBasicInfo
                    {
                        Id = g.First().Movie.Id,
                        TmdbId = g.First().Movie.TmdbId,
                        Title = g.First().Movie.Title,
                        Year = g.First().Movie.Year,
                        PosterPath = g.First().Movie.PosterPath,
                        Synopsis = g.First().Movie.Synopsis,
                        AiSynopsis = g.First().Movie.AiSynopsis
                    },
                    WatchCount = g.Count,
                    AverageRating = g.Any(w => w.Rating.HasValue)
                        ? Math.Round(g.Where(w => w.Rating.HasValue).Average(w => w.Rating!.Value), 1)
                        : null,
                    LatestRating = g.OrderByDescending(w => w.WatchedDate).FirstOrDefault()?.Rating,
                    Watches = g.Select(w => new WatchEntryResponse
                    {
                        Id = w.Id,
                        MovieId = w.MovieId,
                        WatchedDate = w.WatchedDate,
                        Rating = w.Rating,
                        Notes = w.Notes,
                        WatchLocation = w.WatchLocation,
                        WatchedWith = w.WatchedWith,
                        IsRewatch = w.IsRewatch,
                        IsPrivate = w.IsPrivate,
                        GroupIds = w.WatchGroups?.Select(wg => wg.GroupId).ToList() ?? new List<int>(),
                        Movie = new MovieBasicInfo
                        {
                            Id = w.Movie.Id,
                            TmdbId = w.Movie.TmdbId,
                            Title = w.Movie.Title,
                            Year = w.Movie.Year,
                            PosterPath = w.Movie.PosterPath,
                            Synopsis = w.Movie.Synopsis,
                            AiSynopsis = w.Movie.AiSynopsis
                        }
                    }).OrderByDescending(w => w.WatchedDate).ToList()
                };
            })
            .ToList();

        return new PaginatedGroupedWatchesResponse
        {
            Items = grouped,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = totalPages,
            HasMore = request.Page < totalPages
        };
    }

    public async Task<List<Watch>> GetByMovieIdAsync(int movieId, int userId)
    {
        return await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Where(w => w.MovieId == movieId && w.UserId == userId)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();
    }

    public async Task<Watch> CreateAsync(Watch watch, List<int> groupIds)
    {
        watch.CreatedAt = DateTime.UtcNow;
        _context.Watches.Add(watch);
        await _context.SaveChangesAsync();

        // Associate watch with groups
        if (groupIds != null && groupIds.Any())
        {
            foreach (var groupId in groupIds)
            {
                // Verify user is a member of the group
                var isMember = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == watch.UserId);

                if (isMember)
                {
                    var watchGroup = new WatchGroup
                    {
                        WatchId = watch.Id,
                        GroupId = groupId,
                        SharedAt = DateTime.UtcNow
                    };
                    _context.WatchGroups.Add(watchGroup);
                }
                else
                {
                    _logger.LogWarning("User {UserId} attempted to share watch with group {GroupId} but is not a member", watch.UserId, groupId);
                }
            }

            await _context.SaveChangesAsync();
        }

        // Reload with navigation properties
        return (await GetByIdAsync(watch.Id))!;
    }

    public async Task<Watch?> UpdateAsync(int id, Watch watch, List<int>? groupIds = null)
    {
        var existingWatch = await _context.Watches
            .Include(w => w.WatchGroups)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (existingWatch == null)
            return null;

        existingWatch.WatchedDate = watch.WatchedDate;
        existingWatch.Rating = watch.Rating;
        existingWatch.Notes = watch.Notes;
        existingWatch.WatchLocation = watch.WatchLocation;
        existingWatch.WatchedWith = watch.WatchedWith;
        existingWatch.IsRewatch = watch.IsRewatch;
        existingWatch.IsPrivate = watch.IsPrivate;

        // Update group associations if provided
        if (groupIds != null)
        {
            // Remove existing group associations
            var existingWatchGroups = existingWatch.WatchGroups.ToList();
            _context.WatchGroups.RemoveRange(existingWatchGroups);

            // Add new group associations
            foreach (var groupId in groupIds)
            {
                // Verify user is a member of the group
                var isMember = await _context.GroupMembers
                    .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == existingWatch.UserId);

                if (isMember)
                {
                    var watchGroup = new WatchGroup
                    {
                        WatchId = existingWatch.Id,
                        GroupId = groupId,
                        SharedAt = DateTime.UtcNow
                    };
                    _context.WatchGroups.Add(watchGroup);
                }
            }
        }

        await _context.SaveChangesAsync();

        // Reload with navigation properties
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var watch = await _context.Watches
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted);

        if (watch == null)
            return false;

        watch.IsDeleted = true;
        watch.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<Watch>> GetGroupFeedAsync(int groupId, int requestingUserId)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to access group feed for group {GroupId} without membership", requestingUserId, groupId);
            return new List<Watch>();
        }

        // Get all watches shared with this group
        var watches = await _context.WatchGroups
            .Where(wg => wg.GroupId == groupId)
            .Include(wg => wg.Watch)
                .ThenInclude(w => w.Movie)
            .Include(wg => wg.Watch)
                .ThenInclude(w => w.User)
            .Select(wg => wg.Watch)
            .Where(w => !w.IsPrivate) // Exclude private watches
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();

        // Apply privacy filters
        var filteredWatches = new List<Watch>();
        foreach (var watch in watches)
        {
            // User can always see their own watches
            if (watch.UserId == requestingUserId)
            {
                filteredWatches.Add(watch);
                continue;
            }

            // Check owner's privacy settings
            if (!watch.User.ShareWatches)
                continue;

            // Filter rating if not shared
            if (!watch.User.ShareRatings)
                watch.Rating = null;

            // Filter notes if not shared
            if (!watch.User.ShareNotes)
                watch.Notes = null;

            filteredWatches.Add(watch);
        }

        return filteredWatches;
    }

    public async Task<BulkUpdateResult> BulkUpdateAsync(
        int userId,
        List<int> watchIds,
        bool isPrivate,
        List<int>? groupIds,
        string groupOperation)
    {
        var result = new BulkUpdateResult
        {
            Success = true,
            Updated = 0,
            Failed = 0,
            Errors = new List<string>()
        };

        // Validate group operation
        if (groupOperation != "add" && groupOperation != "replace")
        {
            result.Success = false;
            result.Errors.Add("Invalid groupOperation. Must be 'add' or 'replace'.");
            return result;
        }

        // Start transaction for atomic operation
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Get all watches and verify ownership
            var watches = await _context.Watches
                .Include(w => w.WatchGroups)
                .Where(w => watchIds.Contains(w.Id))
                .ToListAsync();

            // Check if all watches exist and belong to user
            var foundIds = watches.Select(w => w.Id).ToList();
            var missingIds = watchIds.Except(foundIds).ToList();
            
            if (missingIds.Any())
            {
                result.Errors.Add($"Watches not found: {string.Join(", ", missingIds)}");
            }

            var unauthorizedWatches = watches.Where(w => w.UserId != userId).ToList();
            if (unauthorizedWatches.Any())
            {
                var unauthorizedIds = unauthorizedWatches.Select(w => w.Id);
                result.Errors.Add($"Unauthorized access to watches: {string.Join(", ", unauthorizedIds)}");
                result.Failed = unauthorizedWatches.Count;
            }

            // Get authorized watches only
            var authorizedWatches = watches.Where(w => w.UserId == userId).ToList();

            // Verify user is member of all specified groups
            if (groupIds != null && groupIds.Any())
            {
                var userGroupIds = await _context.GroupMembers
                    .Where(gm => gm.UserId == userId)
                    .Select(gm => gm.GroupId)
                    .ToListAsync();

                var invalidGroupIds = groupIds.Except(userGroupIds).ToList();
                if (invalidGroupIds.Any())
                {
                    result.Success = false;
                    result.Errors.Add($"User is not a member of groups: {string.Join(", ", invalidGroupIds)}");
                    await transaction.RollbackAsync();
                    return result;
                }
            }

            // Update each watch
            foreach (var watch in authorizedWatches)
            {
                try
                {
                    // Update privacy
                    watch.IsPrivate = isPrivate;

                    // Update group associations
                    if (groupOperation == "replace")
                    {
                        // Remove all existing group associations
                        var existingWatchGroups = watch.WatchGroups.ToList();
                        _context.WatchGroups.RemoveRange(existingWatchGroups);
                    }
                    // For "add" operation, keep existing associations

                    // Add new group associations (if not private)
                    if (!isPrivate && groupIds != null && groupIds.Any())
                    {
                        foreach (var groupId in groupIds)
                        {
                            // For "add" operation, check if association already exists
                            if (groupOperation == "add")
                            {
                                var exists = watch.WatchGroups.Any(wg => wg.GroupId == groupId);
                                if (exists)
                                    continue; // Skip if already associated
                            }

                            var watchGroup = new WatchGroup
                            {
                                WatchId = watch.Id,
                                GroupId = groupId,
                                SharedAt = DateTime.UtcNow
                            };
                            _context.WatchGroups.Add(watchGroup);
                        }
                    }
                    else if (isPrivate)
                    {
                        // If making private, remove all group associations
                        var allWatchGroups = watch.WatchGroups.ToList();
                        _context.WatchGroups.RemoveRange(allWatchGroups);
                    }

                    result.Updated++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating watch {WatchId}", watch.Id);
                    result.Failed++;
                    result.Errors.Add($"Failed to update watch {watch.Id}: {ex.Message}");
                }
            }

            // Save all changes
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            result.Success = result.Failed == 0;
            return result;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error in bulk update operation");
            result.Success = false;
            result.Errors.Add($"Bulk update failed: {ex.Message}");
            return result;
        }
    }
}

// Private projection type used by GetGroupedWatchesAsync
file record SlimGroup
{
    public int MovieId { get; init; }
    public string MovieTitle { get; init; } = "";
    public DateTime MaxWatchDate { get; init; }
    public double? AvgRating { get; init; }
    public int WatchCount { get; init; }
    public bool HasRewatch { get; init; }
}