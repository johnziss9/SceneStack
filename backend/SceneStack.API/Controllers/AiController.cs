using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IAiInsightService _aiInsightService;
    private readonly IAiSearchService _aiSearchService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AiController> _logger;

    public AiController(
        IAiInsightService aiInsightService,
        IAiSearchService aiSearchService,
        ApplicationDbContext context,
        ILogger<AiController> logger)
    {
        _aiInsightService = aiInsightService;
        _aiSearchService = aiSearchService;
        _context = context;
        _logger = logger;
    }

    // POST: api/ai/insights
    /// <summary>
    /// Generate or retrieve cached AI insight for a movie
    /// </summary>
    [HttpPost("insights")]
    [EnableRateLimiting("insights")]
    public async Task<ActionResult<AiInsightResponse>> GenerateInsight([FromBody] GenerateInsightRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Generate insight request for MovieId: {MovieId}, UserId: {UserId}", request.MovieId, userId);

        if (!IsPremiumUser())
        {
            _logger.LogWarning("Non-premium user attempted to access AI features");
            return StatusCode(403, new { error = "Premium feature", message = "AI features require a premium subscription" });
        }

        try
        {
            // Check if already cached
            var cached = await _aiInsightService.GetCachedInsightAsync(request.MovieId, userId);

            if (cached != null)
            {
                _logger.LogInformation("Returning cached insight");
                return Ok(cached);
            }

            // Generate new insight
            var insight = await _aiInsightService.GenerateInsightAsync(request.MovieId, userId);
            return Ok(insight);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when generating insight");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating insight for MovieId: {MovieId}", request.MovieId);
            return StatusCode(500, new { error = "Failed to generate insight", details = ex.Message });
        }
    }

    // GET: api/ai/insights/550
    /// <summary>
    /// Get cached AI insight for a movie
    /// </summary>
    [HttpGet("insights/{movieId}")]
    public async Task<ActionResult<AiInsightResponse>> GetInsight(int movieId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Get insight request for MovieId: {MovieId}, UserId: {UserId}", movieId, userId);

        if (!IsPremiumUser())
        {
            _logger.LogWarning("Non-premium user attempted to access AI features");
            return StatusCode(403, new { error = "Premium feature", message = "AI features require a premium subscription" });
        }

        var insight = await _aiInsightService.GetCachedInsightAsync(movieId, userId);

        if (insight == null)
        {
            return NotFound(new { error = "No insight found for this movie" });
        }

        return Ok(insight);
    }

    // POST: api/ai/insights/550/regenerate
    /// <summary>
    /// Force regeneration of AI insight for a movie
    /// </summary>
    [HttpPost("insights/{movieId}/regenerate")]
    [EnableRateLimiting("insights")]
    public async Task<ActionResult<AiInsightResponse>> RegenerateInsight(int movieId)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Regenerate insight request for MovieId: {MovieId}, UserId: {UserId}", movieId, userId);

        if (!IsPremiumUser())
        {
            _logger.LogWarning("Non-premium user attempted to access AI features");
            return StatusCode(403, new { error = "Premium feature", message = "AI features require a premium subscription" });
        }

        try
        {
            var insight = await _aiInsightService.RegenerateInsightAsync(movieId, userId);
            return Ok(insight);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when regenerating insight");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error regenerating insight for MovieId: {MovieId}", movieId);
            return StatusCode(500, new { error = "Failed to regenerate insight", details = ex.Message });
        }
    }

    // POST: api/ai/search
    /// <summary>
    /// Search watches using natural language
    /// </summary>
    [HttpPost("search")]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<AiSearchResponse>> SearchWatches([FromBody] AiSearchRequest request)
    {
        var userId = User.GetUserId();
        _logger.LogInformation("AI search request for UserId: {UserId}, Query: {Query}", userId, request.Query);

        if (!IsPremiumUser())
        {
            _logger.LogWarning("Non-premium user attempted to access AI features");
            return StatusCode(403, new { error = "Premium feature", message = "AI features require a premium subscription" });
        }

        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest(new { error = "Search query cannot be empty" });
        }

        try
        {
            var results = await _aiSearchService.SearchWatchesAsync(userId, request.Query);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing AI search");
            return StatusCode(500, new { error = "Failed to perform search", details = ex.Message });
        }
    }

    // GET: api/ai/usage
    /// <summary>
    /// Get AI usage statistics for current month
    /// </summary>
    [HttpGet("usage")]
    public async Task<ActionResult<AiUsageStatsResponse>> GetUsageStats()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Get usage stats request for UserId: {UserId}", userId);

        if (!IsPremiumUser())
        {
            _logger.LogWarning("Non-premium user attempted to access usage stats");
            return StatusCode(403, new { error = "Premium feature", message = "Usage statistics require a premium subscription" });
        }

        // Get usage for current month
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var usage = await _context.AiUsages
            .Where(u => u.UserId == userId && u.Timestamp >= startOfMonth)
            .ToListAsync();

        var response = new AiUsageStatsResponse
        {
            InsightsGenerated = usage.Count(u => u.Feature == "Insight"),
            SearchesPerformed = usage.Count(u => u.Feature == "Search"),
            TotalTokensUsed = usage.Sum(u => u.TokensUsed),
            TotalCost = usage.Sum(u => u.Cost),
            MonthStart = startOfMonth
        };

        return Ok(response);
    }

    private bool IsPremiumUser()
    {
        var premiumClaim = User.FindFirst("IsPremium");
        return premiumClaim != null && bool.Parse(premiumClaim.Value);
    }
}