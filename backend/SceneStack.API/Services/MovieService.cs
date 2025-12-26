using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class MovieService : IMovieService
{
    private readonly ApplicationDbContext _context;
    private readonly ITmdbService _tmdbService;
    private readonly ILogger<MovieService> _logger;

    public MovieService(ApplicationDbContext context, ITmdbService tmdbService, ILogger<MovieService> logger)
    {
        _context = context;
        _tmdbService = tmdbService;
        _logger = logger;
    }

    public async Task<Movie?> GetByIdAsync(int id)
    {
        return await _context.Movies.FindAsync(id);
    }

    public async Task<IEnumerable<Movie>> GetAllAsync()
    {
        return await _context.Movies.ToListAsync();
    }

    public async Task<Movie> CreateAsync(Movie movie)
    {
        movie.CreatedAt = DateTime.UtcNow;
        _context.Movies.Add(movie);
        await _context.SaveChangesAsync();
        return movie;
    }

    public async Task<Movie?> UpdateAsync(int id, Movie movie)
    {
        var existingMovie = await _context.Movies.FindAsync(id);
        if (existingMovie == null)
            return null;

        existingMovie.Title = movie.Title;
        existingMovie.Year = movie.Year;
        existingMovie.PosterPath = movie.PosterPath;
        existingMovie.Synopsis = movie.Synopsis;
        existingMovie.AiSynopsis = movie.AiSynopsis;

        await _context.SaveChangesAsync();
        return existingMovie;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var movie = await _context.Movies
            .IgnoreQueryFilters() // Include soft-deleted to find it
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        
        if (movie == null)
            return false;

        movie.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<Movie?> GetByTmdbIdAsync(int tmdbId)
    {
        return await _context.Movies
            .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);
    }

    public async Task<Movie> GetOrCreateFromTmdbAsync(int tmdbId)
    {
        _logger.LogInformation("Getting or creating movie from TMDb with ID: {TmdbId}", tmdbId);

        // Check if movie exists (including soft-deleted ones)
        var existingMovie = await _context.Movies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);

        if (existingMovie != null)
        {
            // If movie was soft-deleted, restore it
            if (existingMovie.IsDeleted)
            {
                _logger.LogInformation("Restoring soft-deleted movie with ID: {MovieId}", existingMovie.Id);
                existingMovie.IsDeleted = false;
                existingMovie.DeletedAt = null;
                await _context.SaveChangesAsync();
            }
            
            _logger.LogInformation("Movie already exists in database with ID: {MovieId}", existingMovie.Id);
            return existingMovie;
        }

        // Fetch from TMDb
        var tmdbMovie = await _tmdbService.GetMovieDetailsAsync(tmdbId);
        if (tmdbMovie == null)
        {
            _logger.LogError("Movie with TMDb ID {TmdbId} not found in TMDb", tmdbId);
            throw new Exception($"Movie with TMDb ID {tmdbId} not found in TMDb");
        }

        // Map TMDb movie to local Movie model
        var movie = new Movie
        {
            TmdbId = tmdbMovie.Id,
            Title = tmdbMovie.Title,
            Year = !string.IsNullOrEmpty(tmdbMovie.ReleaseDate) && DateTime.TryParse(tmdbMovie.ReleaseDate, out var releaseDate) 
                ? releaseDate.Year 
                : null,
            PosterPath = tmdbMovie.PosterPath,
            Synopsis = tmdbMovie.Overview,
            CreatedAt = DateTime.UtcNow
        };

        // Save to local database
        var createdMovie = await CreateAsync(movie);
        _logger.LogInformation("Successfully created movie in database with ID: {MovieId}", createdMovie.Id);

        return createdMovie;
    }
}