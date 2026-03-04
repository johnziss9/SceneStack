using System.Text.Json;
using Microsoft.Extensions.Options;
using SceneStack.API.Configuration;
using SceneStack.API.DTOs;

namespace SceneStack.API.Services;

// TMDb Genre ID mapping
public static class TmdbGenreIds
{
    public static readonly Dictionary<string, int> GenreToId = new()
    {
        { "Action", 28 },
        { "Adventure", 12 },
        { "Animation", 16 },
        { "Comedy", 35 },
        { "Crime", 80 },
        { "Documentary", 99 },
        { "Drama", 18 },
        { "Family", 10751 },
        { "Fantasy", 14 },
        { "History", 36 },
        { "Horror", 27 },
        { "Music", 10402 },
        { "Mystery", 9648 },
        { "Romance", 10749 },
        { "Science Fiction", 878 },
        { "TV Movie", 10770 },
        { "Thriller", 53 },
        { "War", 10752 },
        { "Western", 37 }
    };

    public static readonly Dictionary<int, string> IdToGenre = GenreToId.ToDictionary(x => x.Value, x => x.Key);
}

public class TmdbService : ITmdbService
{
    private readonly HttpClient _httpClient;
    private readonly TmdbSettings _settings;
    private readonly ILogger<TmdbService> _logger;

