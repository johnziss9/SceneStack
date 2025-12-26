using System.Text.Json;
using Microsoft.Extensions.Options;
using SceneStack.API.Configuration;
using SceneStack.API.DTOs;

namespace SceneStack.API.Services;

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
}