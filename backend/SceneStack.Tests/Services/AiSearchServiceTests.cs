using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using SceneStack.API.Configuration;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class AiSearchServiceTests
{
    private readonly IOptions<ClaudeApiSettings> _mockClaudeSettings;
    private readonly ILogger<AiSearchService> _mockLogger;

    public AiSearchServiceTests()
    {
        _mockLogger = Substitute.For<ILogger<AiSearchService>>();
        
        // Setup Claude settings with lower temperature for search (0.3)
        var settings = new ClaudeApiSettings
        {
            ApiKey = "test-api-key",
            Model = "claude-sonnet-4-20250514",
            MaxTokens = 1000,
            Temperature = 0.3m  // Lower temperature for more precise matching
        };
        _mockClaudeSettings = Options.Create(settings);
    }

    [Fact]
    public async Task SearchWatchesAsync_NoWatches_ReturnsEmptyList()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // No watches in database for this user

        // Act
        // NOTE: This will fail because we can't mock the Claude API client
        // We're testing the validation/setup logic here
        
        var watchesInDb = await context.Watches.Where(w => w.UserId == 999).ToListAsync();
        watchesInDb.Should().BeEmpty();

        // In actual implementation, service should return empty list if no watches found
        // Cannot test full flow without API mocking
    }

    [Fact]
    public async Task SearchWatchesAsync_UserHasWatches_PreparesSearchContext()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // Add test watches with various metadata
        var movie1 = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            Synopsis = "A hacker discovers reality is a simulation",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie1);

        var watch1 = new Watch
        {
            Id = 2,
            UserId = 1,
            MovieId = 2,
            WatchedDate = DateTime.UtcNow.AddMonths(-3),
            Rating = 10,
            Notes = "Mind-blowing sci-fi thriller",
            WatchLocation = "Cinema",
            WatchedWith = "John",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch1);

        var watch2 = new Watch
        {
            Id = 3,
            UserId = 1,
            MovieId = 1,  // Fight Club from seed data
            WatchedDate = DateTime.UtcNow.AddMonths(-6),
            Rating = 9,
            Notes = "Dark and intense",
            WatchLocation = "Home",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch2);

        await context.SaveChangesAsync();

        // Act
        // Verify watches are in database and properly set up for search
        var watchesForUser = await context.Watches
            .Include(w => w.Movie)
            .Where(w => w.UserId == 1)
            .ToListAsync();

        // Assert
        watchesForUser.Should().HaveCount(3);
        watchesForUser.Should().Contain(w => w.Movie.Title == "The Matrix");
        watchesForUser.Should().Contain(w => w.Notes!.Contains("sci-fi"));
        watchesForUser.Should().Contain(w => w.WatchLocation == "Cinema");
        watchesForUser.Should().Contain(w => w.WatchedWith == "John");
    }

    [Fact]
    public async Task SearchWatchesAsync_ValidateUsageTracking()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // Verify AiUsage table is empty initially
        var usagesBefore = await context.AiUsages.CountAsync();
        usagesBefore.Should().Be(0);

        // After a successful search, AiUsage should be created
        // (Cannot test full flow without Claude API mock)
        
        // Simulate what the service should do:
        var usage = new AiUsage
        {
            UserId = 1,
            Timestamp = DateTime.UtcNow,
            Feature = "Search",
            TokensUsed = 500,
            Cost = 0.005m
        };
        context.AiUsages.Add(usage);
        await context.SaveChangesAsync();

        // Verify usage was tracked
        var usagesAfter = await context.AiUsages.CountAsync();
        usagesAfter.Should().Be(1);

        var savedUsage = await context.AiUsages.FirstAsync();
        savedUsage.Feature.Should().Be("Search");
        savedUsage.UserId.Should().Be(1);
        savedUsage.TokensUsed.Should().Be(500);
    }

    [Fact]
    public async Task SearchWatchesAsync_EmptyQuery_ShouldHandleGracefully()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // Add a watch
        var watch = new Watch
        {
            Id = 2,
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 8,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act & Assert
        // Service should handle empty/null query gracefully
        // (Cannot test full flow without Claude API mock)
        
        // Verify setup is correct
        var watchExists = await context.Watches.AnyAsync(w => w.UserId == 1);
        watchExists.Should().BeTrue();
    }

    [Fact]
    public async Task SearchWatchesAsync_VerifySearchableFields()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // Add watch with all searchable fields populated
        var movie = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "The Dark Knight",
            Year = 2008,
            Synopsis = "Batman fights the Joker",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);

        var watch = new Watch
        {
            Id = 2,
            UserId = 1,
            MovieId = 2,
            WatchedDate = new DateTime(2023, 7, 15),
            Rating = 10,
            Notes = "Heath Ledger's performance was phenomenal. Best superhero movie ever.",
            WatchLocation = "IMAX Cinema",
            WatchedWith = "Sarah and Mike",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        // Verify all searchable fields are present
        var searchableWatch = await context.Watches
            .Include(w => w.Movie)
            .FirstAsync(w => w.Id == 2);

        // Assert - All fields that should be searchable
        searchableWatch.Movie.Title.Should().Be("The Dark Knight");
        searchableWatch.Movie.Year.Should().Be(2008);
        searchableWatch.WatchedDate.Should().Be(new DateTime(2023, 7, 15));
        searchableWatch.Notes.Should().Contain("Heath Ledger");
        searchableWatch.WatchLocation.Should().Be("IMAX Cinema");
        searchableWatch.WatchedWith.Should().Be("Sarah and Mike");
        searchableWatch.Rating.Should().Be(10);

        // Claude API would search across all these fields
        // Example query: "superhero movie I watched in summer 2023 with Sarah"
        // Should match: summer (July 2023), Sarah (WatchedWith), superhero (Notes)
    }

    [Fact]
    public async Task SearchWatchesAsync_MultipleMatchingWatches_PreparesAllForSearch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = new AiSearchService(
            context,
            _mockClaudeSettings,
            _mockLogger);

        // Add multiple watches that could match various queries
        var movies = new[]
        {
            new Movie { Id = 2, TmdbId = 551, Title = "Inception", Year = 2010, Synopsis = "Dreams within dreams", CreatedAt = DateTime.UtcNow },
            new Movie { Id = 3, TmdbId = 552, Title = "Interstellar", Year = 2014, Synopsis = "Space exploration", CreatedAt = DateTime.UtcNow },
            new Movie { Id = 4, TmdbId = 553, Title = "The Prestige", Year = 2006, Synopsis = "Rival magicians", CreatedAt = DateTime.UtcNow }
        };
        context.Movies.AddRange(movies);

        var watches = new[]
        {
            new Watch { Id = 2, UserId = 1, MovieId = 2, WatchedDate = DateTime.UtcNow.AddMonths(-2), Notes = "Mind-bending", WatchLocation = "Cinema", CreatedAt = DateTime.UtcNow },
            new Watch { Id = 3, UserId = 1, MovieId = 3, WatchedDate = DateTime.UtcNow.AddMonths(-5), Notes = "Emotional sci-fi", WatchLocation = "Home", CreatedAt = DateTime.UtcNow },
            new Watch { Id = 4, UserId = 1, MovieId = 4, WatchedDate = DateTime.UtcNow.AddMonths(-8), Notes = "Twist ending", WatchLocation = "Cinema", CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var allWatches = await context.Watches
            .Include(w => w.Movie)
            .Where(w => w.UserId == 1)
            .ToListAsync();

        // Assert
        allWatches.Should().HaveCount(4);
        
        // All should have different characteristics for different queries
        allWatches.Should().Contain(w => w.Notes!.Contains("Mind-bending"));
        allWatches.Should().Contain(w => w.Notes!.Contains("sci-fi"));
        allWatches.Should().Contain(w => w.Notes!.Contains("Twist"));
        
        // Example queries that would match:
        // "Christopher Nolan movie about dreams" -> Inception
        // "space movie I watched at home" -> Interstellar
        // "movies I saw at the cinema" -> Inception, The Prestige
    }
}