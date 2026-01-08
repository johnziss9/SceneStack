using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SceneStack.API.Configuration;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class AiInsightService : IAiInsightService
{
    private readonly ApplicationDbContext _context;
    private readonly IMovieService _movieService;
    private readonly IWatchService _watchService;
    private readonly ClaudeApiSettings _claudeSettings;
    private readonly ILogger<AiInsightService> _logger;
    private readonly AnthropicClient _anthropicClient;

    public AiInsightService(
        ApplicationDbContext context,
        IMovieService movieService,
        IWatchService watchService,
        IOptions<ClaudeApiSettings> claudeSettings,
        ILogger<AiInsightService> logger)
    {
        _context = context;
        _movieService = movieService;
        _watchService = watchService;
        _claudeSettings = claudeSettings.Value;
        _logger = logger;
        _anthropicClient = new AnthropicClient(_claudeSettings.ApiKey);
    }

    public async Task<AiInsightResponse?> GetCachedInsightAsync(int movieId, int userId)
    {
        _logger.LogInformation("Getting cached insight for MovieId: {MovieId}, UserId: {UserId}", movieId, userId);

        var insight = await _context.AiInsights
            .FirstOrDefaultAsync(ai => ai.MovieId == movieId && ai.UserId == userId);

        if (insight == null)
        {
            _logger.LogInformation("No cached insight found");
            return null;
        }

        return new AiInsightResponse
        {
            Id = insight.Id,
            MovieId = insight.MovieId,
            Content = insight.Content,
            GeneratedAt = insight.GeneratedAt,
            Cached = true,
            TokensUsed = insight.TokensUsed,
            Cost = insight.Cost
        };
    }

    public async Task<AiInsightResponse> GenerateInsightAsync(int movieId, int userId)
    {
        _logger.LogInformation("Generating AI insight for MovieId: {MovieId}, UserId: {UserId}", movieId, userId);

        // Get movie details
        var movie = await _movieService.GetByIdAsync(movieId);
        if (movie == null)
        {
            throw new InvalidOperationException($"Movie with ID {movieId} not found");
        }

        // Get all watches for this movie by this user
        var watches = await _context.Watches
            .Where(w => w.MovieId == movieId && w.UserId == userId)
            .OrderBy(w => w.WatchedDate)
            .ToListAsync();

        if (!watches.Any())
        {
            throw new InvalidOperationException($"User has not watched this movie yet");
        }

        // Build context for Claude
        var watchContext = BuildWatchContext(movie, watches);
        var prompt = BuildInsightPrompt(movie, watchContext);

        _logger.LogInformation("Calling Claude API to generate insight");

        // Call Claude API
        var messages = new List<Message>
        {
            new Message(RoleType.User, prompt)
        };

        var parameters = new MessageParameters
        {
            Messages = messages,
            Model = _claudeSettings.Model,
            MaxTokens = _claudeSettings.MaxTokens,
            Temperature = _claudeSettings.Temperature
        };

        var response = await _anthropicClient.Messages.GetClaudeMessageAsync(parameters);

        // Extract content and token usage
        var textContent = response.Content.FirstOrDefault() as TextContent;
        string content = textContent?.Text ?? string.Empty;
        var inputTokens = response.Usage.InputTokens;
        var outputTokens = response.Usage.OutputTokens;
        var totalTokens = inputTokens + outputTokens;

        // Calculate cost (Claude pricing as of Jan 2025)
        // Input: $3 per million tokens, Output: $15 per million tokens
        var inputCost = (inputTokens / 1_000_000m) * 3m;
        var outputCost = (outputTokens / 1_000_000m) * 15m;
        var totalCost = inputCost + outputCost;

        _logger.LogInformation("Claude API response received. Tokens: {Tokens}, Cost: ${Cost:F4}", totalTokens, totalCost);

        // Save to database
        var insight = new AiInsight
        {
            MovieId = movieId,
            UserId = userId,
            Content = content,
            GeneratedAt = DateTime.UtcNow,
            TokensUsed = totalTokens,
            Cost = totalCost,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AiInsights.Add(insight);
        
        // Track usage
        var usage = new AiUsage
        {
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Feature = "Insight",
            TokensUsed = totalTokens,
            Cost = totalCost
        };
        _context.AiUsages.Add(usage);
        
        await _context.SaveChangesAsync();

        _logger.LogInformation("AI insight saved to database with ID: {InsightId}", insight.Id);

        return new AiInsightResponse
        {
            Id = insight.Id,
            MovieId = insight.MovieId,
            Content = insight.Content,
            GeneratedAt = insight.GeneratedAt,
            Cached = false,
            TokensUsed = insight.TokensUsed,
            Cost = insight.Cost
        };
    }

    public async Task<AiInsightResponse> RegenerateInsightAsync(int movieId, int userId)
    {
        _logger.LogInformation("Regenerating AI insight for MovieId: {MovieId}, UserId: {UserId}", movieId, userId);

        // Delete existing insight if it exists
        var existingInsight = await _context.AiInsights
            .FirstOrDefaultAsync(ai => ai.MovieId == movieId && ai.UserId == userId);

        if (existingInsight != null)
        {
            _logger.LogInformation("Deleting existing insight with ID: {InsightId}", existingInsight.Id);
            _context.AiInsights.Remove(existingInsight);
            await _context.SaveChangesAsync();
        }

        // Generate new insight
        return await GenerateInsightAsync(movieId, userId);
    }

    private string BuildWatchContext(Movie movie, List<Watch> watches)
    {
        var context = $"Movie: {movie.Title}";
        if (movie.Year.HasValue)
        {
            context += $" ({movie.Year})";
        }
        context += "\n";

        if (!string.IsNullOrEmpty(movie.Synopsis))
        {
            context += $"\nPlot: {movie.Synopsis}\n";
        }

        context += $"\nYou have watched this movie {watches.Count} time(s):\n\n";

        foreach (var watch in watches)
        {
            context += $"- {watch.WatchedDate:MMMM d, yyyy}";

            if (!string.IsNullOrEmpty(watch.WatchLocation))
            {
                context += $" at {watch.WatchLocation}";
            }

            if (!string.IsNullOrEmpty(watch.WatchedWith))
            {
                context += $" with {watch.WatchedWith}";
            }

            if (watch.Rating.HasValue)
            {
                context += $", rated {watch.Rating}/10";
            }

            if (!string.IsNullOrEmpty(watch.Notes))
            {
                context += $"\n  Notes: \"{watch.Notes}\"";
            }

            context += "\n";
        }

        return context;
    }

    private string BuildInsightPrompt(Movie movie, string watchContext)
    {
        return $@"You are helping a user remember their personal movie-watching experiences. Create a personalized insight that combines the movie's plot with the user's viewing history. Focus on their journey with this film over time.

{watchContext}

Generate a 2-3 paragraph personalized insight about this user's relationship with this film. Include:
1. How many times they've watched it and over what time period
2. Their ratings and how consistent they've been
3. Notable viewing contexts (where, with whom)
4. Key themes from their notes (if provided)
5. A brief connection to what the movie is about

Write in a warm, personal tone as if you're helping them remember their experiences. Don't just summarize the plot - focus on THEIR journey with the film.";
    }
}