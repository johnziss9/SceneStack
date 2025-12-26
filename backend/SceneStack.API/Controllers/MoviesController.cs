using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    [HttpGet("tmdb/{tmdbId}")]
    public async Task<ActionResult<TmdbMovie>> GetTmdbMovie(int tmdbId)
    {
        var movie = await _tmdbService.GetMovieDetailsAsync(tmdbId);
        
        if (movie == null)
            return NotFound();

        return Ok(movie);
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
}