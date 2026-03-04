using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using System.Text.Json;

namespace SceneStack.API.Services;

public class GroupRecommendationsService : IGroupRecommendationsService
{
    private readonly ApplicationDbContext _context;
    private readonly ITmdbService _tmdbService;
    private readonly ILogger<GroupRecommendationsService> _logger;
    private readonly IMemoryCache _cache;

    public GroupRecommendationsService(
        ApplicationDbContext context,
        ITmdbService tmdbService,
        ILogger<GroupRecommendationsService> logger,
        IMemoryCache cache)
    {
        _context = context;
        _tmdbService = tmdbService;
        _logger = logger;
        _cache = cache;
    }

    // Legacy method - kept for backward compatibility
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

        // Get only watches that are actually shared with this group (via WatchGroup join table)
        var watchGroups = await _context.WatchGroups
            .Where(wg => wg.GroupId == groupId)
            .Include(wg => wg.Watch)
            .ThenInclude(w => w.Movie)
            .Where(wg => !wg.Watch.IsDeleted && !wg.Watch.Movie.IsDeleted)
            .ToListAsync();

        var groupWatches = watchGroups.Select(wg => wg.Watch).ToList();

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

        // Count unique viewers (members who have watched at least one movie)
        var uniqueViewers = groupWatches.Select(w => w.UserId).Distinct().Count();

        // Get watched movie TMDb IDs
        var watchedTmdbIds = groupWatches.Select(w => w.Movie.TmdbId).Distinct().ToHashSet();

