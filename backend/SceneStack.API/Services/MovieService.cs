using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class MovieService : IMovieService
{
    private readonly ApplicationDbContext _context;

    public MovieService(ApplicationDbContext context)
    {
        _context = context;
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
}