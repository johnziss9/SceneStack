using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;
    private readonly ITmdbService _tmdbService;
    private readonly IGroupRecommendationsService _recommendationsService;
    private readonly ILogger<MoviesController> _logger;

    public MoviesController(
        IMovieService movieService,
        ITmdbService tmdbService,
        IGroupRecommendationsService recommendationsService,
        ILogger<MoviesController> logger)
    {
        _movieService = movieService;
        _tmdbService = tmdbService;
        _recommendationsService = recommendationsService;
        _logger = logger;
    }

    // GET: api/movies
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Movie>>> GetMovies()
    {
        var movies = await _movieService.GetAllAsync();
        return Ok(movies);
    }

    // GET: api/movies/search?query=fight%20club&page=1
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<TmdbMovieSearchResult>> SearchMovies([FromQuery] string query, [FromQuery] int page = 1)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query is required");

        var result = await _tmdbService.SearchMoviesAsync(query, page);

        if (result == null)
            return StatusCode(500, "Error searching movies");

        return Ok(result);
    }

    // GET: api/movies/trending/week
    [HttpGet("trending/{timeWindow}")]
    [AllowAnonymous]
    public async Task<ActionResult<TmdbMovieSearchResult>> GetTrendingMovies(string timeWindow = "week")
    {
        var result = await _tmdbService.GetTrendingMoviesAsync(timeWindow);

        if (result == null)
            return StatusCode(500, "Error fetching trending movies");

        return Ok(result);
    }

    // GET: api/movies/tmdb/550
    // Serves enriched movie detail from the DB (creating it on first access)
    [HttpGet("tmdb/{tmdbId}")]
    [AllowAnonymous]
    public async Task<ActionResult<MovieDetailResponse>> GetTmdbMovie(int tmdbId)
    {
        // Always go through GetOrCreateFromTmdbAsync — it handles creation,
        // soft-delete restoration, and back-fills enriched metadata for older records
        var movie = await _movieService.GetOrCreateFromTmdbAsync(tmdbId);

        if (movie == null)
            return NotFound();

        return Ok(ToDetailResponse(movie));
    }

    // GET: api/movies/tmdb/550/my-status  (authenticated)
    // Returns the current user's watch + watchlist state for a movie
    [HttpGet("tmdb/{tmdbId}/my-status")]
    public async Task<ActionResult<MovieUserStatus>> GetMyStatus(int tmdbId)
    {
        var userId = User.GetUserId();
        var status = await _movieService.GetMyStatusAsync(userId, tmdbId);
        return Ok(status);
    }

    // GET: api/movies/tmdb/550/similar  (authenticated)
    // Returns similar movies based on the movie's attributes (genres, directors, writers, cast)
    [HttpGet("tmdb/{tmdbId}/similar")]
    public async Task<ActionResult<List<RecommendedMovie>>> GetSimilarMovies(int tmdbId)
    {
        var userId = User.GetUserId();

        try
        {
            var recommendations = await _recommendationsService
                .GetMovieSimilarRecommendationsAsync(tmdbId, userId, 12);

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar movies for tmdbId {TmdbId}", tmdbId);
            return StatusCode(500, $"Error getting similar movies: {ex.Message}");
        }
    }

    // PUT: api/movies/5/privacy
    // Updates privacy settings for a movie
    [HttpPut("{id}/privacy")]
    public async Task<IActionResult> UpdateMoviePrivacy(int id, UpdateMoviePrivacyRequest request)
    {
        var userId = User.GetUserId();
        await _movieService.SetPrivacyAsync(id, userId, request.IsPrivate, request.GroupIds);
        return NoContent();
    }

    // GET: api/movies/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Movie>> GetMovie(int id)
    {
        var movie = await _movieService.GetByIdAsync(id);

        if (movie == null)
            return NotFound();

        return Ok(movie);
    }

    // POST: api/movies
    [HttpPost]
    public async Task<ActionResult<Movie>> CreateMovie(Movie movie)
    {
        var createdMovie = await _movieService.CreateAsync(movie);
        return CreatedAtAction(nameof(GetMovie), new { id = createdMovie.Id }, createdMovie);
    }

    // PUT: api/movies/5
    [HttpPut("{id}")]
    public async Task<ActionResult<Movie>> UpdateMovie(int id, Movie movie)
    {
        var updatedMovie = await _movieService.UpdateAsync(id, movie);

        if (updatedMovie == null)
            return NotFound();

        return Ok(updatedMovie);
    }

    // DELETE: api/movies/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMovie(int id)
    {
        var result = await _movieService.DeleteAsync(id);

        if (!result)
            return NotFound();

        return NoContent();
    }

    private static MovieDetailResponse ToDetailResponse(Movie movie) =>
        new()
        {
            Id = movie.Id,
            TmdbId = movie.TmdbId,
            Title = movie.Title,
            Year = movie.Year,
            PosterPath = movie.PosterPath,
            BackdropPath = movie.BackdropPath,
            Synopsis = movie.Synopsis,
            AiSynopsis = movie.AiSynopsis,
            Tagline = movie.Tagline,
            Runtime = movie.Runtime,
            Genres = movie.Genres,
            TmdbRating = movie.TmdbRating,
            TmdbVoteCount = movie.TmdbVoteCount,
            DirectorName = movie.DirectorName,
            DirectorProfilePath = movie.DirectorProfilePath,
            Directors = movie.Directors.Select(d => new DirectorMemberResponse
            {
                PersonId = d.PersonId,
                Name = d.Name,
                ProfilePath = d.ProfilePath
            }).ToList(),
            WriterName = movie.WriterName,
            WriterProfilePath = movie.WriterProfilePath,
            Writers = movie.Writers.Select(w => new WriterMemberResponse
            {
                PersonId = w.PersonId,
                Name = w.Name,
                Job = w.Job,
                ProfilePath = w.ProfilePath
            }).ToList(),
            Cast = movie.Cast.Select(c => new CastMemberResponse
            {
                PersonId = c.PersonId,
                Name = c.Name,
                Character = c.Character,
                ProfilePath = c.ProfilePath
            }).ToList()
        };
}