        return new GroupRecommendationStats
        {
            GroupId = groupId,
            GroupName = group.Name,
            TotalWatches = groupWatches.Count, // Total number of watch entries
            UniqueMovies = totalMoviesWatched, // Unique movies watched
            UniqueViewers = uniqueViewers, // Unique members who watched
            MostWatchedGenre = null, // Can be enhanced later
            AverageGroupRating = averageRating,
            Recommendations = recommendations
        };
    }

    // New tiered recommendation system
    public async Task<PaginatedRecommendationsResponse> GetPaginatedRecommendationsAsync(
        int groupId,
        int requestingUserId,
        int page = 1,
        int pageSize = 20)
    {
        _logger.LogInformation("========== RECOMMENDATIONS REQUEST: Group {GroupId}, Page {Page} ==========", groupId, page);

        // 1. Verify membership
        var isMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == requestingUserId);

        if (!isMember)
        {
            _logger.LogWarning("User {UserId} attempted to get recommendations for group {GroupId} without membership", requestingUserId, groupId);
            return new PaginatedRecommendationsResponse { HasMore = false };
        }

        // 2. Get watched movie IDs (for filtering)
        var watchedTmdbIds = await GetGroupWatchedMovieIds(groupId);
        _logger.LogInformation("Group {GroupId} has watched {Count} movies: {MovieIds}",
            groupId, watchedTmdbIds.Count, string.Join(", ", watchedTmdbIds.Take(10)));

        // 3. Get or calculate preferences (cached)
        var preferences = await GetOrCalculateGroupPreferences(groupId);

        // 4. Determine current tier based on page
        var tier = DetermineTier(page);

        _logger.LogInformation("Generating {Tier} recommendations for group {GroupId}, page {Page}",
            tier, groupId, page);

        // 5. Generate recommendations for this tier
        var recommendations = await GenerateRecommendationsForTier(
            tier, preferences, watchedTmdbIds, page, pageSize);

        // 6. Build response
        return new PaginatedRecommendationsResponse
        {
            Items = recommendations,
            Page = page,
            PageSize = pageSize,
            HasMore = recommendations.Count == pageSize, // Simple heuristic
            CurrentTier = tier.ToString()
        };
    }

    // User personal recommendations based on all their watches
    public async Task<PaginatedRecommendationsResponse> GetUserRecommendationsAsync(
        int userId,
        int page = 1,
        int pageSize = 20)
    {
        _logger.LogInformation("========== USER RECOMMENDATIONS REQUEST: User {UserId}, Page {Page} ==========", userId, page);

        // 1. Get watched movie IDs (for filtering)
        var watchedTmdbIds = await GetUserWatchedMovieIds(userId);
        _logger.LogInformation("User {UserId} has watched {Count} movies", userId, watchedTmdbIds.Count);

        // 2. Get or calculate user preferences (cached)
        var preferences = await GetOrCalculateUserPreferences(userId);

        // 3. Determine current tier based on page
        var tier = DetermineTier(page);

        _logger.LogInformation("Generating {Tier} recommendations for user {UserId}, page {Page}",
            tier, userId, page);

        // 4. Generate recommendations for this tier
        var recommendations = await GenerateRecommendationsForTier(
            tier, preferences, watchedTmdbIds, page, pageSize);

        // 5. Build response
        return new PaginatedRecommendationsResponse
        {
            Items = recommendations,
            Page = page,
            PageSize = pageSize,
            HasMore = recommendations.Count == pageSize,
            CurrentTier = tier.ToString()
        };
    }

    private async Task<HashSet<int>> GetUserWatchedMovieIds(int userId)
    {
        // Get all movies watched by the user
        var watchedTmdbIds = await _context.Watches
            .Where(w => w.UserId == userId && !w.IsDeleted)
            .Include(w => w.Movie)
            .Where(w => !w.Movie.IsDeleted)
            .Select(w => w.Movie.TmdbId)
            .Distinct()
            .ToListAsync();

        return watchedTmdbIds.ToHashSet();
    }

    private async Task<GroupPreferences> GetOrCalculateUserPreferences(int userId)
    {
        var cacheKey = $"user:{userId}:reco:prefs";

        if (_cache.TryGetValue(cacheKey, out GroupPreferences? cached) && cached != null)
        {
            _logger.LogInformation("Using cached preferences for user {UserId}", userId);

            // Log cached preference details for debugging
            if (cached.Tier1Genres.Any())
                _logger.LogInformation("Cached Tier1 Genres: {Genres}", string.Join(", ", cached.Tier1Genres.Keys));
            if (cached.Tier1Directors.Any())
                _logger.LogInformation("Cached Tier1 Directors: {Directors}", string.Join(", ", cached.Tier1Directors));
            if (cached.Tier1Writers.Any())
                _logger.LogInformation("Cached Tier1 Writers: {Writers}", string.Join(", ", cached.Tier1Writers));
            if (cached.Tier1Cast.Any())
                _logger.LogInformation("Cached Tier1 Cast: {Cast}", string.Join(", ", cached.Tier1Cast.Take(5)));

            return cached;
        }

        _logger.LogInformation("Calculating preferences for user {UserId}", userId);
        var prefs = await CalculateUserPreferences(userId);

        // Cache for 15 minutes (longer than groups since user data changes less frequently)
        _cache.Set(cacheKey, prefs, TimeSpan.FromMinutes(15));

        return prefs;
    }

    private async Task<GroupPreferences> CalculateUserPreferences(int userId)
    {
        // Get all watches by the user
        var allWatches = await _context.Watches
            .Where(w => w.UserId == userId && !w.IsDeleted)
            .Include(w => w.Movie)
            .Where(w => !w.Movie.IsDeleted)
            .ToListAsync();

        var prefs = new GroupPreferences();

        // Tier 1: 8-10 ratings
        var tier1Watches = allWatches.Where(w => w.Rating >= 8.0).ToList();
        prefs.Tier1Genres = ExtractGenreFrequency(tier1Watches);
        prefs.Tier1Directors = ExtractTopDirectors(tier1Watches, 5);
        prefs.Tier1Cast = ExtractTopCast(tier1Watches, 10);
        prefs.Tier1Writers = ExtractTopWriters(tier1Watches, 5);

        // Tier 2: 6-8 ratings
        var tier2Watches = allWatches.Where(w => w.Rating >= 6.0 && w.Rating < 8.0).ToList();
        prefs.Tier2Genres = ExtractGenreFrequency(tier2Watches);
        prefs.Tier2Directors = ExtractTopDirectors(tier2Watches, 5);
        prefs.Tier2Cast = ExtractTopCast(tier2Watches, 10);
        prefs.Tier2Writers = ExtractTopWriters(tier2Watches, 5);

        // Tier 3: All rated movies
        var tier3Watches = allWatches.Where(w => w.Rating.HasValue).ToList();
        prefs.Tier3Genres = ExtractGenreFrequency(tier3Watches);

        _logger.LogInformation("Calculated preferences for user {UserId}: Total watches={Total}, Rated={Rated}, " +
            "Tier1 (8-10): {T1Watches} watches, {T1Genres} genres, {T1Directors} directors, {T1Cast} cast | " +
            "Tier2 (6-8): {T2Watches} watches, {T2Genres} genres | Tier3 (all): {T3Watches} watches",
            userId, allWatches.Count, tier3Watches.Count,
            tier1Watches.Count, prefs.Tier1Genres.Count, prefs.Tier1Directors.Count, prefs.Tier1Cast.Count,
            tier2Watches.Count, prefs.Tier2Genres.Count,
            tier3Watches.Count);

        if (prefs.Tier1Genres.Any())
        {
            _logger.LogInformation("Tier1 Top Genres: {Genres}", string.Join(", ", prefs.Tier1Genres.Keys));
        }
        if (prefs.Tier1Directors.Any())
        {
            _logger.LogInformation("Tier1 Top Directors: {Directors}", string.Join(", ", prefs.Tier1Directors));
        }
        if (prefs.Tier1Cast.Any())
        {
            _logger.LogInformation("Tier1 Top Cast: {Cast}", string.Join(", ", prefs.Tier1Cast.Take(5)));
        }

        return prefs;
    }

    private async Task<HashSet<int>> GetGroupWatchedMovieIds(int groupId)
    {
        // Get watches that are actually shared with this group (via WatchGroup join table)
        // Filter out soft-deleted watches and movies
        var watchedTmdbIds = await _context.WatchGroups
            .Where(wg => wg.GroupId == groupId)
            .Where(wg => !wg.Watch.IsDeleted && !wg.Watch.Movie.IsDeleted)
            .Select(wg => wg.Watch.Movie.TmdbId)
            .Distinct()
            .ToListAsync();

        return watchedTmdbIds.ToHashSet();
    }

    private async Task<GroupPreferences> GetOrCalculateGroupPreferences(int groupId)
    {
        var cacheKey = $"group:{groupId}:reco:prefs";

        if (_cache.TryGetValue(cacheKey, out GroupPreferences? cached) && cached != null)
        {
            _logger.LogInformation("Using cached preferences for group {GroupId}", groupId);

            // Log cached preference details for debugging
            if (cached.Tier1Genres.Any())
                _logger.LogInformation("Cached Tier1 Genres: {Genres}", string.Join(", ", cached.Tier1Genres.Keys));
            if (cached.Tier1Directors.Any())
                _logger.LogInformation("Cached Tier1 Directors: {Directors}", string.Join(", ", cached.Tier1Directors));
            if (cached.Tier1Writers.Any())
                _logger.LogInformation("Cached Tier1 Writers: {Writers}", string.Join(", ", cached.Tier1Writers));
            if (cached.Tier1Cast.Any())
                _logger.LogInformation("Cached Tier1 Cast: {Cast}", string.Join(", ", cached.Tier1Cast.Take(5)));

            return cached;
        }

        _logger.LogInformation("Calculating preferences for group {GroupId}", groupId);
        var prefs = await CalculatePreferences(groupId);

        _cache.Set(cacheKey, prefs, TimeSpan.FromMinutes(5));

        return prefs;
    }

    private async Task<GroupPreferences> CalculatePreferences(int groupId)
    {
        // Get only watches that are actually shared with this group (via WatchGroup join table)
        // Filter out soft-deleted watches and movies
        var watchGroups = await _context.WatchGroups
            .Where(wg => wg.GroupId == groupId)
            .Include(wg => wg.Watch)
            .ThenInclude(w => w.Movie)
            .Where(wg => !wg.Watch.IsDeleted && !wg.Watch.Movie.IsDeleted)
            .ToListAsync();

        var allWatches = watchGroups.Select(wg => wg.Watch).ToList();

        var prefs = new GroupPreferences();

        // Tier 1: 8-10 ratings
        var tier1Watches = allWatches.Where(w => w.Rating >= 8.0).ToList();
        prefs.Tier1Genres = ExtractGenreFrequency(tier1Watches);
        prefs.Tier1Directors = ExtractTopDirectors(tier1Watches, 5);
        prefs.Tier1Cast = ExtractTopCast(tier1Watches, 10);
        prefs.Tier1Writers = ExtractTopWriters(tier1Watches, 5);

        // Tier 2: 6-8 ratings
        var tier2Watches = allWatches.Where(w => w.Rating >= 6.0 && w.Rating < 8.0).ToList();
        prefs.Tier2Genres = ExtractGenreFrequency(tier2Watches);
        prefs.Tier2Directors = ExtractTopDirectors(tier2Watches, 5);
        prefs.Tier2Cast = ExtractTopCast(tier2Watches, 10);
        prefs.Tier2Writers = ExtractTopWriters(tier2Watches, 5);

        // Tier 3: All rated movies
        var tier3Watches = allWatches.Where(w => w.Rating.HasValue).ToList();
        prefs.Tier3Genres = ExtractGenreFrequency(tier3Watches);

        _logger.LogInformation("Calculated preferences for group {GroupId}: Total watches={Total}, Rated={Rated}, " +
            "Tier1 (8-10): {T1Watches} watches, {T1Genres} genres, {T1Directors} directors, {T1Cast} cast | " +
            "Tier2 (6-8): {T2Watches} watches, {T2Genres} genres | Tier3 (all): {T3Watches} watches",
            groupId, allWatches.Count, tier3Watches.Count,
            tier1Watches.Count, prefs.Tier1Genres.Count, prefs.Tier1Directors.Count, prefs.Tier1Cast.Count,
            tier2Watches.Count, prefs.Tier2Genres.Count,
            tier3Watches.Count);

        if (prefs.Tier1Genres.Any())
        {
            _logger.LogInformation("Tier1 Top Genres: {Genres}", string.Join(", ", prefs.Tier1Genres.Keys));
        }
        if (prefs.Tier1Directors.Any())
        {
            _logger.LogInformation("Tier1 Top Directors: {Directors}", string.Join(", ", prefs.Tier1Directors));
        }
        if (prefs.Tier1Cast.Any())
        {
            _logger.LogInformation("Tier1 Top Cast: {Cast}", string.Join(", ", prefs.Tier1Cast.Take(5)));
        }

        return prefs;
    }

    private Dictionary<string, int> ExtractGenreFrequency(List<Watch> watches)
    {
        return watches
            .Where(w => w.Movie.Genres != null && w.Movie.Genres.Any())
            .SelectMany(w => w.Movie.Genres)
            .GroupBy(g => g)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    private List<string> ExtractTopDirectors(List<Watch> watches, int take)
    {
        return watches
            .Where(w => !string.IsNullOrEmpty(w.Movie.DirectorName))
            .GroupBy(w => w.Movie.DirectorName)
            .OrderByDescending(g => g.Count())
            .Take(take)
            .Select(g => g.Key!)
            .ToList();
    }

    private List<string> ExtractTopCast(List<Watch> watches, int take)
    {
        return watches
            .Where(w => w.Movie.Cast != null && w.Movie.Cast.Any())
            .SelectMany(w => w.Movie.Cast)
            .GroupBy(c => c.Name)
            .OrderByDescending(g => g.Count())
            .Take(take)
            .Select(g => g.Key)
            .ToList();
    }

    private List<string> ExtractTopWriters(List<Watch> watches, int take)
    {
        return watches
            .Where(w => !string.IsNullOrEmpty(w.Movie.WriterName))
            .SelectMany(w => w.Movie.WriterName!.Split(',', StringSplitOptions.TrimEntries))
            .GroupBy(w => w)
            .OrderByDescending(g => g.Count())
            .Take(take)
            .Select(g => g.Key)
            .ToList();
    }

    private RecommendationTier DetermineTier(int page)
    {
        // Pages 1-2: Elite (Tier 1)
        if (page <= 2) return RecommendationTier.Elite;

        // Pages 3-4: Strong (Tier 2)
        if (page <= 4) return RecommendationTier.Strong;

        // Pages 5-6: Broad (Tier 3)
        if (page <= 6) return RecommendationTier.Broad;

        // Pages 7+: Popular (Tier 4)
        return RecommendationTier.Popular;
    }

    private async Task<List<RecommendedMovie>> GenerateRecommendationsForTier(
        RecommendationTier tier,
        GroupPreferences preferences,
        HashSet<int> watchedTmdbIds,
        int page,
        int pageSize)
    {
        // Get preferred genre IDs for filtering
        var preferredGenreIds = GetPreferredGenreIds(tier, preferences);

        // Fetch candidate movies from TMDb using Discover API
        var tmdbPage = CalculateTmdbPage(page, tier);
        var discoverMovies = await _tmdbService.DiscoverMoviesAsync(
            withGenres: preferredGenreIds.Any() ? preferredGenreIds : null,
            voteAverageMin: GetMinTmdbRating(tier),
            voteCountMin: GetMinVoteCount(tier),
            sortBy: "popularity.desc",
            page: tmdbPage);

        // Fallback: if genre filtering returns nothing, try without genre filter
        if (discoverMovies == null || !discoverMovies.Results.Any())
        {
            _logger.LogWarning("No movies with genre filter, trying without genre filter for tier {Tier}", tier);
            discoverMovies = await _tmdbService.DiscoverMoviesAsync(
                withGenres: null,  // No genre filter
                voteAverageMin: GetMinTmdbRating(tier),
                voteCountMin: GetMinVoteCount(tier),
                sortBy: "popularity.desc",
                page: tmdbPage);
        }

        if (discoverMovies == null || !discoverMovies.Results.Any())
        {
            _logger.LogWarning("No movies returned from TMDb Discover for page {Page}, tier {Tier}", tmdbPage, tier);
            return new List<RecommendedMovie>();
        }

        var popularMovies = discoverMovies;

        // Filter out watched movies
        var unwatchedMovies = popularMovies.Results
            .Where(m => !watchedTmdbIds.Contains(m.Id))
            .ToList();

        _logger.LogInformation("Found {UnwatchedCount} unwatched movies from {TotalCandidates} TMDb results for tier {Tier}",
            unwatchedMovies.Count, popularMovies.Results.Count, tier);

        if (!unwatchedMovies.Any())
        {
            return new List<RecommendedMovie>();
        }

        // Fetch credits for all unwatched movies in parallel
        var creditsDict = await FetchCreditsForMovies(unwatchedMovies.Select(m => m.Id).ToList());

        // Check if we have any preferences for this tier
        var hasPreferences = HasPreferencesForTier(tier, preferences);
        var minScore = hasPreferences ? GetMinScoreForTier(tier) : 0.0;

        // Score and filter candidates
        var allScored = unwatchedMovies
            .Select(m => ScoreMovie(m, tier, preferences, creditsDict))
            .OrderByDescending(sm => sm.Score)
            .ToList();

        // Log top 3 scores for debugging
        if (allScored.Any())
        {
            _logger.LogInformation("Top 3 scored movies:");
            for (int i = 0; i < Math.Min(3, allScored.Count); i++)
            {
                var rec = allScored[i];
                _logger.LogInformation("  #{Rank}: {Movie} (score={Score:F3})", i + 1, rec.Movie.Title, rec.Score);
                _logger.LogInformation("    Reason: {Reason}", rec.Reason);
                if (rec.MatchedGenres.Any())
                    _logger.LogInformation("    Matched Genres: {Genres}", string.Join(", ", rec.MatchedGenres));
                if (!string.IsNullOrEmpty(rec.MatchedDirector))
                    _logger.LogInformation("    Matched Director: {Director}", rec.MatchedDirector);
                if (!string.IsNullOrEmpty(rec.MatchedWriter))
                    _logger.LogInformation("    ✅ Matched Writer: {Writer}", rec.MatchedWriter);
                if (rec.MatchedCast.Any())
                    _logger.LogInformation("    Matched Cast: {Cast}", string.Join(", ", rec.MatchedCast.Take(3)));
            }
        }

        var scored = allScored
            .Where(sm => sm.Score > minScore)
            .Take(pageSize)
            .ToList();

        _logger.LogInformation("Generated {Count} scored recommendations with minScore={MinScore} (hasPreferences: {HasPrefs}), {Filtered} movies filtered out",
            scored.Count, minScore, hasPreferences, allScored.Count - scored.Count);

        // Fallback: If we have unwatched movies but no scored recommendations (too strict filtering),
        // return all unwatched movies sorted by TMDb rating
        if (!scored.Any() && unwatchedMovies.Any())
        {
            _logger.LogWarning("No movies passed score threshold. Falling back to all unwatched movies sorted by TMDb rating.");
            scored = unwatchedMovies
                .Select(m => new RecommendedMovie
                {
                    Movie = m,
                    Score = m.VoteAverage / 10.0,
                    Reason = "Popular movie",
                    MatchedGenres = new List<string>(),
                    MatchedDirector = null,
                    MatchedCast = new List<string>()
                })
                .OrderByDescending(sm => sm.Movie.VoteAverage)
                .Take(pageSize)
                .ToList();
        }

        return scored;
    }

    private async Task<Dictionary<int, TmdbCreditsResult>> FetchCreditsForMovies(List<int> movieIds)
    {
        var creditsDict = new Dictionary<int, TmdbCreditsResult>();

        // Check cache first
        var uncachedIds = new List<int>();
        foreach (var movieId in movieIds)
        {
            var cacheKey = $"movie:{movieId}:credits";
            if (_cache.TryGetValue(cacheKey, out TmdbCreditsResult? cached) && cached != null)
            {
                creditsDict[movieId] = cached;
            }
            else
            {
                uncachedIds.Add(movieId);
            }
        }

        if (!uncachedIds.Any())
        {
            _logger.LogInformation("All {Count} movie credits found in cache", movieIds.Count);
            return creditsDict;
        }

        _logger.LogInformation("Fetching credits for {Count} movies ({Cached} from cache)", uncachedIds.Count, movieIds.Count - uncachedIds.Count);

        // Fetch uncached credits in parallel (with rate limiting)
        var creditsTasks = uncachedIds.Select(async movieId =>
        {
            try
            {
                var credits = await _tmdbService.GetMovieCreditsAsync(movieId);
                if (credits != null)
                {
                    // Cache for 1 hour
                    var cacheKey = $"movie:{movieId}:credits";
                    _cache.Set(cacheKey, credits, TimeSpan.FromHours(1));
                    return (movieId, credits);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch credits for movie {MovieId}", movieId);
            }
            return (movieId, (TmdbCreditsResult?)null);
        });

        var results = await Task.WhenAll(creditsTasks);

        foreach (var (movieId, credits) in results)
        {
            if (credits != null)
            {
                creditsDict[movieId] = credits;
            }
        }

        return creditsDict;
    }

    private bool HasPreferencesForTier(RecommendationTier tier, GroupPreferences preferences)
    {
        return tier switch
        {
            RecommendationTier.Elite => preferences.Tier1Genres.Any() || preferences.Tier1Directors.Any(),
            RecommendationTier.Strong => preferences.Tier2Genres.Any() || preferences.Tier2Directors.Any(),
            RecommendationTier.Broad => preferences.Tier3Genres.Any(),
            RecommendationTier.Popular => false, // Popular tier doesn't use preferences
            _ => false
        };
    }

    private int CalculateTmdbPage(int requestedPage, RecommendationTier tier)
    {
        // Map our pagination to TMDb pages
        // Tier 1 (pages 1-2) -> TMDb pages 1-2
        // Tier 2 (pages 3-4) -> TMDb pages 3-4
        // etc.
        return requestedPage;
    }

    private double GetMinScoreForTier(RecommendationTier tier)
    {
        return tier switch
        {
            RecommendationTier.Elite => 0.30,   // 30% match required (adjusted with writer scoring)
            RecommendationTier.Strong => 0.20,  // 20% match required
            RecommendationTier.Broad => 0.15,   // 15% match required
            RecommendationTier.Popular => 0.0,  // No minimum
            _ => 0.0
        };
    }

    private RecommendedMovie ScoreMovie(
        TmdbMovie movie,
        RecommendationTier tier,
        GroupPreferences preferences,
        Dictionary<int, TmdbCreditsResult> creditsDict)
    {
        double score = 0.0;
        var matchedGenres = new List<string>();
        string? matchedDirector = null;
        var matchedCast = new List<string>();
        string? matchedWriter = null;
        string reason = "";

        // Get credits for this movie
        creditsDict.TryGetValue(movie.Id, out var credits);

        switch (tier)
        {
            case RecommendationTier.Elite:
                // Genre matching (35%, reduced from 40%)
                var genreScore = CalculateGenreScore(movie, preferences.Tier1Genres, out matchedGenres);
                score += genreScore * 0.35;

                // Director matching (30%, unchanged)
                var directorScore = CalculateDirectorScore(credits, preferences.Tier1Directors, out matchedDirector);
                score += directorScore * 0.30;

                // Writer matching (20%, NEW)
                var writerScore = CalculateWriterScore(credits, preferences.Tier1Writers, out matchedWriter);
                score += writerScore * 0.20;

                // Cast matching (10%, reduced from 20%)
                var castScore = CalculateCastScore(credits, preferences.Tier1Cast, out matchedCast);
                score += castScore * 0.10;

                // TMDb rating boost (5%, reduced from 10%)
                var ratingScore = (movie.VoteAverage / 10.0) * 0.05;
                score += ratingScore;

                // Log detailed scoring
                _logger.LogDebug("Scoring {Movie}: Genre={GenreScore:F3}*0.35={GenreWeight:F3}, " +
                    "Director={DirectorScore:F3}*0.30={DirectorWeight:F3}, Writer={WriterScore:F3}*0.20={WriterWeight:F3}, " +
                    "Cast={CastScore:F3}*0.10={CastWeight:F3}, Rating={RatingScore:F3}, Total={Total:F3}",
                    movie.Title, genreScore, genreScore * 0.35,
                    directorScore, directorScore * 0.30, writerScore, writerScore * 0.20,
                    castScore, castScore * 0.10, ratingScore, score);

                reason = BuildReason(matchedGenres, matchedDirector, matchedWriter, matchedCast, "from your 8+ rated movies");
                break;

            case RecommendationTier.Strong:
                // Genre matching (45%, reduced from 50%)
                genreScore = CalculateGenreScore(movie, preferences.Tier2Genres, out matchedGenres);
                score += genreScore * 0.45;

                // Director matching (20%, reduced from 25%)
                directorScore = CalculateDirectorScore(credits, preferences.Tier2Directors, out matchedDirector);
                score += directorScore * 0.20;

                // Writer matching (15%, NEW)
                writerScore = CalculateWriterScore(credits, preferences.Tier2Writers, out matchedWriter);
                score += writerScore * 0.15;

                // Cast matching (10%, reduced from 15%)
                castScore = CalculateCastScore(credits, preferences.Tier2Cast, out matchedCast);
                score += castScore * 0.10;

                // TMDb rating boost (10%, unchanged)
                score += (movie.VoteAverage / 10.0) * 0.10;

                reason = BuildReason(matchedGenres, matchedDirector, matchedWriter, matchedCast, "your group enjoyed");
                break;

            case RecommendationTier.Broad:
                // Genre matching (70%, reduced from 80%)
                genreScore = CalculateGenreScore(movie, preferences.Tier3Genres, out matchedGenres);
                score += genreScore * 0.70;

                // Writer matching (15%, NEW)
                writerScore = CalculateWriterScore(credits, preferences.Tier1Writers, out matchedWriter);
                score += writerScore * 0.15;

                // TMDb rating boost (15%, reduced from 20%)
                score += (movie.VoteAverage / 10.0) * 0.15;

                reason = matchedGenres.Any() || matchedWriter != null
                    ? $"Popular in {string.Join(", ", matchedGenres)} your group watches"
                    : "Popular movie";
                break;

            case RecommendationTier.Popular:
                score = movie.VoteAverage / 10.0;
                reason = "Trending on TMDb";
                break;
        }

        return new RecommendedMovie
        {
            Movie = movie,
            Score = score,
            Reason = reason,
            MatchedGenres = matchedGenres,
            MatchedDirector = matchedDirector,
            MatchedCast = matchedCast,
            MatchedWriter = matchedWriter
        };
    }

    private double CalculateGenreScore(
        TmdbMovie movie,
        Dictionary<string, int> preferredGenres,
        out List<string> matchedGenres)
    {
        matchedGenres = new List<string>();

        if (movie.Genres == null || !movie.Genres.Any() || !preferredGenres.Any())
        {
            _logger.LogDebug("{Movie}: No genre match - MovieGenres={HasMovieGenres}, PreferredGenres={PreferredCount}",
                movie.Title, movie.Genres != null && movie.Genres.Any(), preferredGenres.Count);
            return 0.0;
        }

        var movieGenres = movie.Genres.Select(g => g.Name).ToList();
        matchedGenres = movieGenres.Where(g => preferredGenres.ContainsKey(g)).ToList();

        _logger.LogDebug("{Movie}: Genres={MovieGenres} vs Preferred={PreferredGenres} => Matched={MatchedGenres}",
            movie.Title,
            string.Join(", ", movieGenres),
            string.Join(", ", preferredGenres.Keys),
            string.Join(", ", matchedGenres));

        if (!matchedGenres.Any())
            return 0.0;

        // Weight by genre frequency
        var totalFrequency = preferredGenres.Values.Sum();
        var matchedFrequency = matchedGenres.Sum(g => preferredGenres.GetValueOrDefault(g, 0));

        return (double)matchedFrequency / totalFrequency;
    }

    private double CalculateDirectorScore(
        TmdbCreditsResult? credits,
        List<string> preferredDirectors,
        out string? matchedDirector)
    {
        matchedDirector = null;

        if (credits == null || !credits.Crew.Any() || !preferredDirectors.Any())
            return 0.0;

        // Find directors in crew (Job == "Director")
        var directors = credits.Crew
            .Where(c => c.Job == "Director")
            .Select(c => c.Name)
            .ToList();

        if (!directors.Any())
            return 0.0;

        // Check if any director matches preferred directors
        matchedDirector = directors.FirstOrDefault(d => preferredDirectors.Contains(d));

        if (matchedDirector != null)
        {
            // Full match - director is in preferred list
            return 1.0;
        }

        return 0.0;
    }

    private double CalculateCastScore(
        TmdbCreditsResult? credits,
        List<string> preferredCast,
        out List<string> matchedCast)
    {
        matchedCast = new List<string>();

        if (credits == null || !credits.Cast.Any() || !preferredCast.Any())
            return 0.0;

        // Get top 10 billed cast (similar to how we store in database)
        var topCast = credits.Cast
            .OrderBy(c => c.Order)
            .Take(10)
            .Select(c => c.Name)
            .ToList();

        if (!topCast.Any())
            return 0.0;

        // Find matches
        matchedCast = topCast.Where(c => preferredCast.Contains(c)).ToList();

        if (!matchedCast.Any())
            return 0.0;

        // Score based on percentage of preferred cast that matched
        // If user likes 10 actors and 3 are in this movie, score = 0.3
        return (double)matchedCast.Count / preferredCast.Count;
    }

    private double CalculateWriterScore(
        TmdbCreditsResult? credits,
        List<string> preferredWriters,
        out string? matchedWriter)
    {
        matchedWriter = null;

        if (credits == null || !credits.Crew.Any() || !preferredWriters.Any())
            return 0.0;

        // Find writers in crew (Job == "Writer", "Screenplay", or "Story")
        var writers = credits.Crew
            .Where(c => c.Job == "Writer" || c.Job == "Screenplay" || c.Job == "Story")
            .Select(c => c.Name)
            .Distinct()
            .ToList();

        if (!writers.Any())
            return 0.0;

        // Check if any writer matches preferred writers
        matchedWriter = writers.FirstOrDefault(w => preferredWriters.Contains(w));

        if (matchedWriter != null)
        {
            // Full match - writer is in preferred list
            return 1.0;
        }

        return 0.0;
    }

    private string BuildReason(
        List<string> matchedGenres,
        string? matchedDirector,
        string? matchedWriter,
        List<string> matchedCast,
        string context)
    {
        var parts = new List<string>();

        if (matchedGenres.Any())
        {
            var genreList = string.Join(", ", matchedGenres.Take(3));
            parts.Add($"Matches {genreList}");
        }

        if (!string.IsNullOrEmpty(matchedDirector))
        {
            parts.Add($"directed by {matchedDirector}");
        }

        if (!string.IsNullOrEmpty(matchedWriter))
        {
            parts.Add($"written by {matchedWriter}");
        }

        if (matchedCast.Any())
        {
            var castList = string.Join(", ", matchedCast.Take(2));
            parts.Add($"starring {castList}");
        }

        if (parts.Any())
        {
            return $"{string.Join(" • ", parts)} {context}";
        }

        // No matches - likely because group has no rated watches
        // Return a friendly message based on context
        if (context.Contains("8+"))
        {
            return "Popular highly-rated movie";
        }
        else if (context.Contains("enjoyed"))
        {
            return "Recommended based on TMDb ratings";
        }
        else
        {
            return "Popular movie recommendation";
        }
    }

    private List<int> GetPreferredGenreIds(RecommendationTier tier, GroupPreferences preferences)
    {
        IEnumerable<string> genreNames = tier switch
        {
            RecommendationTier.Elite => preferences.Tier1Genres.Keys.Take(3),  // Top 3 genres only
            RecommendationTier.Strong => preferences.Tier2Genres.Keys.Take(3),
            RecommendationTier.Broad => preferences.Tier3Genres.Keys.Take(3),
            RecommendationTier.Popular => Enumerable.Empty<string>(),
            _ => Enumerable.Empty<string>()
        };

        var genreIds = genreNames
            .Where(name => TmdbGenreIds.GenreToId.ContainsKey(name))
            .Select(name => TmdbGenreIds.GenreToId[name])
            .ToList();

        var genreNamesList = string.Join(", ", genreNames);
        _logger.LogInformation("Tier {Tier}: Genres={GenreNames} -> IDs={GenreIds}",
            tier, genreNamesList, string.Join(", ", genreIds));

        return genreIds;
    }

    private double GetMinTmdbRating(RecommendationTier tier)
    {
        return tier switch
        {
            RecommendationTier.Elite => 6.5,    // Good quality movies (lowered from 7.0)
            RecommendationTier.Strong => 5.5,   // Decent movies
            RecommendationTier.Broad => 5.0,    // Average movies
            RecommendationTier.Popular => 0.0,  // No minimum
            _ => 0.0
        };
    }

    private int GetMinVoteCount(RecommendationTier tier)
    {
        return tier switch
        {
            RecommendationTier.Elite => 200,    // Lowered from 500
            RecommendationTier.Strong => 100,   // Lowered from 300
            RecommendationTier.Broad => 50,     // Lowered from 200
            RecommendationTier.Popular => 0,    // No minimum
            _ => 0
        };
    }
}
