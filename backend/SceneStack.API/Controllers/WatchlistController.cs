using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WatchlistController : ControllerBase
{
    private readonly IWatchlistService _watchlistService;
    private readonly ILogger<WatchlistController> _logger;

    public WatchlistController(IWatchlistService watchlistService, ILogger<WatchlistController> logger)
    {
        _watchlistService = watchlistService;
        _logger = logger;
    }

    // GET /api/watchlist?page=1&pageSize=20
    [HttpGet]
    public async Task<ActionResult<PaginatedWatchlistResponse>> GetWatchlist(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.GetUserId();
        var result = await _watchlistService.GetWatchlistAsync(userId, page, pageSize);
        return Ok(result);
    }

    // GET /api/watchlist/count
    [HttpGet("count")]
    public async Task<ActionResult<object>> GetCount()
    {
        var userId = User.GetUserId();
        var count = await _watchlistService.GetWatchlistCountAsync(userId);
        return Ok(new { count });
    }

    // POST /api/watchlist
    [HttpPost]
    public async Task<ActionResult<WatchlistItemResponse>> AddToWatchlist([FromBody] AddToWatchlistRequest request)
    {
        var userId = User.GetUserId();

        try
        {
            var canAdd = await _watchlistService.CanAddToWatchlistAsync(userId);
            if (!canAdd)
                return StatusCode(403, new { message = "Free tier watchlist limit of 50 movies reached. Upgrade to Premium for unlimited watchlist." });

            var item = await _watchlistService.AddToWatchlistAsync(userId, request.TmdbId, request.Notes, request.Priority);
            return CreatedAtAction(nameof(GetWatchlist), new WatchlistItemResponse
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
            });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Failed to retrieve movie"))
        {
            _logger.LogError(ex, "Failed to fetch movie from TMDb for ID {TmdbId}", request.TmdbId);
            return StatusCode(500, new { message = "Failed to retrieve movie from TMDb." });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex) when (ex.InnerException?.Message.Contains("unique") == true
            || ex.InnerException?.Message.Contains("duplicate") == true)
        {
            return Conflict(new { message = "This movie is already on your watchlist." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding movie to watchlist for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while adding to watchlist." });
        }
    }

    // DELETE /api/watchlist/{movieId}
    [HttpDelete("{movieId:int}")]
    public async Task<IActionResult> RemoveFromWatchlist(int movieId)
    {
        var userId = User.GetUserId();
        var removed = await _watchlistService.RemoveFromWatchlistAsync(userId, movieId);

        if (!removed)
            return NotFound(new { message = "Watchlist item not found." });

        return NoContent();
    }

    // PUT /api/watchlist/{movieId}
    [HttpPut("{movieId:int}")]
    public async Task<ActionResult<WatchlistItemResponse>> UpdateWatchlistItem(
        int movieId,
        [FromBody] UpdateWatchlistItemRequest request)
    {
        var userId = User.GetUserId();
        var item = await _watchlistService.UpdateWatchlistItemAsync(userId, movieId, request);

        if (item == null)
            return NotFound(new { message = "Watchlist item not found." });

        return Ok(new WatchlistItemResponse
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
        });
    }
}
