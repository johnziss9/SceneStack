using SceneStack.API.DTOs;

namespace SceneStack.API.Services;

public interface ITmdbService
{
    Task<TmdbMovieSearchResult?> SearchMoviesAsync(string query, int page = 1);
    Task<TmdbMovie?> GetMovieDetailsAsync(int tmdbId);
}