using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using System.Security.Claims;

namespace SceneStack.Tests.Controllers;

public class StatsControllerTests
{
    private StatsController CreateController(IStatsService statsService, int userId = 1)
    {
        var logger = Substitute.For<ILogger<StatsController>>();
        var controller = new StatsController(statsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        }));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    private static UserStatsResponse BuildStatsResponse() => new()
    {
        TotalMovies = 5,
        TotalWatches = 8,
        AverageRating = 7.5,
        TotalRewatches = 3,
        RatingsDistribution = Enumerable.Range(1, 10)
            .Select(r => new RatingDistributionItem { Rating = r, Count = 0 })
            .ToList(),
        WatchesByYear = new List<WatchesByYearItem> { new() { Year = 2025, Count = 8 } },
        WatchesByMonth = Enumerable.Range(1, 12)
            .Select(m => new WatchesByMonthItem { Month = m, MonthName = "Jan", Count = 0 })
            .ToList(),
        WatchesByDecade = new List<WatchesByDecadeItem> { new() { Decade = "2000s", Count = 8 } },
        WatchesByLocation = new List<WatchLocationItem> { new() { Location = "Cinema", Count = 4 } },
        TopRewatched = new List<TopRewatchedMovie>()
    };

    [Fact]
    public async Task GetStats_ReturnsOkWithStats()
    {
        var statsService = Substitute.For<IStatsService>();
        var controller = CreateController(statsService, userId: 1);
        var expected = BuildStatsResponse();
        statsService.GetUserStatsAsync(1).Returns(expected);

        var result = await controller.GetStats();

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var stats = okResult.Value.Should().BeOfType<UserStatsResponse>().Subject;
        stats.TotalMovies.Should().Be(5);
        stats.TotalWatches.Should().Be(8);
        stats.AverageRating.Should().Be(7.5);
    }

    [Fact]
    public async Task GetStats_CallsServiceWithCorrectUserId()
    {
        var statsService = Substitute.For<IStatsService>();
        var controller = CreateController(statsService, userId: 42);
        statsService.GetUserStatsAsync(42).Returns(BuildStatsResponse());

        await controller.GetStats();

        await statsService.Received(1).GetUserStatsAsync(42);
    }

    [Fact]
    public async Task GetStats_ServiceThrows_Returns500()
    {
        var statsService = Substitute.For<IStatsService>();
        var controller = CreateController(statsService, userId: 1);
        statsService.GetUserStatsAsync(Arg.Any<int>())
            .Returns<UserStatsResponse>(_ => throw new Exception("Database error"));

        var result = await controller.GetStats();

        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
        statusResult.Value.Should().Be("Error retrieving stats");
    }

    [Fact]
    public async Task GetStats_DifferentUserIds_CallsServiceWithCorrectId()
    {
        var statsService = Substitute.For<IStatsService>();

        foreach (var userId in new[] { 1, 5, 99 })
        {
            statsService.GetUserStatsAsync(userId).Returns(BuildStatsResponse());
            var controller = CreateController(statsService, userId);
            await controller.GetStats();
            await statsService.Received().GetUserStatsAsync(userId);
        }
    }
}
