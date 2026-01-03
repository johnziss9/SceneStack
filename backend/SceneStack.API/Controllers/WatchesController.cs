using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<WatchesController> _logger;

    public WatchesController(IWatchService watchService, IMovieService movieService, ILogger<WatchesController> logger)
    {
        _watchService = watchService;
        _movieService = movieService;
        _logger = logger;
    }

    // GET: api/watches
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WatchResponse>>> GetWatches()
    {
        var userId = User.GetUserId();
        var watches = await _watchService.GetAllAsync(userId);
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

    // GET: api/watches/grouped
    [HttpGet("grouped")]
    public async Task<ActionResult<List<GroupedWatchesResponse>>> GetGroupedWatches()
    {
        var userId = User.GetUserId();
        _logger.LogInformation("Getting grouped watches for user {UserId}", userId);
        
        var grouped = await _watchService.GetGroupedWatchesAsync(userId);
        
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
                IsRewatch = request.IsRewatch
            };

            var createdWatch = await _watchService.CreateAsync(watch);
            _logger.LogInformation("Successfully created watch with ID: {WatchId}", createdWatch.Id);

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
        var watch = new Watch
        {
            WatchedDate = DateTime.SpecifyKind(request.WatchedDate, DateTimeKind.Utc),
            Rating = request.Rating,
            Notes = request.Notes,
            WatchLocation = request.WatchLocation,
            WatchedWith = request.WatchedWith,
            IsRewatch = request.IsRewatch
        };

        var updatedWatch = await _watchService.UpdateAsync(id, watch);
        
        if (updatedWatch == null)
            return NotFound();

        return Ok(WatchMapper.ToResponse(updatedWatch));
    }

    // DELETE: api/watches/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWatch(int id)
    {
        var result = await _watchService.DeleteAsync(id);
        
        if (!result)
            return NotFound();

        return NoContent();
    }
}