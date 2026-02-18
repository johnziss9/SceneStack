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

    public MoviesController(IMovieService movieService, ITmdbService tmdbService)
    {
        _movieService = movieService;
        _tmdbService = tmdbService;
    }

    // GET: api/movies
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Movie>>> GetMovies()
    {
        var movies = await _movieService.GetAllAsync();
        return Ok(movies);
    }

    // GET: api/movies/search?query=fight%20club
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<TmdbMovieSearchResult>> SearchMovies([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query is required");

        var result = await _tmdbService.SearchMoviesAsync(query);

        if (result == null)
            return StatusCode(500, "Error searching movies");

        return Ok(result);
    }

    // GET: api/movies/tmdb/550
    // Serves enriched movie detail from the DB (creating it on first access)
    [HttpGet("tmdb/{tmdbId}")]
    [AllowAnonymous]
    public async Task<ActionResult<MovieDetailResponse>> GetTmdbMovie(int tmdbId)
    {
        // Try DB first; create (with full enrichment) on first access
        var movie = await _movieService.GetByTmdbIdAsync(tmdbId)
                    ?? await _movieService.GetOrCreateFromTmdbAsync(tmdbId);

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
            Cast = movie.Cast.Select(c => new CastMemberResponse
            {
                Name = c.Name,
                Character = c.Character,
                ProfilePath = c.ProfilePath
            }).ToList()
        };
}
