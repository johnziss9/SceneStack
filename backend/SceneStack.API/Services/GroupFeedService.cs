using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Mappers;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class GroupFeedService : IGroupFeedService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GroupFeedService> _logger;

    public GroupFeedService(ApplicationDbContext context, ILogger<GroupFeedService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<GroupFeedItemResponse>> GetGroupFeedAsync(int groupId, int requestingUserId, int skip = 0, int take = 20)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to access feed for group {GroupId} without membership", requestingUserId, groupId);
            throw new UnauthorizedAccessException("You must be a member of this group to view its feed");
        }

        // Get watches for movies shared with this group
        var watches = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.Movie)
            .Include(w => w.User)
            .OrderByDescending(w => w.WatchedDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // Apply privacy filters
        var filteredWatches = ApplyPrivacyFilters(watches, requestingUserId);

        // Map to GroupFeedItemResponse
        return filteredWatches.Select(w => new GroupFeedItemResponse
        {
            Id = w.Id,
            UserId = w.UserId,
            Username = w.User.Username,
            IsDeactivated = w.User.IsDeactivated,
            MovieId = w.MovieId,
            TmdbId = w.Movie.TmdbId,
            MovieTitle = w.Movie.Title,
            PosterPath = w.Movie.PosterPath,
            WatchedDate = w.WatchedDate,
            Rating = w.Rating,
            Notes = w.Notes,
            WatchLocation = w.WatchLocation,
            WatchedWith = w.WatchedWith,
            IsRewatch = w.IsRewatch
        }).ToList();
    }

    public async Task<PaginatedGroupFeedResponse> GetPaginatedGroupFeedAsync(int groupId, int requestingUserId, int skip = 0, int take = 20)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to access feed for group {GroupId} without membership", requestingUserId, groupId);
            throw new UnauthorizedAccessException("You must be a member of this group to view its feed");
        }

        // Get total count first
        var totalCount = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.User)
            .CountAsync(w => w.UserId == requestingUserId || w.User.ShareWatches);

        // Fetch items with tracking to know where we left off
        var allItems = new List<GroupFeedItemResponse>();
        var currentPosition = skip;
        var lastItemId = 0;
        var foundEnough = false;

        // Fetch in batches until we have enough filtered items
        var batchSize = Math.Min(take * 5, 200);
        var maxAttempts = 3; // Prevent infinite loops
        var attempts = 0;

        while (allItems.Count < take && attempts < maxAttempts)
        {
            attempts++;

            var watches = await _context.MovieGroups
                .Where(mg => mg.GroupId == groupId)
                .SelectMany(mg => _context.Watches
                    .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
                .Include(w => w.Movie)
                .Include(w => w.User)
                .OrderByDescending(w => w.WatchedDate)
                .ThenBy(w => w.Id) // Secondary sort for consistency
                .Skip(currentPosition)
                .Take(batchSize)
                .ToListAsync();

            if (!watches.Any())
            {
                // No more items in database
                foundEnough = true;
                break;
            }

            // Apply privacy filters and track each item
            var processedCount = 0;
            foreach (var watch in watches)
            {
                processedCount++;

                // Check if this item passes privacy filter
                if (watch.UserId == requestingUserId || watch.User.ShareWatches)
                {
                    // Apply field-level privacy
                    var rating = watch.User.ShareRatings || watch.UserId == requestingUserId ? watch.Rating : null;
                    var notes = watch.User.ShareNotes || watch.UserId == requestingUserId ? watch.Notes : null;

                    allItems.Add(new GroupFeedItemResponse
                    {
                        Id = watch.Id,
                        UserId = watch.UserId,
                        Username = watch.User.Username,
                        IsDeactivated = watch.User.IsDeactivated,
                        MovieId = watch.MovieId,
                        TmdbId = watch.Movie.TmdbId,
                        MovieTitle = watch.Movie.Title,
                        PosterPath = watch.Movie.PosterPath,
                        WatchedDate = watch.WatchedDate,
                        Rating = rating,
                        Notes = notes,
                        WatchLocation = watch.WatchLocation,
                        WatchedWith = watch.WatchedWith,
                        IsRewatch = watch.IsRewatch
                    });

                    lastItemId = watch.Id;

                    if (allItems.Count >= take)
                    {
                        // We have enough items, update position to after this item
                        currentPosition += processedCount;
                        foundEnough = true;
                        break;
                    }
                }
            }

            // If we didn't find enough items but processed all from this batch
            if (!foundEnough)
            {
                currentPosition += processedCount;

                // If we got fewer items than batch size, we've reached the end
                if (watches.Count < batchSize)
                {
                    foundEnough = true;
                    break;
                }
            }
            else
            {
                break;
            }
        }

        // Check if there are more items available
        var hasMore = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .OrderByDescending(w => w.WatchedDate)
            .ThenBy(w => w.Id)
            .Skip(currentPosition)
            .AnyAsync();

        return new PaginatedGroupFeedResponse
        {
            Items = allItems,
            Skip = skip,
            Take = take,
            HasMore = hasMore,
            TotalCount = totalCount,
            NextSkip = currentPosition
        };
    }

    public async Task<List<Watch>> GetCombinedFeedAsync(int userId, int skip = 0, int take = 20)
    {
        // Get all groups the user is a member of
        var userGroupIds = await _context.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        if (!userGroupIds.Any())
        {
            _logger.LogInformation("User {UserId} is not a member of any groups", userId);
            return new List<Watch>();
        }

        // Get all watches from all user's groups
        var watches = await _context.MovieGroups
            .Where(mg => userGroupIds.Contains(mg.GroupId))
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Distinct() // Remove duplicates if movie is shared with multiple groups
            .OrderByDescending(w => w.WatchedDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // Apply privacy filters
        return ApplyPrivacyFilters(watches, userId);
    }

    public async Task<GroupFeedStatsResponse> GetFeedWithStatsAsync(int groupId, int requestingUserId, int skip = 0, int take = 20)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to access feed stats for group {GroupId} without membership", requestingUserId, groupId);
            return new GroupFeedStatsResponse
            {
                GroupId = groupId,
                GroupName = "Unauthorized",
                Watches = new List<WatchResponse>()
            };
        }

        // Get group info
        var group = await _context.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
        {
            return new GroupFeedStatsResponse
            {
                GroupId = groupId,
                GroupName = "Not Found",
                Watches = new List<WatchResponse>()
            };
        }

        // Get all watches for the group (not paginated for stats)
        var allWatches = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId && !w.Movie.IsPrivate))
            .Include(w => w.Movie)
            .Include(w => w.User)
            .ToListAsync();

        // Calculate stats BEFORE privacy filtering (stats show group aggregate data)
        var totalWatches = allWatches.Count;
        var uniqueMovies = allWatches.Select(w => w.MovieId).Distinct().Count();
        var activeMembers = allWatches.Select(w => w.UserId).Distinct().Count();

        // Calculate average group rating from all watches
        var ratingsAvailable = allWatches.Where(w => w.Rating.HasValue).ToList();
        var averageRating = ratingsAvailable.Any()
            ? Math.Round(ratingsAvailable.Average(w => w.Rating!.Value), 1)
            : (double?)null;

        // Apply privacy filters for individual watch display
        var filteredWatches = ApplyPrivacyFilters(allWatches, requestingUserId);

        // Get top movies by watch count
        var topMovies = filteredWatches
            .GroupBy(w => w.MovieId)
            .Select(g => new MovieWatchStats
            {
                MovieId = g.Key,
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
                WatchCount = g.Count(),
                AverageRating = g.Any(w => w.Rating.HasValue)
                    ? Math.Round(g.Where(w => w.Rating.HasValue).Average(w => w.Rating!.Value), 1)
                    : null,
                WatchedByUsernames = g.Where(w => w.User != null).Select(w => w.User.Username).Distinct().ToList()
            })
            .OrderByDescending(m => m.WatchCount)
            .Take(10)
            .ToList();

        // Get paginated watches for feed
        var paginatedWatches = filteredWatches
            .OrderByDescending(w => w.WatchedDate)
            .Skip(skip)
            .Take(take)
            .Select(WatchMapper.ToResponse)
            .ToList();

        return new GroupFeedStatsResponse
        {
            GroupId = groupId,
            GroupName = group.Name,
            TotalWatches = totalWatches,
            UniqueMovies = uniqueMovies,
            ActiveMembers = activeMembers,
            AverageGroupRating = averageRating,
            Watches = paginatedWatches,
            TopMovies = topMovies
        };
    }

    public async Task<PaginatedMemberWatchesResponse> GetMemberWatchesInGroupAsync(
        int groupId,
        int targetUserId,
        int requestingUserId,
        int skip = 0,
        int take = 20)
    {
        // Verify requesting user is a member of the group
        var isRequestingUserMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isRequestingUserMember)
        {
            _logger.LogWarning("User {UserId} attempted to access member profile in group {GroupId} without membership",
                requestingUserId, groupId);
            throw new UnauthorizedAccessException("You must be a member of this group to view member profiles");
        }

        // Verify target user is a member of the group and get their info
        var targetMember = await _context.GroupMembers
            .Include(gm => gm.User)
            .Include(gm => gm.Group)
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == targetUserId);

        if (targetMember == null)
        {
            _logger.LogWarning("Target user {TargetUserId} is not a member of group {GroupId}",
                targetUserId, groupId);
            throw new KeyNotFoundException("User is not a member of this group");
        }

        // Get total count first (for display purposes)
        var totalCount = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId
                    && !w.Movie.IsPrivate
                    && w.UserId == targetUserId))
            .Include(w => w.User)
            .CountAsync(w => w.UserId == requestingUserId || w.User.ShareWatches);

        // Fetch items with tracking to know where we left off
        var allItems = new List<GroupFeedItemResponse>();
        var currentPosition = skip;
        var foundEnough = false;

        // Fetch in batches until we have enough filtered items
        var batchSize = Math.Min(take * 5, 200);
        var maxAttempts = 3; // Prevent infinite loops
        var attempts = 0;

        while (allItems.Count < take && attempts < maxAttempts)
        {
            attempts++;

            var watches = await _context.MovieGroups
                .Where(mg => mg.GroupId == groupId)
                .SelectMany(mg => _context.Watches
                    .Where(w => w.MovieId == mg.MovieId
                        && !w.Movie.IsPrivate
                        && w.UserId == targetUserId))
                .Include(w => w.Movie)
                .Include(w => w.User)
                .OrderByDescending(w => w.WatchedDate)
                .ThenBy(w => w.Id) // Secondary sort for consistency
                .Skip(currentPosition)
                .Take(batchSize)
                .ToListAsync();

            if (!watches.Any())
            {
                // No more items in database
                foundEnough = true;
                break;
            }

            // Apply privacy filters and track each item
            var processedCount = 0;
            foreach (var watch in watches)
            {
                processedCount++;

                // Check if this item passes privacy filter
                if (watch.UserId == requestingUserId || watch.User.ShareWatches)
                {
                    // Apply field-level privacy
                    var rating = watch.User.ShareRatings || watch.UserId == requestingUserId ? watch.Rating : null;
                    var notes = watch.User.ShareNotes || watch.UserId == requestingUserId ? watch.Notes : null;

                    allItems.Add(new GroupFeedItemResponse
                    {
                        Id = watch.Id,
                        UserId = watch.UserId,
                        Username = watch.User.Username,
                        IsDeactivated = watch.User.IsDeactivated,
                        MovieId = watch.MovieId,
                        TmdbId = watch.Movie.TmdbId,
                        MovieTitle = watch.Movie.Title,
                        PosterPath = watch.Movie.PosterPath,
                        WatchedDate = watch.WatchedDate,
                        Rating = rating,
                        Notes = notes,
                        WatchLocation = watch.WatchLocation,
                        WatchedWith = watch.WatchedWith,
                        IsRewatch = watch.IsRewatch
                    });

                    if (allItems.Count >= take)
                    {
                        // We have enough items, update position to after this item
                        currentPosition += processedCount;
                        foundEnough = true;
                        break;
                    }
                }
            }

            // If we didn't find enough items but processed all from this batch
            if (!foundEnough)
            {
                currentPosition += processedCount;

                // If we got fewer items than batch size, we've reached the end
                if (watches.Count < batchSize)
                {
                    foundEnough = true;
                    break;
                }
            }
            else
            {
                break;
            }
        }

        // Check if there are more items available
        var hasMore = await _context.MovieGroups
            .Where(mg => mg.GroupId == groupId)
            .SelectMany(mg => _context.Watches
                .Where(w => w.MovieId == mg.MovieId
                    && !w.Movie.IsPrivate
                    && w.UserId == targetUserId))
            .OrderByDescending(w => w.WatchedDate)
            .ThenBy(w => w.Id)
            .Skip(currentPosition)
            .AnyAsync();

        return new PaginatedMemberWatchesResponse
        {
            GroupId = groupId,
            GroupName = targetMember.Group.Name,
            TargetUserId = targetUserId,
            TargetUsername = targetMember.User.Username,
            IsTargetDeactivated = targetMember.User.IsDeactivated,
            TargetRole = targetMember.Role.ToString(),
            TargetJoinedAt = targetMember.JoinedAt,
            Items = allItems,
            Skip = skip,
            Take = take,
            HasMore = hasMore,
            TotalCount = totalCount,
            NextSkip = currentPosition
        };
    }

    private List<Watch> ApplyPrivacyFilters(List<Watch> watches, int requestingUserId)
    {
        var filteredWatches = new List<Watch>();

        foreach (var watch in watches)
        {
            // Skip watches from deleted users
            if (watch.User == null)
                continue;

            // User can always see their own watches
            if (watch.UserId == requestingUserId)
            {
                filteredWatches.Add(watch);
                continue;
            }

            // Check owner's privacy settings
            if (!watch.User.ShareWatches)
                continue;

            // Create a copy to avoid modifying the original
            var filteredWatch = new Watch
            {
                Id = watch.Id,
                UserId = watch.UserId,
                MovieId = watch.MovieId,
                WatchedDate = watch.WatchedDate,
                Rating = watch.User.ShareRatings ? watch.Rating : null,
                Notes = watch.User.ShareNotes ? watch.Notes : null,
                WatchLocation = watch.WatchLocation,
                WatchedWith = watch.WatchedWith,
                IsRewatch = watch.IsRewatch,
                CreatedAt = watch.CreatedAt,
                IsDeleted = watch.IsDeleted,
                DeletedAt = watch.DeletedAt,
                User = watch.User,
                Movie = watch.Movie
            };

            filteredWatches.Add(filteredWatch);
        }

        return filteredWatches;
    }
}