    public TmdbService(
        HttpClient httpClient, 
        IOptions<TmdbSettings> settings,
        ILogger<TmdbService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TmdbMovieSearchResult?> SearchMoviesAsync(string query, int page = 1)
    {
        try
        {
            var url = $"{_settings.BaseUrl}/search/movie?api_key={_settings.ApiKey}&query={Uri.EscapeDataString(query)}&page={page}";
            _logger.LogInformation("Calling TMDb URL: {Url}", url.Replace(_settings.ApiKey, "***"));
            
            var response = await _httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TmdbMovieSearchResult>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching movies with query: {Query}", query);
            return null;
        }
    }

    public async Task<TmdbMovie?> GetMovieDetailsAsync(int tmdbId)
    {
        try
        {
            var url = $"{_settings.BaseUrl}/movie/{tmdbId}?api_key={_settings.ApiKey}";
            _logger.LogInformation("Calling TMDb URL: {Url}", url.Replace(_settings.ApiKey, "***"));
            
            var response = await _httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode} for movie {TmdbId}", response.StatusCode, tmdbId);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TmdbMovie>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting movie details for TMDb ID: {TmdbId}", tmdbId);
            return null;
        }
    }

    public async Task<TmdbCreditsResult?> GetMovieCreditsAsync(int tmdbId)
    {
        try
        {
            var url = $"{_settings.BaseUrl}/movie/{tmdbId}/credits?api_key={_settings.ApiKey}";
            _logger.LogInformation("Calling TMDb URL: {Url}", url.Replace(_settings.ApiKey, "***"));

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode} for credits of movie {TmdbId}", response.StatusCode, tmdbId);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TmdbCreditsResult>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting credits for TMDb ID: {TmdbId}", tmdbId);
            return null;
        }
    }

    public async Task<TmdbMovieSearchResult?> GetPopularMoviesAsync(int page = 1)
    {
        try
        {
            var url = $"{_settings.BaseUrl}/movie/popular?api_key={_settings.ApiKey}&page={page}";
            _logger.LogInformation("Calling TMDb URL: {Url}", url.Replace(_settings.ApiKey, "***"));

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TmdbMovieSearchResult>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular movies");
            return null;
        }
    }

    public async Task<TmdbMovieSearchResult?> GetTrendingMoviesAsync(string timeWindow = "week")
    {
        try
        {
            // Validate timeWindow is either "day" or "week"
            if (timeWindow != "day" && timeWindow != "week")
            {
                _logger.LogWarning("Invalid time window: {TimeWindow}. Defaulting to 'week'", timeWindow);
                timeWindow = "week";
            }

            var url = $"{_settings.BaseUrl}/trending/movie/{timeWindow}?api_key={_settings.ApiKey}";
            _logger.LogInformation("Calling TMDb URL: {Url}", url.Replace(_settings.ApiKey, "***"));

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TmdbMovieSearchResult>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending movies for time window: {TimeWindow}", timeWindow);
            return null;
        }
    }

    public async Task<TmdbMovieSearchResult?> DiscoverMoviesAsync(
        List<int>? withGenres = null,
        double? voteAverageMin = null,
        int? voteCountMin = null,
        string sortBy = "popularity.desc",
        int page = 1)
    {
        try
        {
            var queryParams = new List<string>
            {
                $"api_key={_settings.ApiKey}",
                $"sort_by={sortBy}",
                $"page={page}",
                "include_adult=false"
            };

            if (withGenres != null && withGenres.Any())
            {
                queryParams.Add($"with_genres={string.Join(",", withGenres)}");
            }

            if (voteAverageMin.HasValue)
            {
                queryParams.Add($"vote_average.gte={voteAverageMin.Value}");
            }

            if (voteCountMin.HasValue)
            {
                queryParams.Add($"vote_count.gte={voteCountMin.Value}");
            }

            var url = $"{_settings.BaseUrl}/discover/movie?{string.Join("&", queryParams)}";
            _logger.LogInformation("Calling TMDb Discover URL: {Url}", url.Replace(_settings.ApiKey, "***"));

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TMDb API error: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();

            _logger.LogDebug("TMDb Discover response: {ResponseLength} chars, first 500 chars: {Preview}",
                content.Length, content.Substring(0, Math.Min(500, content.Length)));

            // Parse the raw JSON to get genre_ids and map them to genre names
            using var jsonDoc = JsonDocument.Parse(content);

            if (!jsonDoc.RootElement.TryGetProperty("results", out var resultsProperty))
            {
                _logger.LogWarning("No 'results' property in Discover API response");
                return null;
            }

            var resultsArray = resultsProperty.EnumerateArray().ToList();

            var totalAvailable = jsonDoc.RootElement.TryGetProperty("total_results", out var tr) ? tr.GetInt32() : 0;
            _logger.LogInformation("TMDb Discover returned {Count} movies on this page, {Total} total results available",
                resultsArray.Count, totalAvailable);

            var movies = new List<TmdbMovie>();

            foreach (var movieElement in resultsArray)
            {
                var movie = new TmdbMovie
                {
                    Id = movieElement.GetProperty("id").GetInt32(),
                    Title = movieElement.GetProperty("title").GetString() ?? "",
                    ReleaseDate = movieElement.TryGetProperty("release_date", out var rd) ? rd.GetString() : null,
                    PosterPath = movieElement.TryGetProperty("poster_path", out var pp) ? pp.GetString() : null,
                    BackdropPath = movieElement.TryGetProperty("backdrop_path", out var bp) ? bp.GetString() : null,
                    Overview = movieElement.TryGetProperty("overview", out var ov) ? ov.GetString() : null,
                    VoteAverage = movieElement.TryGetProperty("vote_average", out var va) ? va.GetDouble() : 0,
                    VoteCount = movieElement.TryGetProperty("vote_count", out var vc) ? vc.GetInt32() : 0
                };

                // Map genre IDs to genre names
                if (movieElement.TryGetProperty("genre_ids", out var genreIdsElement))
                {
                    var genreIds = genreIdsElement.EnumerateArray()
                        .Select(e => e.GetInt32())
                        .ToList();

                    movie.Genres = genreIds
                        .Where(id => TmdbGenreIds.IdToGenre.ContainsKey(id))
                        .Select(id => new TmdbGenre
                        {
                            Id = id,
                            Name = TmdbGenreIds.IdToGenre[id]
                        })
                        .ToList();
                }

                movies.Add(movie);
            }

            var resultPage = jsonDoc.RootElement.GetProperty("page").GetInt32();
            var totalPages = jsonDoc.RootElement.GetProperty("total_pages").GetInt32();
            var totalResults = jsonDoc.RootElement.GetProperty("total_results").GetInt32();

            return new TmdbMovieSearchResult
            {
                Page = resultPage,
                TotalPages = totalPages,
                TotalResults = totalResults,
                Results = movies
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error discovering movies with genres: {Genres}",
                withGenres != null ? string.Join(",", withGenres) : "none");
            return null;
        }
    }
}