using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.Tests.Controllers;

public class WatchlistControllerTests
{
    private WatchlistController CreateControllerWithAuthenticatedUser(
        IWatchlistService watchlistService,
        ILogger<WatchlistController> logger,
        int userId = 1)
    {
        var controller = new WatchlistController(watchlistService, logger);

        // Mock the authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        return controller;
    }

    [Fact]
    public async Task GetWatchlist_ReturnsOkWithPaginatedWatchlist()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var paginatedResponse = new PaginatedWatchlistResponse
        {
            Items = new List<WatchlistItemResponse>
            {
                new WatchlistItemResponse
                {
                    Id = 1,
                    MovieId = 1,
                    Movie = new MovieBasicInfo { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                    Notes = "Must watch",
                    Priority = WatchlistItemPriority.High,
                    AddedAt = DateTime.UtcNow
                }
            },
            TotalCount = 1,
            Page = 1,
            PageSize = 20,
            TotalPages = 1,
            HasMore = false
        };

        watchlistService.GetWatchlistAsync(1, 1, 20, "recent").Returns(paginatedResponse);

        // Act
        var result = await controller.GetWatchlist();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedData = okResult.Value.Should().BeOfType<PaginatedWatchlistResponse>().Subject;
        returnedData.Items.Should().HaveCount(1);
        returnedData.Items.First().Notes.Should().Be("Must watch");
    }

    [Fact]
    public async Task GetWatchlist_PassesSortByParameter()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var paginatedResponse = new PaginatedWatchlistResponse
        {
            Items = new List<WatchlistItemResponse>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 20,
            TotalPages = 0,
            HasMore = false
        };

        watchlistService.GetWatchlistAsync(1, 1, 20, "priority").Returns(paginatedResponse);

        // Act
        await controller.GetWatchlist(sortBy: "priority");

        // Assert
        await watchlistService.Received(1).GetWatchlistAsync(1, 1, 20, "priority");
    }

    [Fact]
    public async Task GetCount_ReturnsOkWithCount()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        watchlistService.GetWatchlistCountAsync(1).Returns(5);

        // Act
        var result = await controller.GetCount();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { count = 5 });
    }

    [Fact]
    public async Task AddToWatchlist_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new AddToWatchlistRequest
        {
            TmdbId = 550,
            Notes = "Must watch",
            Priority = WatchlistItemPriority.High
        };

        watchlistService.CanAddToWatchlistAsync(1).Returns(true);

        var watchlistItem = new WatchlistItem
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            Notes = "Must watch",
            Priority = WatchlistItemPriority.High,
            AddedAt = DateTime.UtcNow,
            Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 }
        };

        watchlistService.AddToWatchlistAsync(1, 550, "Must watch", WatchlistItemPriority.High)
            .Returns(watchlistItem);

        // Act
        var result = await controller.AddToWatchlist(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returnedItem = createdResult.Value.Should().BeOfType<WatchlistItemResponse>().Subject;
        returnedItem.Notes.Should().Be("Must watch");
        returnedItem.Priority.Should().Be(WatchlistItemPriority.High);
    }

    [Fact]
    public async Task AddToWatchlist_FreeTierLimitReached_Returns403()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new AddToWatchlistRequest
        {
            TmdbId = 550,
            Notes = null,
            Priority = WatchlistItemPriority.Normal
        };

        watchlistService.CanAddToWatchlistAsync(1).Returns(false);

        // Act
        var result = await controller.AddToWatchlist(request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(403);
        statusResult.Value.Should().BeEquivalentTo(new { message = "Free tier watchlist limit of 50 movies reached. Upgrade to Premium for unlimited watchlist." });
    }

    [Fact]
    public async Task AddToWatchlist_DuplicateMovie_Returns409()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new AddToWatchlistRequest
        {
            TmdbId = 550,
            Notes = null,
            Priority = WatchlistItemPriority.Normal
        };

        watchlistService.CanAddToWatchlistAsync(1).Returns(true);
        watchlistService.AddToWatchlistAsync(1, 550, null, WatchlistItemPriority.Normal)
            .Returns(Task.FromException<WatchlistItem>(new InvalidOperationException("DUPLICATE")));

        // Act
        var result = await controller.AddToWatchlist(request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().BeEquivalentTo(new { message = "This movie is already on your watchlist." });
    }

    [Fact]
    public async Task AddToWatchlist_FailedToRetrieveMovie_Returns500()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new AddToWatchlistRequest
        {
            TmdbId = 999,
            Notes = null,
            Priority = WatchlistItemPriority.Normal
        };

        watchlistService.CanAddToWatchlistAsync(1).Returns(true);
        watchlistService.AddToWatchlistAsync(1, 999, null, WatchlistItemPriority.Normal)
            .Returns(Task.FromException<WatchlistItem>(new InvalidOperationException("Failed to retrieve movie with TMDb ID 999")));

        // Act
        var result = await controller.AddToWatchlist(request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
        statusResult.Value.Should().BeEquivalentTo(new { message = "Failed to retrieve movie from TMDb." });
    }

    [Fact]
    public async Task RemoveFromWatchlist_ExistingItem_ReturnsNoContent()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        watchlistService.RemoveFromWatchlistAsync(1, 1).Returns(true);

        // Act
        var result = await controller.RemoveFromWatchlist(movieId: 1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task RemoveFromWatchlist_NonExistentItem_ReturnsNotFound()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        watchlistService.RemoveFromWatchlistAsync(1, 999).Returns(false);

        // Act
        var result = await controller.RemoveFromWatchlist(movieId: 999);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Watchlist item not found." });
    }

    [Fact]
    public async Task UpdateWatchlistItem_ExistingItem_ReturnsOkWithUpdatedItem()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new UpdateWatchlistItemRequest
        {
            Notes = "Updated notes",
            Priority = WatchlistItemPriority.High
        };

        var updatedItem = new WatchlistItem
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            Notes = "Updated notes",
            Priority = WatchlistItemPriority.High,
            AddedAt = DateTime.UtcNow,
            Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 }
        };

        watchlistService.UpdateWatchlistItemAsync(1, 1, request).Returns(updatedItem);

        // Act
        var result = await controller.UpdateWatchlistItem(movieId: 1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedItem = okResult.Value.Should().BeOfType<WatchlistItemResponse>().Subject;
        returnedItem.Notes.Should().Be("Updated notes");
        returnedItem.Priority.Should().Be(WatchlistItemPriority.High);
    }

    [Fact]
    public async Task UpdateWatchlistItem_NonExistentItem_ReturnsNotFound()
    {
        // Arrange
        var watchlistService = Substitute.For<IWatchlistService>();
        var logger = Substitute.For<ILogger<WatchlistController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchlistService, logger);

        var request = new UpdateWatchlistItemRequest
        {
            Notes = "Updated notes",
            Priority = WatchlistItemPriority.High
        };

        watchlistService.UpdateWatchlistItemAsync(1, 999, request).Returns((WatchlistItem?)null);

        // Act
        var result = await controller.UpdateWatchlistItem(movieId: 999, request);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Watchlist item not found." });
    }
}
