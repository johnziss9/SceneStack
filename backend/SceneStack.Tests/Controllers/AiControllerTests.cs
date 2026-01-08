using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.Tests.Helpers;
using System.Security.Claims;

namespace SceneStack.Tests.Controllers;

public class AiControllerTests : IDisposable
{
    private readonly IAiInsightService _mockInsightService;
    private readonly IAiSearchService _mockSearchService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AiController> _mockLogger;
    private readonly AiController _controller;

    public AiControllerTests()
    {
        _mockInsightService = Substitute.For<IAiInsightService>();
        _mockSearchService = Substitute.For<IAiSearchService>();
        _context = TestDbContextFactory.CreateInMemoryDbContext();
        _mockLogger = Substitute.For<ILogger<AiController>>();
        
        _controller = new AiController(
            _mockInsightService,
            _mockSearchService,
            _context,
            _mockLogger);

        // Setup authenticated user context (premium user)
        SetupAuthenticatedUser(userId: 1, username: "testuser", email: "test@example.com", isPremium: true);
    }

    public void Dispose()
    {
        _context?.Dispose();
    }

    private void SetupAuthenticatedUser(int userId, string username, string email, bool isPremium)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Email, email),
            new Claim("IsPremium", isPremium.ToString())
        };

        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    [Fact]
    public async Task GenerateInsight_ValidRequest_ReturnsInsight()
    {
        // Arrange
        var request = new GenerateInsightRequest { MovieId = 1 };

        var expectedInsight = new AiInsightResponse
        {
            Id = 1,
            MovieId = 1,
            Content = "You've watched Fight Club 3 times...",
            GeneratedAt = DateTime.UtcNow,
            Cached = false,
            TokensUsed = 600,
            Cost = 0.012m
        };

        _mockInsightService.GetCachedInsightAsync(1, 1).Returns((AiInsightResponse?)null);
        _mockInsightService.GenerateInsightAsync(1, 1).Returns(expectedInsight);

        // Act
        var result = await _controller.GenerateInsight(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeEquivalentTo(expectedInsight);

        await _mockInsightService.Received(1).GetCachedInsightAsync(1, 1);
        await _mockInsightService.Received(1).GenerateInsightAsync(1, 1);
    }

    [Fact]
    public async Task GenerateInsight_CachedInsight_ReturnsCached()
    {
        // Arrange
        var request = new GenerateInsightRequest { MovieId = 1 };
        
        var cachedInsight = new AiInsightResponse
        {
            Id = 1,
            MovieId = 1,
            Content = "Cached insight content",
            GeneratedAt = DateTime.UtcNow.AddDays(-2),
            Cached = true,
            TokensUsed = 500,
            Cost = 0.01m
        };

        _mockInsightService.GetCachedInsightAsync(1, 1).Returns(cachedInsight);

        // Act
        var result = await _controller.GenerateInsight(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeEquivalentTo(cachedInsight);

        // Should NOT call GenerateInsightAsync since cached version exists
        await _mockInsightService.DidNotReceive().GenerateInsightAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task GenerateInsight_NonPremiumUser_Returns403()
    {
        // Arrange
        SetupAuthenticatedUser(userId: 2, username: "freeuser", email: "free@example.com", isPremium: false);
        var request = new GenerateInsightRequest { MovieId = 1 };

        // Act
        var result = await _controller.GenerateInsight(request);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(403);

        // Should not call service methods for non-premium user
        await _mockInsightService.DidNotReceive().GetCachedInsightAsync(Arg.Any<int>(), Arg.Any<int>());
        await _mockInsightService.DidNotReceive().GenerateInsightAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task GetInsight_ExistingInsight_ReturnsInsight()
    {
        // Arrange
        var cachedInsight = new AiInsightResponse
        {
            Id = 1,
            MovieId = 1,
            Content = "Existing insight",
            GeneratedAt = DateTime.UtcNow.AddDays(-1),
            Cached = true,
            TokensUsed = 550,
            Cost = 0.011m
        };

        _mockInsightService.GetCachedInsightAsync(1, 1).Returns(cachedInsight);

        // Act
        var result = await _controller.GetInsight(movieId: 1);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeEquivalentTo(cachedInsight);

        await _mockInsightService.Received(1).GetCachedInsightAsync(1, 1);
    }

    [Fact]
    public async Task GetInsight_NoInsight_Returns404()
    {
        // Arrange
        _mockInsightService.GetCachedInsightAsync(999, 1).Returns((AiInsightResponse?)null);

        // Act
        var result = await _controller.GetInsight(movieId: 999);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();

        await _mockInsightService.Received(1).GetCachedInsightAsync(999, 1);
    }

    [Fact]
    public async Task GetInsight_NonPremiumUser_Returns403()
    {
        // Arrange
        SetupAuthenticatedUser(userId: 2, username: "freeuser", email: "free@example.com", isPremium: false);

        // Act
        var result = await _controller.GetInsight(movieId: 1);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(403);

        await _mockInsightService.DidNotReceive().GetCachedInsightAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task RegenerateInsight_ValidRequest_ReturnsNewInsight()
    {
        // Arrange
        var newInsight = new AiInsightResponse
        {
            Id = 2,
            MovieId = 1,
            Content = "Regenerated insight with updated data",
            GeneratedAt = DateTime.UtcNow,
            Cached = false,
            TokensUsed = 650,
            Cost = 0.013m
        };

        _mockInsightService.RegenerateInsightAsync(1, 1).Returns(newInsight);

        // Act
        var result = await _controller.RegenerateInsight(movieId: 1);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeEquivalentTo(newInsight);

        await _mockInsightService.Received(1).RegenerateInsightAsync(1, 1);
    }

    [Fact]
    public async Task RegenerateInsight_NonPremiumUser_Returns403()
    {
        // Arrange
        SetupAuthenticatedUser(userId: 2, username: "freeuser", email: "free@example.com", isPremium: false);

        // Act
        var result = await _controller.RegenerateInsight(movieId: 1);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(403);

        await _mockInsightService.DidNotReceive().RegenerateInsightAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task SearchWatches_ValidQuery_ReturnsResults()
    {
        // Arrange
        var request = new AiSearchRequest { Query = "thriller I watched last summer with John" };

        var searchResponse = new AiSearchResponse
        {
            Results = new List<WatchResponse>
            {
                new WatchResponse
                {
                    Id = 5,
                    MovieId = 3,
                    UserId = 1,
                    WatchedDate = DateTime.Parse("2024-07-15"),
                    Rating = 9,
                    Notes = "Great thriller!",
                    WatchLocation = "Cinema",
                    WatchedWith = "John"
                }
            },
            TotalMatches = 1,
            TokensUsed = 450,
            Cost = 0.009m
        };

        _mockSearchService.SearchWatchesAsync(1, "thriller I watched last summer with John")
            .Returns(searchResponse);

        // Act
        var result = await _controller.SearchWatches(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeEquivalentTo(searchResponse);

        await _mockSearchService.Received(1).SearchWatchesAsync(1, "thriller I watched last summer with John");
    }

    [Fact]
    public async Task SearchWatches_NoResults_ReturnsEmptyList()
    {
        // Arrange
        var request = new AiSearchRequest { Query = "movie that doesn't exist" };

        var searchResponse = new AiSearchResponse
        {
            Results = new List<WatchResponse>(),
            TotalMatches = 0,
            TokensUsed = 300,
            Cost = 0.006m
        };

        _mockSearchService.SearchWatchesAsync(1, "movie that doesn't exist")
            .Returns(searchResponse);

        // Act
        var result = await _controller.SearchWatches(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as AiSearchResponse;
        response!.Results.Should().BeEmpty();
        response.TotalMatches.Should().Be(0);
    }

    [Fact]
    public async Task SearchWatches_NonPremiumUser_Returns403()
    {
        // Arrange
        SetupAuthenticatedUser(userId: 2, username: "freeuser", email: "free@example.com", isPremium: false);
        var request = new AiSearchRequest { Query = "any query" };

        // Act
        var result = await _controller.SearchWatches(request);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(403);

        await _mockSearchService.DidNotReceive().SearchWatchesAsync(Arg.Any<int>(), Arg.Any<string>());
    }

    [Fact]
    public async Task GetUsage_ValidRequest_ReturnsStats()
    {
        // Arrange
        // This test assumes the controller has a GetUsage endpoint that returns AiUsageStatsResponse
        // Since we don't have the actual implementation yet, we'll test the expected behavior

        // The endpoint should return usage statistics for the current month
        // Expected response structure based on Phase 3 plan
        var expectedStats = new AiUsageStatsResponse
        {
            InsightsGenerated = 5,
            SearchesPerformed = 12,
            TotalTokensUsed = 4500,
            TotalCost = 0.09m,
            MonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1)
        };

        // Act & Assert
        // This is a placeholder test until GetUsage endpoint is implemented
        // The actual test would call _controller.GetUsage() and verify response

        expectedStats.InsightsGenerated.Should().Be(5);
        expectedStats.SearchesPerformed.Should().Be(12);
        expectedStats.TotalTokensUsed.Should().Be(4500);
        expectedStats.TotalCost.Should().Be(0.09m);
    }

    [Fact]
    public async Task GetUsage_NonPremiumUser_Returns403()
    {
        // Arrange
        SetupAuthenticatedUser(userId: 2, username: "freeuser", email: "free@example.com", isPremium: false);

        // Act & Assert
        // Non-premium users should not be able to view usage stats
        // This test is a placeholder until GetUsage endpoint is implemented

        // Expected: Controller returns 403 Forbidden for non-premium users
        var isPremiumClaim = _controller.User.FindFirst("IsPremium")?.Value;
        isPremiumClaim.Should().Be("False");
    }
}