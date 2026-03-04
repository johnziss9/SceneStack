using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Mappers;
using SceneStack.API.Models;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WatchesController : ControllerBase
{
    private readonly IWatchService _watchService;
    private readonly IMovieService _movieService;
    private readonly IGroupRecommendationsService _recommendationsService;
    private readonly ILogger<WatchesController> _logger;
    private readonly IMemoryCache _cache;

    public WatchesController(
        IWatchService watchService,
        IMovieService movieService,
        IGroupRecommendationsService recommendationsService,
        ILogger<WatchesController> logger,
        IMemoryCache cache)
    {
        _watchService = watchService;
        _movieService = movieService;
        _recommendationsService = recommendationsService;
        _logger = logger;
        _cache = cache;
    }

    /// <summary>
    /// Invalidates the recommendations cache for a given user
    /// </summary>
    private void InvalidateUserRecommendationsCache(int userId)
    {
        var cacheKey = $"user:{userId}:reco:prefs";
        _cache.Remove(cacheKey);
        _logger.LogInformation("Invalidated recommendations cache for user {UserId}", userId);
    }

    /// <summary>
    /// Invalidates the recommendations cache for multiple groups
    /// </summary>
    private void InvalidateGroupRecommendationsCache(List<int> groupIds)
    {
        if (groupIds == null || !groupIds.Any())
            return;

        foreach (var groupId in groupIds)
        {
            var cacheKey = $"group:{groupId}:reco:prefs";
            _cache.Remove(cacheKey);
            _logger.LogInformation("Invalidated recommendations cache for group {GroupId}", groupId);
        }
    }

    // GET: api/watches
    // GET: api/watches?groupId=5
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WatchResponse>>> GetWatches([FromQuery] int? groupId = null)
    {
        var userId = User.GetUserId();
        var watches = await _watchService.GetAllAsync(userId, groupId);
        var response = watches.Select(WatchMapper.ToResponse);
        return Ok(response);
    }

    // GET: api/watches/5
    [HttpGet("{id}")]
    public async Task<ActionResult<WatchResponse>> GetWatch(int id)
    {
        var watch = await _watchService.GetByIdAsync(id);

        if (watch == null)
            return NotFound();

        return Ok(WatchMapper.ToResponse(watch));
    }

    // GET: api/watches/grouped?page=1&pageSize=20&search=&ratingMin=&ratingMax=&watchedFrom=&watchedTo=&rewatchOnly=&sortBy=&groupId=
    [HttpGet("grouped")]
    public async Task<ActionResult<PaginatedGroupedWatchesResponse>> GetGroupedWatches(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? groupId = null,
        [FromQuery] string? search = null,
        [FromQuery] int? ratingMin = null,
        [FromQuery] int? ratingMax = null,
        [FromQuery] DateTime? watchedFrom = null,
        [FromQuery] DateTime? watchedTo = null,
        [FromQuery] bool? rewatchOnly = null,
        [FromQuery] bool? unratedOnly = null,
        [FromQuery] string? sortBy = null)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting grouped watches for user {UserId}, page {Page}, search {Search}", userId, page, search);

        var request = new GetGroupedWatchesRequest
        {
            UserId = userId,
            Page = page,
            PageSize = pageSize,
            GroupId = groupId,
            Search = search,
            RatingMin = ratingMin,
            RatingMax = ratingMax,
            WatchedFrom = watchedFrom.HasValue ? DateTime.SpecifyKind(watchedFrom.Value, DateTimeKind.Utc) : null,
            WatchedTo = watchedTo.HasValue ? DateTime.SpecifyKind(watchedTo.Value, DateTimeKind.Utc) : null,
            RewatchOnly = rewatchOnly,
            UnratedOnly = unratedOnly,
            SortBy = sortBy
        };

        var grouped = await _watchService.GetGroupedWatchesAsync(request);

        return Ok(grouped);
    }

    // GET: api/watches/by-movie/550
    [HttpGet("by-movie/{movieId}")]
    public async Task<ActionResult<List<WatchResponse>>> GetWatchesByMovie(int movieId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting watches for movieId: {MovieId}, userId: {UserId}", movieId, userId);

        var watches = await _watchService.GetByMovieIdAsync(movieId, userId);

        if (watches == null || !watches.Any())
        {
            _logger.LogInformation("No watches found for movieId: {MovieId}, userId: {UserId}", movieId, userId);
            return Ok(new List<WatchResponse>()); // Return empty list, not 404
        }

        var response = watches.Select(w => WatchMapper.ToResponse(w)).ToList();
        return Ok(response);
    }

    // POST: api/watches
    [HttpPost]
    public async Task<ActionResult<WatchResponse>> CreateWatch(CreateWatchRequest request)
    {
        _logger.LogInformation("Creating watch for TMDb movie ID: {TmdbId}", request.TmdbId);

        try
        {
            // Get or create the movie from TMDb
            var movie = await _movieService.GetOrCreateFromTmdbAsync(request.TmdbId);

            if (movie == null)
            {
                _logger.LogError("Failed to get or create movie from TMDb ID: {TmdbId}", request.TmdbId);
                return StatusCode(500, "Failed to retrieve movie from TMDb");
            }

            var userId = User.GetUserId();

            var watch = new Watch
            {
                UserId = userId,
                MovieId = movie.Id,
                WatchedDate = DateTime.SpecifyKind(request.WatchedDate, DateTimeKind.Utc),
                Rating = request.Rating,
                Notes = request.Notes,
                WatchLocation = request.WatchLocation,
                WatchedWith = request.WatchedWith,
                IsRewatch = request.IsRewatch,
                IsPrivate = request.IsPrivate
            };

            var createdWatch = await _watchService.CreateAsync(watch, request.GroupIds);
            _logger.LogInformation("Successfully created watch with ID: {WatchId}", createdWatch.Id);

            // Invalidate recommendations cache for this user
            InvalidateUserRecommendationsCache(userId);

            // Invalidate recommendations cache for all affected groups
            InvalidateGroupRecommendationsCache(request.GroupIds);

            return CreatedAtAction(nameof(GetWatch), new { id = createdWatch.Id }, WatchMapper.ToResponse(createdWatch));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating watch for TMDb ID: {TmdbId}", request.TmdbId);
            return StatusCode(500, $"Error creating watch: {ex.Message}");
        }
    }

    // PUT: api/watches/5
    [HttpPut("{id}")]
    public async Task<ActionResult<WatchResponse>> UpdateWatch(int id, UpdateWatchRequest request)
    {
        var userId = User.GetUserId();

        // Fetch the existing watch to get old group IDs before updating
        var existingWatch = await _watchService.GetByIdAsync(id);
        if (existingWatch == null)
            return NotFound();

        var oldGroupIds = existingWatch.WatchGroups.Select(wg => wg.GroupId).ToList();

        var watch = new Watch
        {
            WatchedDate = DateTime.SpecifyKind(request.WatchedDate, DateTimeKind.Utc),
            Rating = request.Rating,
            Notes = request.Notes,
            WatchLocation = request.WatchLocation,
            WatchedWith = request.WatchedWith,
            IsRewatch = request.IsRewatch,
            IsPrivate = request.IsPrivate
        };

        var updatedWatch = await _watchService.UpdateAsync(id, watch, request.GroupIds);

        if (updatedWatch == null)
            return NotFound();

        // Invalidate recommendations cache for this user
        InvalidateUserRecommendationsCache(userId);

        // Invalidate cache for old groups (in case watch was removed from them)
        InvalidateGroupRecommendationsCache(oldGroupIds);

        // Invalidate cache for new groups (in case watch was added to them)
        if (request.GroupIds != null)
        {
            InvalidateGroupRecommendationsCache(request.GroupIds);
        }

        return Ok(WatchMapper.ToResponse(updatedWatch));
    }

    // DELETE: api/watches/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWatch(int id)
    {
        var userId = User.GetUserId();

        // Fetch the watch to get group IDs before deleting
        var existingWatch = await _watchService.GetByIdAsync(id);
        if (existingWatch == null)
            return NotFound();

        var groupIds = existingWatch.WatchGroups.Select(wg => wg.GroupId).ToList();

        var result = await _watchService.DeleteAsync(id);

        if (!result)
            return NotFound();

        // Invalidate recommendations cache for this user
        InvalidateUserRecommendationsCache(userId);

        // Invalidate cache for all groups this watch was shared with
        InvalidateGroupRecommendationsCache(groupIds);

        return NoContent();
    }

    /// <summary>
    /// Get watch feed for a specific group
    /// </summary>
    /// <param name="groupId">Group ID</param>
    /// <returns>List of watches shared with the group</returns>
    // GET: api/watches/group/5/feed
    [HttpGet("group/{groupId}/feed")]
    public async Task<ActionResult<IEnumerable<WatchResponse>>> GetGroupFeed(int groupId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting feed for group {GroupId}", userId, groupId);

        try
        {
            var watches = await _watchService.GetGroupFeedAsync(groupId, userId);

            if (!watches.Any())
            {
                _logger.LogInformation("No watches found in group {GroupId} feed for user {UserId}", groupId, userId);
                return Ok(new List<WatchResponse>());
            }

            var response = watches.Select(WatchMapper.ToResponse).ToList();
            _logger.LogInformation("Returning {Count} watches in group {GroupId} feed", response.Count, groupId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting group feed for group {GroupId}", groupId);
            return StatusCode(500, $"Error getting group feed: {ex.Message}");
        }
    }

    /// <summary>
    /// Bulk update privacy and group sharing for multiple watches
    /// </summary>
    /// <param name="request">Bulk update request with watch IDs, privacy setting, and group IDs</param>
    /// <returns>Bulk update result with success/failure counts</returns>
    // PUT: api/watches/bulk
    [HttpPut("bulk")]
    public async Task<ActionResult<BulkUpdateResult>> BulkUpdateWatches(BulkUpdateWatchesRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation(
            "User {UserId} bulk updating {Count} watches. IsPrivate: {IsPrivate}, GroupOperation: {GroupOperation}",
            userId,
            request.WatchIds.Count,
            request.IsPrivate,
            request.GroupOperation);

        // Validation
        if (request.WatchIds == null || !request.WatchIds.Any())
        {
            return BadRequest(new BulkUpdateResult
            {
                Success = false,
                Updated = 0,
                Failed = 0,
                Errors = new List<string> { "WatchIds cannot be empty" }
            });
        }

        if (string.IsNullOrEmpty(request.GroupOperation))
        {
            return BadRequest(new BulkUpdateResult
            {
                Success = false,
                Updated = 0,
                Failed = 0,
                Errors = new List<string> { "GroupOperation is required (must be 'add' or 'replace')" }
            });
        }

        try
        {
            // Fetch all watches to get their old group IDs before updating
            var existingWatches = new List<Watch>();
            foreach (var watchId in request.WatchIds)
            {
                var watch = await _watchService.GetByIdAsync(watchId);
                if (watch != null)
                {
                    existingWatches.Add(watch);
                }
            }

            var oldGroupIds = existingWatches
                .SelectMany(w => w.WatchGroups.Select(wg => wg.GroupId))
                .Distinct()
                .ToList();

            var result = await _watchService.BulkUpdateAsync(
                userId,
                request.WatchIds,
                request.IsPrivate,
                request.GroupIds,
                request.GroupOperation);

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Bulk update partially failed for user {UserId}. Updated: {Updated}, Failed: {Failed}",
                    userId,
                    result.Updated,
                    result.Failed);

                // Invalidate cache even for partial updates, as some watches were modified
                if (result.Updated > 0)
                {
                    InvalidateUserRecommendationsCache(userId);

                    // Invalidate old groups
                    InvalidateGroupRecommendationsCache(oldGroupIds);

                    // Invalidate new groups
                    if (request.GroupIds != null)
                    {
                        InvalidateGroupRecommendationsCache(request.GroupIds);
                    }
                }

                return BadRequest(result);
            }

            _logger.LogInformation(
                "Successfully bulk updated {Count} watches for user {UserId}",
                result.Updated,
                userId);

            // Invalidate recommendations cache for this user
            InvalidateUserRecommendationsCache(userId);

            // Invalidate cache for old groups (in case watches were removed from them)
            InvalidateGroupRecommendationsCache(oldGroupIds);

            // Invalidate cache for new groups (in case watches were added to them)
            if (request.GroupIds != null)
            {
                InvalidateGroupRecommendationsCache(request.GroupIds);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk update for user {UserId}", userId);
            return StatusCode(500, new BulkUpdateResult
            {
                Success = false,
                Updated = 0,
                Failed = request.WatchIds.Count,
                Errors = new List<string> { $"Internal server error: {ex.Message}" }
            });
        }
    }

    /// <summary>
    /// Get personalized movie recommendations for the current user
    /// </summary>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20)</param>
    /// <returns>Paginated list of recommended movies with scores and reasons</returns>
    // GET: api/watches/recommendations?page=1&pageSize=20
    [HttpGet("recommendations")]
    public async Task<ActionResult<PaginatedRecommendationsResponse>> GetUserRecommendations(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("User {UserId} getting personal recommendations page {Page}", userId, page);

        try
        {
            var recommendations = await _recommendationsService
                .GetUserRecommendationsAsync(userId, page, pageSize);

            _logger.LogInformation("Returning {Count} recommendations (tier: {Tier}) for user {UserId}",
                recommendations.Items.Count, recommendations.CurrentTier, userId);

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendations for user {UserId}", userId);
            return StatusCode(500, $"Error getting recommendations: {ex.Message}");
        }
    }
}