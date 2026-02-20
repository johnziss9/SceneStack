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

public class WatchesControllerTests
{
    private WatchesController CreateControllerWithAuthenticatedUser(
        IWatchService watchService,
        IMovieService movieService,
        ILogger<WatchesController> logger,
        int userId = 1)
    {
        var controller = new WatchesController(watchService, movieService, logger);

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
    public async Task GetWatches_ReturnsOkWithAllWatches()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var watches = new List<Watch>
        {
            new Watch
            {
                Id = 1,
                UserId = 1,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow,
                Rating = 9,
                IsRewatch = false,
                Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
            }
        };

        watchService.GetAllAsync(1).Returns(watches);

        // Act
        var result = await controller.GetWatches();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<IEnumerable<WatchResponse>>().Subject;
        returnedWatches.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetWatch_ExistingWatch_ReturnsOkWithWatch()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var watch = new Watch
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Great movie",
            IsRewatch = false,
            Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
            User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        watchService.GetByIdAsync(1).Returns(watch);

        // Act
        var result = await controller.GetWatch(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatch = okResult.Value.Should().BeOfType<WatchResponse>().Subject;
        returnedWatch.Rating.Should().Be(9);
        returnedWatch.Notes.Should().Be("Great movie");
    }

    [Fact]
    public async Task GetWatch_NonExistentWatch_ReturnsNotFound()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        watchService.GetByIdAsync(999).Returns((Watch?)null);

        // Act
        var result = await controller.GetWatch(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetGroupedWatches_ReturnsOkWithGroupedWatches()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var paginatedResponse = new PaginatedGroupedWatchesResponse
        {
            Items = new List<GroupedWatchesResponse>
            {
                new GroupedWatchesResponse
                {
                    MovieId = 1,
                    Movie = new MovieBasicInfo { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                    WatchCount = 2,
                    AverageRating = 9.5,
                    LatestRating = 10,
                    Watches = new List<WatchEntryResponse>()
                }
            },
            TotalCount = 1,
            Page = 1,
            PageSize = 20,
            TotalPages = 1,
            HasMore = false
        };

        watchService.GetGroupedWatchesAsync(Arg.Is<GetGroupedWatchesRequest>(r => r.UserId == 1)).Returns(paginatedResponse);

        // Act
        var result = await controller.GetGroupedWatches();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedData = okResult.Value.Should().BeOfType<PaginatedGroupedWatchesResponse>().Subject;
        returnedData.Items.Should().HaveCount(1);
        returnedData.Items.First().WatchCount.Should().Be(2);
    }

    [Fact]
    public async Task GetWatchesByMovie_ReturnsOkWithWatches()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var watches = new List<Watch>
        {
            new Watch
            {
                Id = 1,
                UserId = 1,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow,
                Rating = 9,
                IsRewatch = false,
                Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
            }
        };

        watchService.GetByMovieIdAsync(1, 1).Returns(watches);

        // Act
        var result = await controller.GetWatchesByMovie(movieId: 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<List<WatchResponse>>().Subject;
        returnedWatches.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetWatchesByMovie_NoWatches_ReturnsEmptyList()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        watchService.GetByMovieIdAsync(999, 1).Returns(new List<Watch>());

        // Act
        var result = await controller.GetWatchesByMovie(movieId: 999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<List<WatchResponse>>().Subject;
        returnedWatches.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateWatch_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 };
        movieService.GetOrCreateFromTmdbAsync(550).Returns(movie);

        var createdWatch = new Watch
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Amazing!",
            IsRewatch = false,
            Movie = movie,
            User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        watchService.CreateAsync(Arg.Any<Watch>(), Arg.Any<List<int>>()).Returns(createdWatch);

        var request = new CreateWatchRequest
        {
            TmdbId = 550,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Amazing!",
            IsRewatch = false
        };

        // Act
        var result = await controller.CreateWatch(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be(nameof(WatchesController.GetWatch));
        var returnedWatch = createdResult.Value.Should().BeOfType<WatchResponse>().Subject;
        returnedWatch.Rating.Should().Be(9);
    }

    [Fact]
    public async Task CreateWatch_MovieServiceFails_ReturnsInternalServerError()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        movieService.GetOrCreateFromTmdbAsync(999).Returns((Movie?)null);

        var request = new CreateWatchRequest
        {
            TmdbId = 999,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsRewatch = false
        };

        // Act
        var result = await controller.CreateWatch(request);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UpdateWatch_ExistingWatch_ReturnsOkWithUpdatedWatch()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var updatedWatch = new Watch
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 10,
            Notes = "Even better on rewatch!",
            IsRewatch = true,
            Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
            User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        watchService.UpdateAsync(1, Arg.Any<Watch>()).Returns(updatedWatch);

        var request = new UpdateWatchRequest
        {
            WatchedDate = DateTime.UtcNow,
            Rating = 10,
            Notes = "Even better on rewatch!",
            IsRewatch = true
        };

        // Act
        var result = await controller.UpdateWatch(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatch = okResult.Value.Should().BeOfType<WatchResponse>().Subject;
        returnedWatch.Rating.Should().Be(10);
        returnedWatch.Notes.Should().Be("Even better on rewatch!");
    }

    [Fact]
    public async Task UpdateWatch_NonExistentWatch_ReturnsNotFound()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        watchService.UpdateAsync(999, Arg.Any<Watch>()).Returns((Watch?)null);

        var request = new UpdateWatchRequest
        {
            WatchedDate = DateTime.UtcNow,
            Rating = 10,
            IsRewatch = false
        };

        // Act
        var result = await controller.UpdateWatch(999, request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteWatch_ExistingWatch_ReturnsNoContent()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        watchService.DeleteAsync(1).Returns(true);

        // Act
        var result = await controller.DeleteWatch(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteWatch_NonExistentWatch_ReturnsNotFound()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        watchService.DeleteAsync(999).Returns(false);

        // Act
        var result = await controller.DeleteWatch(999);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetGroupFeed_ValidGroup_ReturnsOkWithWatches()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger, userId: 1);

        var watches = new List<Watch>
        {
            new Watch
            {
                Id = 1,
                UserId = 2,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow,
                Rating = 9,
                IsRewatch = false,
                Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                User = new User { Id = 2, Username = "otheruser", Email = "other@test.com" }
            },
            new Watch
            {
                Id = 2,
                UserId = 1,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow.AddDays(-1),
                Rating = 10,
                IsRewatch = false,
                Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
            }
        };

        watchService.GetGroupFeedAsync(1, 1).Returns(watches);

        // Act
        var result = await controller.GetGroupFeed(groupId: 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<IEnumerable<WatchResponse>>().Subject;
        returnedWatches.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetGroupFeed_NoWatches_ReturnsOkWithEmptyList()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger, userId: 1);

        watchService.GetGroupFeedAsync(999, 1).Returns(new List<Watch>());

        // Act
        var result = await controller.GetGroupFeed(groupId: 999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<List<WatchResponse>>().Subject;
        returnedWatches.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupFeed_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger, userId: 1);

        watchService.GetGroupFeedAsync(1, 1)
            .Returns<List<Watch>>(_ => throw new Exception("Database error"));

        // Act
        var result = await controller.GetGroupFeed(groupId: 1);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task CreateWatch_WithGroupIds_AssociatesWithGroups()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 };
        movieService.GetOrCreateFromTmdbAsync(550).Returns(movie);

        var createdWatch = new Watch
        {
            Id = 1,
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsPrivate = false,
            IsRewatch = false,
            Movie = movie,
            User = new User { Id = 1, Username = "testuser", Email = "test@test.com" },
            WatchGroups = new List<WatchGroup>
            {
                new WatchGroup { WatchId = 1, GroupId = 1, SharedAt = DateTime.UtcNow },
                new WatchGroup { WatchId = 1, GroupId = 2, SharedAt = DateTime.UtcNow }
            }
        };

        watchService.CreateAsync(Arg.Any<Watch>(), Arg.Any<List<int>>()).Returns(createdWatch);

        var request = new CreateWatchRequest
        {
            TmdbId = 550,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsPrivate = false,
            GroupIds = new List<int> { 1, 2 },
            IsRewatch = false
        };

        // Act
        var result = await controller.CreateWatch(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returnedWatch = createdResult.Value.Should().BeOfType<WatchResponse>().Subject;
        returnedWatch.Rating.Should().Be(9);

        // Verify CreateAsync was called with group IDs
        await watchService.Received(1).CreateAsync(
            Arg.Is<Watch>(w => w.IsPrivate == false),
            Arg.Is<List<int>>(g => g.Count == 2 && g.Contains(1) && g.Contains(2))
        );
    }

    [Fact]
    public async Task GetWatches_WithGroupIdFilter_ReturnsFilteredWatches()
    {
        // Arrange
        var watchService = Substitute.For<IWatchService>();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchesController>>();
        var controller = CreateControllerWithAuthenticatedUser(watchService, movieService, logger);

        var watches = new List<Watch>
        {
            new Watch
            {
                Id = 1,
                UserId = 1,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow,
                Rating = 9,
                IsRewatch = false,
                Movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 },
                User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
            }
        };

        watchService.GetAllAsync(1, 5).Returns(watches);

        // Act - Call GetWatches with groupId query parameter
        controller.ControllerContext.HttpContext.Request.QueryString = new QueryString("?groupId=5");
        var result = await controller.GetWatches(groupId: 5);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedWatches = okResult.Value.Should().BeAssignableTo<IEnumerable<WatchResponse>>().Subject;
        returnedWatches.Should().HaveCount(1);

        // Verify service was called with groupId
        await watchService.Received(1).GetAllAsync(1, 5);
    }
}