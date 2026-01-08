using System.Text.Json;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SceneStack.API.Configuration;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Mappers;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class AiSearchService : IAiSearchService
{
    private readonly ApplicationDbContext _context;
    private readonly ClaudeApiSettings _claudeSettings;
    private readonly ILogger<AiSearchService> _logger;
    private readonly AnthropicClient _anthropicClient;

    public AiSearchService(
        ApplicationDbContext context,
        IOptions<ClaudeApiSettings> claudeSettings,
        ILogger<AiSearchService> logger)
    {
        _context = context;
        _claudeSettings = claudeSettings.Value;
        _logger = logger;
        _anthropicClient = new AnthropicClient(_claudeSettings.ApiKey);
    }

    public async Task<AiSearchResponse> SearchWatchesAsync(int userId, string query)
    {
        _logger.LogInformation("Performing AI search for UserId: {UserId}, Query: {Query}", userId, query);

        // Get all watches for this user with movie details
        var watches = await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();

        if (!watches.Any())
        {
            _logger.LogInformation("User has no watches to search");
            return new AiSearchResponse
            {
                Results = new List<WatchResponse>(),
                TotalMatches = 0,
                TokensUsed = 0,
                Cost = 0
            };
        }

        // Build searchable context
        var searchContext = BuildSearchContext(watches);
        var prompt = BuildSearchPrompt(query, searchContext);

        _logger.LogInformation("Calling Claude API for search");

        // Call Claude API
        var messages = new List<Message>
        {
            new Message(RoleType.User, prompt)
        };

        var parameters = new MessageParameters
        {
            Messages = messages,
            Model = _claudeSettings.Model,
            MaxTokens = 1000, // Higher for search results
            Temperature = 0.3m // Lower temperature for more precise matching
        };

        var response = await _anthropicClient.Messages.GetClaudeMessageAsync(parameters);

        // Extract content and token usage
        var textContent = response.Content.FirstOrDefault() as TextContent;
        string content = textContent?.Text ?? string.Empty;
        var inputTokens = response.Usage.InputTokens;
        var outputTokens = response.Usage.OutputTokens;
        var totalTokens = inputTokens + outputTokens;

        // Calculate cost
        var inputCost = (inputTokens / 1_000_000m) * 3m;
        var outputCost = (outputTokens / 1_000_000m) * 15m;
        var totalCost = inputCost + outputCost;

        _logger.LogInformation("Claude API search response received. Tokens: {Tokens}, Cost: ${Cost:F4}", totalTokens, totalCost);

        // Parse the response to get watch IDs
        var matchingWatchIds = ParseSearchResponse(content);

        // Filter watches by matched IDs
        var matchingWatches = watches
            .Where(w => matchingWatchIds.Contains(w.Id))
            .Select(w => WatchMapper.ToResponse(w))
            .ToList();

        // Track usage
        var usage = new AiUsage
        {
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Feature = "Search",
            TokensUsed = totalTokens,
            Cost = totalCost
        };
        _context.AiUsages.Add(usage);
        await _context.SaveChangesAsync();

        return new AiSearchResponse
        {
            Results = matchingWatches,
            TotalMatches = matchingWatches.Count,
            TokensUsed = totalTokens,
            Cost = totalCost
        };
    }

    private string BuildSearchContext(List<SceneStack.API.Models.Watch> watches)
    {
        var context = "Available watches:\n\n";

        foreach (var watch in watches)
        {
            context += $"Watch ID: {watch.Id}\n";
            context += $"Movie: {watch.Movie.Title}";
            if (watch.Movie.Year.HasValue)
            {
                context += $" ({watch.Movie.Year})";
            }
            context += "\n";
            context += $"Date: {watch.WatchedDate:MMMM d, yyyy}\n";

            if (!string.IsNullOrEmpty(watch.WatchLocation))
            {
                context += $"Location: {watch.WatchLocation}\n";
            }

            if (!string.IsNullOrEmpty(watch.WatchedWith))
            {
                context += $"Watched with: {watch.WatchedWith}\n";
            }

            if (watch.Rating.HasValue)
            {
                context += $"Rating: {watch.Rating}/10\n";
            }

            if (!string.IsNullOrEmpty(watch.Notes))
            {
                context += $"Notes: {watch.Notes}\n";
            }

            context += "\n";
        }

        return context;
    }

    private string BuildSearchPrompt(string query, string searchContext)
    {
        return $@"You are helping a user search their movie watch history using natural language.

User Query: ""{query}""

{searchContext}

Analyze the query and return ONLY a JSON array of watch IDs that match the user's search. Consider:
- Movie titles (exact and partial matches)
- Watch dates and time periods (""last summer"", ""last year"", ""recently"", specific dates)
- Locations (cinema, home, etc.)
- Who they watched with
- Their notes and comments
- Ratings

Return your response as a valid JSON array of integers, nothing else. For example: [1, 5, 8]

If no watches match, return an empty array: []";
    }

    private List<int> ParseSearchResponse(string content)
    {
        try
        {
            // Clean up the response (remove any markdown code blocks)
            content = content.Trim();
            if (content.StartsWith("```"))
            {
                var lines = content.Split('\n');
                content = string.Join('\n', lines.Skip(1).SkipLast(1));
                content = content.Trim();
            }

            // Parse JSON array
            var watchIds = JsonSerializer.Deserialize<List<int>>(content);
            return watchIds ?? new List<int>();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Claude search response: {Content}", content);
            return new List<int>();
        }
    }
}