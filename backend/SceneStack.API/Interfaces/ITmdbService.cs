using SceneStack.API.DTOs;

namespace SceneStack.API.Services;

public interface ITmdbService
{
    Task<TmdbMovieSearchResult?> SearchMoviesAsync(string query, int page = 1);
    Task<TmdbMovie?> GetMovieDetailsAsync(int tmdbId);
    Task<TmdbCreditsResult?> GetMovieCreditsAsync(int tmdbId);
    Task<TmdbMovieSearchResult?> GetPopularMoviesAsync(int page = 1);
    Task<TmdbMovieSearchResult?> GetTrendingMoviesAsync(string timeWindow = "week");
    Task<TmdbMovieSearchResult?> DiscoverMoviesAsync(
        List<int>? withGenres = null,
        double? voteAverageMin = null,
        int? voteCountMin = null,
        string sortBy = "popularity.desc",
        int page = 1);
    Task<TmdbPersonSearchResult?> SearchPeopleAsync(string query, int page = 1);
    Task<TmdbPersonMovieCredits?> GetPersonMovieCreditsAsync(int personId);
}