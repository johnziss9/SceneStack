using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IMovieService
{
    Task<Movie?> GetByIdAsync(int id);
    Task<IEnumerable<Movie>> GetAllAsync();
    Task<Movie> CreateAsync(Movie movie);
    Task<Movie?> UpdateAsync(int id, Movie movie);
    Task<bool> DeleteAsync(int id);
    Task<Movie?> GetByTmdbIdAsync(int tmdbId);
    Task<Movie?> GetOrCreateFromTmdbAsync(int tmdbId);
}