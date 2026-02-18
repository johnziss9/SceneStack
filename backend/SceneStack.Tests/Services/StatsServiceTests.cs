using FluentAssertions;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class StatsServiceTests
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private static StatsService CreateService(SceneStack.API.Data.ApplicationDbContext context)
        => new StatsService(context);

    // ── No watches ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserStatsAsync_NoWatches_ReturnsEmptyStats()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var newUser = context.Users.First(u => u.Username == "freeuser");

        var result = await service.GetUserStatsAsync(newUser.Id);

        result.TotalMovies.Should().Be(0);
        result.TotalWatches.Should().Be(0);
        result.AverageRating.Should().BeNull();
        result.TotalRewatches.Should().Be(0);
        result.TopRewatched.Should().BeEmpty();
        result.WatchesByYear.Should().BeEmpty();
        result.WatchesByDecade.Should().BeEmpty();
        result.WatchesByLocation.Should().BeEmpty();
    }

    [Fact]
    public async Task GetUserStatsAsync_NoWatches_RatingsDistributionHas10ItemsAllZero()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var freeUser = context.Users.First(u => u.Username == "freeuser");

        var result = await service.GetUserStatsAsync(freeUser.Id);

        result.RatingsDistribution.Should().HaveCount(10);
        result.RatingsDistribution.Should().AllSatisfy(r => r.Count.Should().Be(0));
        result.RatingsDistribution.Select(r => r.Rating).Should().BeEquivalentTo(Enumerable.Range(1, 10));
    }

    [Fact]
    public async Task GetUserStatsAsync_NoWatches_WatchesByMonthHas12ItemsAllZero()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var freeUser = context.Users.First(u => u.Username == "freeuser");

        var result = await service.GetUserStatsAsync(freeUser.Id);

        result.WatchesByMonth.Should().HaveCount(12);
        result.WatchesByMonth.Should().AllSatisfy(m => m.Count.Should().Be(0));
        result.WatchesByMonth.Select(m => m.Month).Should().BeEquivalentTo(Enumerable.Range(1, 12));
    }

    // ── Single watch (seeded by TestDbContextFactory) ──────────────────────────

    [Fact]
    public async Task GetUserStatsAsync_SingleWatch_ReturnsTotals()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        result.TotalMovies.Should().Be(1);
        result.TotalWatches.Should().Be(1);
        result.TotalRewatches.Should().Be(0);
    }

    [Fact]
    public async Task GetUserStatsAsync_SingleWatchWithRating_ReturnsCorrectAverage()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        // Seeded watch has rating 9
        result.AverageRating.Should().Be(9.0);
    }

    [Fact]
    public async Task GetUserStatsAsync_SingleWatch_RatingDistributionHasCorrectCount()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        result.RatingsDistribution.Should().HaveCount(10);
        var rating9 = result.RatingsDistribution.Single(r => r.Rating == 9);
        rating9.Count.Should().Be(1);
        result.RatingsDistribution.Where(r => r.Rating != 9).Should().AllSatisfy(r => r.Count.Should().Be(0));
    }

    [Fact]
    public async Task GetUserStatsAsync_SingleWatch_WatchesByYearHasOneEntry()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        // Seeded watch is 2 months ago — may be in a different year than UtcNow
        result.WatchesByYear.Should().HaveCount(1);
        result.WatchesByYear[0].Year.Should().Be(DateTime.UtcNow.AddMonths(-2).Year);
        result.WatchesByYear[0].Count.Should().Be(1);
    }

    [Fact]
    public async Task GetUserStatsAsync_SingleWatch_WatchesByMonthHas12Items()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        // WatchesByMonth shows current year only; seeded watch may be from a prior year
        result.WatchesByMonth.Should().HaveCount(12);
        var seedDate = DateTime.UtcNow.AddMonths(-2);
        var expectedCount = seedDate.Year == DateTime.UtcNow.Year ? 1 : 0;
        result.WatchesByMonth.Single(m => m.Month == seedDate.Month).Count.Should().Be(expectedCount);
    }

    [Fact]
    public async Task GetUserStatsAsync_MovieWithYear_WatchesByDecadeHasEntry()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        // Fight Club is 1999 → "1990s"
        result.WatchesByDecade.Should().HaveCount(1);
        result.WatchesByDecade[0].Decade.Should().Be("1990s");
        result.WatchesByDecade[0].Count.Should().Be(1);
    }

    [Fact]
    public async Task GetUserStatsAsync_WatchWithLocation_WatchesByLocationHasEntry()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var user = context.Users.First(u => u.Username == "testuser");

        var result = await service.GetUserStatsAsync(user.Id);

        // Seeded watch has location "Cinema"
        result.WatchesByLocation.Should().HaveCount(1);
        result.WatchesByLocation[0].Location.Should().Be("Cinema");
        result.WatchesByLocation[0].Count.Should().Be(1);
    }

    // ── Rewatches ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserStatsAsync_WithRewatches_CountsRewatches()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "testuser");
        var movie = context.Movies.First();

        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-7),
            IsRewatch = true,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.TotalRewatches.Should().Be(1);
        result.TotalWatches.Should().Be(2);
    }

    [Fact]
    public async Task GetUserStatsAsync_MovieWatchedMoreThanOnce_AppearsInTopRewatched()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "testuser");
        var movie = context.Movies.First();

        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-7),
            IsRewatch = true,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.TopRewatched.Should().HaveCount(1);
        result.TopRewatched[0].Movie.Title.Should().Be("Fight Club");
        result.TopRewatched[0].WatchCount.Should().Be(2);
    }

    [Fact]
    public async Task GetUserStatsAsync_MovieWatchedOnce_DoesNotAppearInTopRewatched()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "testuser");
        var service = CreateService(context);

        var result = await service.GetUserStatsAsync(user.Id);

        result.TopRewatched.Should().BeEmpty();
    }

    // ── Multiple movies ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserStatsAsync_TwoMovies_CountsUniqueMoviesCorrectly()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "testuser");

        var movie2 = new Movie
        {
            TmdbId = 603,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Movies.Add(movie2);
        await context.SaveChangesAsync();

        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie2.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-3),
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.TotalMovies.Should().Be(2);
        result.TotalWatches.Should().Be(2);
    }

    [Fact]
    public async Task GetUserStatsAsync_AverageRating_IgnoresNullRatings()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "testuser");
        var movie = context.Movies.First();

        // Add a watch with no rating
        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-5),
            Rating = null,
            IsRewatch = true,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        // Average should still be 9.0 (only the first watch has a rating)
        result.AverageRating.Should().Be(9.0);
    }

    [Fact]
    public async Task GetUserStatsAsync_WatchWithNullLocation_GroupedAsUnknown()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "freeuser");
        var movie = context.Movies.First();

        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            WatchLocation = null,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.WatchesByLocation.Should().HaveCount(1);
        result.WatchesByLocation[0].Location.Should().Be("Unknown");
    }

    [Fact]
    public async Task GetUserStatsAsync_WatchWithEmptyLocation_GroupedAsUnknown()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "freeuser");
        var movie = context.Movies.First();

        context.Watches.Add(new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            WatchLocation = "",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.WatchesByLocation.Should().HaveCount(1);
        result.WatchesByLocation[0].Location.Should().Be("Unknown");
    }

    [Fact]
    public async Task GetUserStatsAsync_TopRewatched_LimitedToFive()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "freeuser");

        // Add 6 movies, each watched twice
        for (int i = 0; i < 6; i++)
        {
            var movie = new Movie
            {
                TmdbId = 1000 + i,
                Title = $"Movie {i}",
                Year = 2000 + i,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };
            context.Movies.Add(movie);
            await context.SaveChangesAsync();

            for (int j = 0; j < 2; j++)
            {
                context.Watches.Add(new Watch
                {
                    UserId = user.Id,
                    MovieId = movie.Id,
                    WatchedDate = DateTime.UtcNow.AddDays(-(i * 10 + j)),
                    IsRewatch = j > 0,
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                });
            }
        }
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.TopRewatched.Should().HaveCount(5);
    }

    [Fact]
    public async Task GetUserStatsAsync_WatchesByMonth_MonthNamesCorrect()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var service = CreateService(context);
        var freeUser = context.Users.First(u => u.Username == "freeuser");

        var result = await service.GetUserStatsAsync(freeUser.Id);

        result.WatchesByMonth[0].MonthName.Should().Be("Jan");
        result.WatchesByMonth[5].MonthName.Should().Be("Jun");
        result.WatchesByMonth[11].MonthName.Should().Be("Dec");
    }

    [Fact]
    public async Task GetUserStatsAsync_OnlyCountsWatchesForRequestingUser()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var premiumUser = context.Users.First(u => u.Username == "testuser");
        var freeUser = context.Users.First(u => u.Username == "freeuser");
        var movie = context.Movies.First();

        // Add a watch for freeUser
        context.Watches.Add(new Watch
        {
            UserId = freeUser.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            Rating = 7,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateService(context);

        var premiumResult = await service.GetUserStatsAsync(premiumUser.Id);
        var freeResult = await service.GetUserStatsAsync(freeUser.Id);

        premiumResult.TotalWatches.Should().Be(1);  // Only the seeded watch
        freeResult.TotalWatches.Should().Be(1);      // Only the newly added watch
        freeResult.AverageRating.Should().Be(7.0);
    }

    [Fact]
    public async Task GetUserStatsAsync_AverageRating_RoundedToOneDecimal()
    {
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var user = context.Users.First(u => u.Username == "freeuser");
        var movie = context.Movies.First();

        // Add watches with ratings 7 and 8 → average 7.5
        context.Watches.AddRange(
            new Watch { UserId = user.Id, MovieId = movie.Id, WatchedDate = DateTime.UtcNow.AddDays(-2), Rating = 7, CreatedAt = DateTime.UtcNow, IsDeleted = false },
            new Watch { UserId = user.Id, MovieId = movie.Id, WatchedDate = DateTime.UtcNow.AddDays(-1), Rating = 8, IsRewatch = true, CreatedAt = DateTime.UtcNow, IsDeleted = false }
        );
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var result = await service.GetUserStatsAsync(user.Id);

        result.AverageRating.Should().Be(7.5);
    }
}
