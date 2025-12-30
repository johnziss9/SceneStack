using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class WatchServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ExistingWatch_ReturnsWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Add a test watch
        var watch = new Watch
        {
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Great movie",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(watch.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Rating.Should().Be(9);
        result.Notes.Should().Be("Great movie");
        result.Movie.Should().NotBeNull();
        result.User.Should().NotBeNull();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Act
        var result = await service.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_SoftDeletedWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Add and soft delete a watch
        var watch = new Watch
        {
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 8,
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(watch.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_NoFilter_ReturnsAllWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Add multiple watches
        var watches = new[]
        {
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), IsRewatch = true, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync();

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllAsync_WithUserIdFilter_ReturnsOnlyUserWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Add another user
        var user2 = new User
        {
            Id = 2,
            Username = "user2",
            Email = "user2@test.com",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user2);

        // Add watches for different users
        var watches = new[]
        {
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = 2, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync(userId: 1);

        // Assert
        result.Should().HaveCount(1);
        result.First().UserId.Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_ValidWatch_CreatesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var newWatch = new Watch
        {
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 10,
            Notes = "Amazing!",
            WatchLocation = "Cinema",
            WatchedWith = "Friends",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await service.CreateAsync(newWatch);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Rating.Should().Be(10);
        result.Notes.Should().Be("Amazing!");
        result.WatchLocation.Should().Be("Cinema");
        result.WatchedWith.Should().Be("Friends");

        // Verify in database
        var watchInDb = await context.Watches.FindAsync(result.Id);
        watchInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_ExistingWatch_UpdatesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a watch
        var watch = new Watch
        {
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 7,
            Notes = "Good",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Prepare update
        var updatedWatch = new Watch
        {
            WatchedDate = DateTime.UtcNow.AddDays(-5),
            Rating = 9,
            Notes = "Actually amazing on rewatch!",
            WatchLocation = "Home",
            IsRewatch = true
        };

        // Act
        var result = await service.UpdateAsync(watch.Id, updatedWatch);

        // Assert
        result.Should().NotBeNull();
        result!.Rating.Should().Be(9);
        result.Notes.Should().Be("Actually amazing on rewatch!");
        result.WatchLocation.Should().Be("Home");
        result.IsRewatch.Should().BeTrue();

        // Verify in database
        var watchInDb = await context.Watches.FindAsync(watch.Id);
        watchInDb!.Rating.Should().Be(9);
    }

    [Fact]
    public async Task UpdateAsync_NonExistentWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var updatedWatch = new Watch
        {
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsRewatch = false
        };

        // Act
        var result = await service.UpdateAsync(999, updatedWatch);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ExistingWatch_SoftDeletesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a watch
        var watch = new Watch
        {
            UserId = 1,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.DeleteAsync(watch.Id);

        // Assert
        result.Should().BeTrue();

        // Verify soft delete
        var deletedWatch = await context.Watches
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == watch.Id);
        deletedWatch.Should().NotBeNull();
        deletedWatch!.IsDeleted.Should().BeTrue();
        deletedWatch.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentWatch_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Act
        var result = await service.DeleteAsync(999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetByMovieIdAsync_ReturnsWatchesForMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Add multiple watches for same movie
        var watches = new[]
        {
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 8, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-10), Rating = 9, IsRewatch = true, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByMovieIdAsync(movieId: 1, userId: 1);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(w => w.MovieId.Should().Be(1));
        result.Should().AllSatisfy(w => w.UserId.Should().Be(1));
        // Should be ordered by most recent first
        result.First().Rating.Should().Be(8);
        result.Last().Rating.Should().Be(9);
    }

    [Fact]
    public async Task GetGroupedWatchesAsync_ReturnsGroupedWatchesByMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);
        
        // Add another movie
        var movie2 = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie2);
        
        // Add multiple watches for different movies
        var watches = new[]
        {
            // Fight Club - watched twice
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 9, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = 1, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-10), Rating = 10, IsRewatch = true, CreatedAt = DateTime.UtcNow },
            // The Matrix - watched once
            new Watch { UserId = 1, MovieId = 2, WatchedDate = DateTime.UtcNow.AddDays(-5), Rating = 8, IsRewatch = false, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();
        
        // Act
        var result = await service.GetGroupedWatchesAsync(userId: 1);
        
        // Assert
        result.Should().HaveCount(2); // Two unique movies
        
        // Check Fight Club group
        var fightClubGroup = result.First(g => g.MovieId == 1);
        fightClubGroup.WatchCount.Should().Be(2);
        fightClubGroup.AverageRating.Should().Be(9.5); // (9 + 10) / 2
        fightClubGroup.LatestRating.Should().Be(9); // Most recent watch
        fightClubGroup.Watches.Should().HaveCount(2);
        fightClubGroup.Movie.Title.Should().Be("Fight Club");
        
        // Check The Matrix group
        var matrixGroup = result.First(g => g.MovieId == 2);
        matrixGroup.WatchCount.Should().Be(1);
        matrixGroup.AverageRating.Should().Be(8);
        matrixGroup.LatestRating.Should().Be(8);
        matrixGroup.Watches.Should().HaveCount(1);
        matrixGroup.Movie.Title.Should().Be("The Matrix");
    }
}