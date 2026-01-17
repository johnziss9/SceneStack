using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;

namespace SceneStack.API.Services;

public class GroupRecommendationsService : IGroupRecommendationsService
{
    private readonly ApplicationDbContext _context;
    private readonly ITmdbService _tmdbService;
    private readonly ILogger<GroupRecommendationsService> _logger;

    public GroupRecommendationsService(
        ApplicationDbContext context,
        ITmdbService tmdbService,
        ILogger<GroupRecommendationsService> logger)
    {
        _context = context;
        _tmdbService = tmdbService;
        _logger = logger;
    }

    public async Task<List<TmdbMovie>> GetGroupRecommendationsAsync(int groupId, int requestingUserId, int count = 10)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to get recommendations for group {GroupId} without membership", requestingUserId, groupId);
            return new List<TmdbMovie>();
        }

        // Get all movies watched by group members
        var groupMemberIds = await _context.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        var watchedTmdbIds = await _context.Watches
            .Where(w => groupMemberIds.Contains(w.UserId))
            .Include(w => w.Movie)
            .Select(w => w.Movie.TmdbId)
            .Distinct()
            .ToListAsync();

        _logger.LogInformation("Group {GroupId} has watched {Count} unique movies", groupId, watchedTmdbIds.Count);

        // Get popular movies from TMDb
        var popularMovies = await _tmdbService.GetPopularMoviesAsync();

        if (popularMovies == null || !popularMovies.Results.Any())
        {
            _logger.LogWarning("No popular movies returned from TMDb");
            return new List<TmdbMovie>();
        }

        // Filter out movies already watched by the group
        var recommendations = popularMovies.Results
            .Where(m => !watchedTmdbIds.Contains(m.Id))
            .Take(count)
            .ToList();

        _logger.LogInformation("Returning {Count} recommendations for group {GroupId}", recommendations.Count, groupId);

        return recommendations;
    }

    public async Task<GroupRecommendationStats> GetGroupRecommendationStatsAsync(int groupId, int requestingUserId)
    {
        // Verify requesting user is a member of the group
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to get recommendation stats for group {GroupId} without membership", requestingUserId, groupId);
            return new GroupRecommendationStats
            {
                GroupId = groupId,
                GroupName = "Unauthorized"
            };
        }

        // Get group info
        var group = await _context.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
        {
            return new GroupRecommendationStats
            {
                GroupId = groupId,
                GroupName = "Not Found"
            };
        }

        // Get all group members
        var groupMemberIds = await _context.GroupMembers
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        // Get all watches by group members
        var groupWatches = await _context.Watches
            .Where(w => groupMemberIds.Contains(w.UserId))
            .Include(w => w.Movie)
            .ToListAsync();

        var totalMoviesWatched = groupWatches.Select(w => w.MovieId).Distinct().Count();

        // Calculate average group rating
        var ratingsAvailable = groupWatches.Where(w => w.Rating.HasValue).ToList();
        var averageRating = ratingsAvailable.Any()
            ? Math.Round(ratingsAvailable.Average(w => w.Rating!.Value), 1)
            : (double?)null;

        // Note: Genre analysis would require storing genre data from TMDb
        // For now, we'll return empty genre data
        // This can be enhanced in the future by storing movie genres in the database
        var topGenres = new Dictionary<string, int>();
        var preferredGenres = new List<string>();

        // Get recommendations
        var recommendations = await GetGroupRecommendationsAsync(groupId, requestingUserId, 10);

        return new GroupRecommendationStats
        {
            GroupId = groupId,
            GroupName = group.Name,
            TotalMoviesWatched = totalMoviesWatched,
            TopGenres = topGenres,
            PreferredGenres = preferredGenres,
            AverageGroupRating = averageRating,
            Recommendations = recommendations
        };
    }
}