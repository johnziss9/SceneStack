using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;
    private readonly ILogger<StatsController> _logger;

    public StatsController(IStatsService statsService, ILogger<StatsController> logger)
    {
        _statsService = statsService;
        _logger = logger;
    }

    // GET: api/stats
    [HttpGet]
    public async Task<ActionResult<UserStatsResponse>> GetStats()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting stats for user {UserId}", userId);

        try
        {
            var stats = await _statsService.GetUserStatsAsync(userId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stats for user {UserId}", userId);
            return StatusCode(500, "Error retrieving stats");
        }
    }
}
