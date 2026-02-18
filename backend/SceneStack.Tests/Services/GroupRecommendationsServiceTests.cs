using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class GroupRecommendationsServiceTests
{
    [Fact]
    public async Task GetGroupRecommendationsAsync_UserIsMember_ReturnsRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Mock TMDb popular movies response
        var popularMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 551, Title = "The Matrix", ReleaseDate = "1999-03-31" },
                new TmdbMovie { Id = 552, Title = "Inception", ReleaseDate = "2010-07-16" },
                new TmdbMovie { Id = 553, Title = "Interstellar", ReleaseDate = "2014-11-07" }
            }
        };
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns(popularMovies);

        // Act
        var result = await service.GetGroupRecommendationsAsync(group.Id, user.Id);

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(m => m.Title == "The Matrix");
        result.Should().Contain(m => m.Title == "Inception");
        result.Should().Contain(m => m.Title == "Interstellar");
    }

    [Fact]
    public async Task GetGroupRecommendationsAsync_UserNotMember_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
        var group = new Group
        {
            Name = "Private Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act - user2 tries to get recommendations (not a member)
        var result = await service.GetGroupRecommendationsAsync(group.Id, user2.Id);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupRecommendationsAsync_FiltersOutAlreadyWatchedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // User has already watched Fight Club (TmdbId 550)
        // The seeded movie has TmdbId 550

        // Mock TMDb popular movies - includes Fight Club which should be filtered
        var popularMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 550, Title = "Fight Club", ReleaseDate = "1999-10-15" }, // Already watched
                new TmdbMovie { Id = 551, Title = "The Matrix", ReleaseDate = "1999-03-31" },
                new TmdbMovie { Id = 552, Title = "Inception", ReleaseDate = "2010-07-16" }
            }
        };
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns(popularMovies);

        // Act
        var result = await service.GetGroupRecommendationsAsync(group.Id, user.Id);

        // Assert
        result.Should().HaveCount(2);
        result.Should().NotContain(m => m.Title == "Fight Club");
        result.Should().Contain(m => m.Title == "The Matrix");
        result.Should().Contain(m => m.Title == "Inception");
    }

    [Fact]
    public async Task GetGroupRecommendationsAsync_RespectsCountParameter()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Mock TMDb popular movies with many results
        var popularMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 551, Title = "Movie 1", ReleaseDate = "2020-01-01" },
                new TmdbMovie { Id = 552, Title = "Movie 2", ReleaseDate = "2020-01-02" },
                new TmdbMovie { Id = 553, Title = "Movie 3", ReleaseDate = "2020-01-03" },
                new TmdbMovie { Id = 554, Title = "Movie 4", ReleaseDate = "2020-01-04" },
                new TmdbMovie { Id = 555, Title = "Movie 5", ReleaseDate = "2020-01-05" }
            }
        };
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns(popularMovies);

        // Act - request only 3 recommendations
        var result = await service.GetGroupRecommendationsAsync(group.Id, user.Id, count: 3);

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetGroupRecommendationsAsync_TmdbReturnsNull_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Mock TMDb to return null (API failure)
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns((TmdbMovieSearchResult?)null);

        // Act
        var result = await service.GetGroupRecommendationsAsync(group.Id, user.Id);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupRecommendationStatsAsync_UserIsMember_ReturnsStats()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group
        var group = new Group
        {
            Name = "Movie Fans",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add a second movie
        var movie2 = new Movie
        {
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie2);
        await context.SaveChangesAsync();

        // Create watches with ratings
        var watches = new[]
        {
            new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 9, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user2.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), Rating = 10, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user1.Id, MovieId = movie2.Id, WatchedDate = DateTime.UtcNow.AddDays(-2), Rating = 8, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Mock TMDb recommendations
        var popularMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 552, Title = "Inception", ReleaseDate = "2010-07-16" }
            }
        };
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns(popularMovies);

        // Act
        var result = await service.GetGroupRecommendationStatsAsync(group.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupId.Should().Be(group.Id);
        result.GroupName.Should().Be("Movie Fans");
        result.UniqueMovies.Should().Be(2); // 2 unique movies
        result.AverageGroupRating.Should().Be(9.0); // (9+10+8)/3
        result.Recommendations.Should().HaveCount(1);
        result.Recommendations.First().Title.Should().Be("Inception");
    }

    [Fact]
    public async Task GetGroupRecommendationStatsAsync_UserNotMember_ReturnsUnauthorized()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
        var group = new Group
        {
            Name = "Private Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act - user2 tries to access (not a member)
        var result = await service.GetGroupRecommendationStatsAsync(group.Id, user2.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupName.Should().Be("Unauthorized");
        result.Recommendations.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupRecommendationStatsAsync_NoWatches_ReturnsZeroStats()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        // Create a new user with no watches
        var newUser = new User
        {
            Username = "newuser",
            Email = "newuser@test.com",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(newUser);
        await context.SaveChangesAsync();

        // Create a new group with no watches
        var group = new Group
        {
            Name = "New Group",
            CreatedById = newUser.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = newUser.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Mock TMDb recommendations
        var popularMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 552, Title = "Inception", ReleaseDate = "2010-07-16" }
            }
        };
        tmdbService.GetPopularMoviesAsync(Arg.Any<int>()).Returns(popularMovies);

        // Act
        var result = await service.GetGroupRecommendationStatsAsync(group.Id, newUser.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupName.Should().Be("New Group");
        result.UniqueMovies.Should().Be(0);
        result.AverageGroupRating.Should().BeNull();
        result.Recommendations.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetGroupRecommendationStatsAsync_GroupNotFound_ReturnsNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger);

        var user = context.Users.First();

        // Act - request non-existent group
        var result = await service.GetGroupRecommendationStatsAsync(999, user.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupName.Should().Be("Unauthorized"); // User is not member of non-existent group
    }
}