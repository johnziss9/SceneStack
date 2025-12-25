using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MoviesController : ControllerBase
{
    private readonly IMovieService _movieService;

    public MoviesController(IMovieService movieService)
    {
        _movieService = movieService;
    }

    // GET: api/movies
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Movie>>> GetMovies()
    {
        var movies = await _movieService.GetAllAsync();
        
        return Ok(movies);
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