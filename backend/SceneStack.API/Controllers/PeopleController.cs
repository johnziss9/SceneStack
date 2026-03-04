using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PeopleController : ControllerBase
{
    private readonly ITmdbService _tmdbService;

    public PeopleController(ITmdbService tmdbService)
    {
        _tmdbService = tmdbService;
    }

    // GET: api/people/search?query=scorsese&page=1
    [HttpGet("search")]
    public async Task<ActionResult<TmdbPersonSearchResult>> SearchPeople(
        [FromQuery] string query,
        [FromQuery] int page = 1)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query is required");

        var result = await _tmdbService.SearchPeopleAsync(query, page);

        if (result == null)
            return StatusCode(500, "Error searching people");

        return Ok(result);
    }

    // GET: api/people/550/movies
    [HttpGet("{personId}/movies")]
    public async Task<ActionResult<TmdbPersonMovieCredits>> GetPersonMovies(int personId)
    {
        var result = await _tmdbService.GetPersonMovieCreditsAsync(personId);

        if (result == null)
            return StatusCode(500, "Error fetching person's movies");

        return Ok(result);
    }
}
