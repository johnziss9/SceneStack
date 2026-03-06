using Microsoft.EntityFrameworkCore;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class WatchService : IWatchService
{
    private readonly ApplicationDbContext _context;
    private readonly IMovieService _movieService;
    private readonly ILogger<WatchService> _logger;
    private readonly IAuditService _auditService;

    public WatchService(ApplicationDbContext context, IMovieService movieService, ILogger<WatchService> logger, IAuditService auditService)
    {
        _context = context;
        _movieService = movieService;
        _logger = logger;
        _auditService = auditService;
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
                .ThenInclude(m => m.MovieGroups)
            .Include(w => w.User)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(w => w.UserId == userId.Value);
        }

        if (groupId.HasValue)
        {
            query = query.Where(w => w.Movie.MovieGroups.Any(mg => mg.GroupId == groupId.Value));
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
            watchesQuery = watchesQuery.Where(w => w.Movie.MovieGroups.Any(mg => mg.GroupId == request.GroupId.Value));

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
                .ThenInclude(m => m.MovieGroups)
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
                        AiSynopsis = g.First().Movie.AiSynopsis,
                        IsPrivate = g.First().Movie.IsPrivate,
                        GroupIds = g.First().Movie.MovieGroups.Select(mg => mg.GroupId).ToList()
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
                        Movie = new MovieBasicInfo
                        {
                            Id = w.Movie.Id,
                            TmdbId = w.Movie.TmdbId,
                            Title = w.Movie.Title,
                            Year = w.Movie.Year,
                            PosterPath = w.Movie.PosterPath,
                            Synopsis = w.Movie.Synopsis,
                            AiSynopsis = w.Movie.AiSynopsis,
                            IsPrivate = w.Movie.IsPrivate,
                            GroupIds = w.Movie.MovieGroups.Select(mg => mg.GroupId).ToList()
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
                .ThenInclude(m => m.MovieGroups)
            .Include(w => w.User)
            .Where(w => w.MovieId == movieId && w.UserId == userId)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();
    }

    public async Task<Watch> CreateAsync(Watch watch, bool? isPrivate, List<int>? groupIds)
    {
        watch.CreatedAt = DateTime.UtcNow;
        _context.Watches.Add(watch);
        await _context.SaveChangesAsync();

        // Check if this is the first watch of this movie by this user
        var isFirstWatch = !await _context.Watches
            .AnyAsync(w => w.UserId == watch.UserId && w.MovieId == watch.MovieId && w.Id != watch.Id);

        // If first watch and privacy settings provided, set movie-level privacy
        if (isFirstWatch && isPrivate.HasValue)
        {
            var validGroupIds = new List<int>();

            // Verify user is member of all specified groups before setting privacy
            if (groupIds != null && groupIds.Any())
            {
                foreach (var groupId in groupIds)
                {
                    var isMember = await _context.GroupMembers
                        .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == watch.UserId);

                    if (isMember)
                    {
                        validGroupIds.Add(groupId);

                        // Update group's updatedAt timestamp for "Last Updated" sorting
                        var group = await _context.Groups.FindAsync(groupId);
                        if (group != null)
                        {
                            group.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        _logger.LogWarning("User {UserId} attempted to share movie with group {GroupId} but is not a member", watch.UserId, groupId);
                    }
                }

                await _context.SaveChangesAsync();
            }

            // Set movie privacy
            await _movieService.SetPrivacyAsync(watch.MovieId, watch.UserId, isPrivate.Value, validGroupIds);
        }

        // Audit log: Watch created
        var reloadedWatch = (await GetByIdAsync(watch.Id))!;
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = watch.UserId,
            Category = AuditEventCategory.Watch,
            EventType = AuditEvents.WatchCreated,
            Action = "Create",
            Success = true,
            EntityType = "Watch",
            EntityId = watch.Id.ToString(),
            NewValues = new
            {
                watch.Id,
                watch.MovieId,
                MovieTitle = reloadedWatch.Movie.Title,
                watch.WatchedDate,
                watch.Rating,
                watch.IsRewatch
            },
            AdditionalData = new Dictionary<string, object>
            {
                { "MovieId", watch.MovieId },
                { "MovieTitle", reloadedWatch.Movie.Title },
                { "WatchedDate", watch.WatchedDate },
                { "HasRating", watch.Rating.HasValue },
                { "IsRewatch", watch.IsRewatch },
                { "IsFirstWatch", isFirstWatch },
                { "PrivacySet", isPrivate.HasValue },
                { "GroupsShared", groupIds?.Count ?? 0 }
            }
        });

        // Reload with navigation properties
        return reloadedWatch;
    }

    public async Task<Watch?> UpdateAsync(int id, Watch watch)
    {
        var existingWatch = await _context.Watches
            .Include(w => w.Movie)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (existingWatch == null)
            return null;

        // Capture before state
        var oldValues = new
        {
            existingWatch.WatchedDate,
            existingWatch.Rating,
            existingWatch.Notes,
            existingWatch.WatchLocation,
            existingWatch.WatchedWith,
            existingWatch.IsRewatch
        };

        var changes = new Dictionary<string, object>();

        if (existingWatch.WatchedDate != watch.WatchedDate)
            changes["WatchedDate"] = new { Old = existingWatch.WatchedDate, New = watch.WatchedDate };

        if (existingWatch.Rating != watch.Rating)
            changes["Rating"] = new { Old = existingWatch.Rating, New = watch.Rating };

        if (existingWatch.Notes != watch.Notes)
            changes["Notes"] = new { Old = existingWatch.Notes != null, New = watch.Notes != null };

        if (existingWatch.WatchLocation != watch.WatchLocation)
            changes["WatchLocation"] = new { Old = existingWatch.WatchLocation, New = watch.WatchLocation };

        if (existingWatch.WatchedWith != watch.WatchedWith)
            changes["WatchedWith"] = new { Old = existingWatch.WatchedWith, New = watch.WatchedWith };

        if (existingWatch.IsRewatch != watch.IsRewatch)
            changes["IsRewatch"] = new { Old = existingWatch.IsRewatch, New = watch.IsRewatch };

        existingWatch.WatchedDate = watch.WatchedDate;
        existingWatch.Rating = watch.Rating;
        existingWatch.Notes = watch.Notes;
        existingWatch.WatchLocation = watch.WatchLocation;
        existingWatch.WatchedWith = watch.WatchedWith;
        existingWatch.IsRewatch = watch.IsRewatch;

        await _context.SaveChangesAsync();

        // Audit log: Watch updated (only if changes were made)
        if (changes.Any())
        {
            await _auditService.LogAsync(new AuditLogEntry
            {
                UserId = existingWatch.UserId,
                Category = AuditEventCategory.Watch,
                EventType = AuditEvents.WatchUpdated,
                Action = "Update",
                Success = true,
                EntityType = "Watch",
                EntityId = id.ToString(),
                OldValues = oldValues,
                NewValues = new
                {
                    existingWatch.WatchedDate,
                    existingWatch.Rating,
                    existingWatch.Notes,
                    existingWatch.WatchLocation,
                    existingWatch.WatchedWith,
                    existingWatch.IsRewatch
                },
                AdditionalData = new Dictionary<string, object>
                {
                    { "WatchId", id },
                    { "MovieId", existingWatch.MovieId },
                    { "MovieTitle", existingWatch.Movie.Title },
                    { "ChangedFields", changes.Keys.ToList() },
                    { "FieldChanges", changes }
                }
            });
        }

        // Reload with navigation properties
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var watch = await _context.Watches
            .IgnoreQueryFilters()
            .Include(w => w.Movie)
            .FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted);

        if (watch == null)
            return false;

        // Capture data before deletion
        var watchData = new
        {
            watch.Id,
            watch.MovieId,
            MovieTitle = watch.Movie.Title,
            watch.WatchedDate,
            watch.Rating,
            watch.IsRewatch
        };

        watch.IsDeleted = true;
        watch.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Audit log: Watch deleted
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = watch.UserId,
            Category = AuditEventCategory.Watch,
            EventType = AuditEvents.WatchDeleted,
            Action = "Delete",
            Success = true,
            EntityType = "Watch",
            EntityId = id.ToString(),
            OldValues = watchData,
            AdditionalData = new Dictionary<string, object>
            {
                { "WatchId", id },
                { "MovieId", watch.MovieId },
                { "MovieTitle", watch.Movie.Title },
                { "WatchedDate", watch.WatchedDate },
                { "HadRating", watch.Rating.HasValue }
            }
        });

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

        // Get all movies shared with this group via MovieGroups
        var watches = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.Movie)
            .Include(w => w.User)
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