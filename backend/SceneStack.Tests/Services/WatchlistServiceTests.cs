using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class WatchlistServiceTests
{
    [Fact]
    public async Task GetWatchlistAsync_ReturnsEmptyList_WhenNoItems()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();

        // Act
        var result = await service.GetWatchlistAsync(user.Id);

        // Assert
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.HasMore.Should().BeFalse();
    }

    [Fact]
    public async Task GetWatchlistAsync_ReturnsPaginatedItems_OrderedByAddedAtDesc()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var item1 = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            Priority = WatchlistItemPriority.Normal,
            AddedAt = DateTime.UtcNow.AddDays(-2),
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var item2 = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id + 1,
            Priority = WatchlistItemPriority.Normal,
            AddedAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        // Add another movie for item2
        var movie2 = new Movie
        {
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie2);
        context.WatchlistItems.AddRange(item1, item2);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetWatchlistAsync(user.Id, page: 1, pageSize: 10);

        // Assert
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Items[0].AddedAt.Should().BeAfter(result.Items[1].AddedAt); // Most recent first
    }

    [Fact]
    public async Task GetWatchlistAsync_SortsByPriority_WhenSortByIsPriority()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var movie2 = new Movie { TmdbId = 551, Title = "The Matrix", Year = 1999, CreatedAt = DateTime.UtcNow };
        var movie3 = new Movie { TmdbId = 552, Title = "Inception", Year = 2010, CreatedAt = DateTime.UtcNow };
        context.Movies.AddRange(movie2, movie3);
        await context.SaveChangesAsync();

        var normalItem = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            Priority = WatchlistItemPriority.Normal,
            AddedAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var highItem = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie2.Id,
            Priority = WatchlistItemPriority.High,
            AddedAt = DateTime.UtcNow.AddDays(-2),
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        context.WatchlistItems.AddRange(normalItem, highItem);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetWatchlistAsync(user.Id, sortBy: "priority");

        // Assert
        result.Items.Should().HaveCount(2);
        result.Items[0].Priority.Should().Be(WatchlistItemPriority.High); // High priority first
        result.Items[1].Priority.Should().Be(WatchlistItemPriority.Normal);
    }

    [Fact]
    public async Task GetWatchlistAsync_IsolatesUserData()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();
        var movie = context.Movies.First();

        var item1 = new WatchlistItem { UserId = user1.Id, MovieId = movie.Id, AddedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        var item2 = new WatchlistItem { UserId = user2.Id, MovieId = movie.Id, AddedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };

        context.WatchlistItems.AddRange(item1, item2);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetWatchlistAsync(user1.Id);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items[0].MovieId.Should().Be(movie.Id);
    }

    [Fact]
    public async Task AddToWatchlistAsync_CreatesNewItem()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        movieService.GetOrCreateFromTmdbAsync(Arg.Any<int>()).Returns(movie);

        // Act
        var result = await service.AddToWatchlistAsync(user.Id, movie.TmdbId, "Must watch soon!", WatchlistItemPriority.High);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(user.Id);
        result.MovieId.Should().Be(movie.Id);
        result.Notes.Should().Be("Must watch soon!");
        result.Priority.Should().Be(WatchlistItemPriority.High);

        var inDb = await context.WatchlistItems.FindAsync(result.Id);
        inDb.Should().NotBeNull();
    }

    [Fact]
    public async Task AddToWatchlistAsync_ThrowsException_WhenMovieNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();

        movieService.GetOrCreateFromTmdbAsync(Arg.Any<int>()).Returns((Movie?)null);

        // Act
        var act = async () => await service.AddToWatchlistAsync(user.Id, 999, null, WatchlistItemPriority.Normal);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Failed to retrieve movie with TMDb ID 999");
    }

    [Fact]
    public async Task AddToWatchlistAsync_ThrowsDuplicateException_WhenAlreadyOnWatchlist()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        movieService.GetOrCreateFromTmdbAsync(Arg.Any<int>()).Returns(movie);

        // Add to watchlist first time
        await service.AddToWatchlistAsync(user.Id, movie.TmdbId, null, WatchlistItemPriority.Normal);

        // Act - try to add again
        var act = async () => await service.AddToWatchlistAsync(user.Id, movie.TmdbId, null, WatchlistItemPriority.Normal);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("DUPLICATE");
    }

    [Fact]
    public async Task AddToWatchlistAsync_RestoresSoftDeletedItem()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        // Add and then soft delete
        var item = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            Notes = "Old notes",
            Priority = WatchlistItemPriority.Normal,
            AddedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow.AddDays(-2)
        };
        context.WatchlistItems.Add(item);
        await context.SaveChangesAsync();

        movieService.GetOrCreateFromTmdbAsync(Arg.Any<int>()).Returns(movie);

        // Act - add again
        var result = await service.AddToWatchlistAsync(user.Id, movie.TmdbId, "New notes", WatchlistItemPriority.High);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(item.Id); // Same item restored
        result.IsDeleted.Should().BeFalse();
        result.DeletedAt.Should().BeNull();
        result.Notes.Should().Be("New notes");
        result.Priority.Should().Be(WatchlistItemPriority.High);
        result.AddedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task RemoveFromWatchlistAsync_SoftDeletesItem()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var item = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            AddedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        context.WatchlistItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await service.RemoveFromWatchlistAsync(user.Id, movie.Id);

        // Assert
        result.Should().BeTrue();

        var deletedItem = await context.WatchlistItems
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(wi => wi.Id == item.Id);

        deletedItem.Should().NotBeNull();
        deletedItem!.IsDeleted.Should().BeTrue();
        deletedItem.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RemoveFromWatchlistAsync_ReturnsFalse_WhenItemNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();

        // Act
        var result = await service.RemoveFromWatchlistAsync(user.Id, 999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsOnWatchlistAsync_ReturnsTrue_WhenItemExists()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var item = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            AddedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        context.WatchlistItems.Add(item);
        await context.SaveChangesAsync();

        // Act
        var result = await service.IsOnWatchlistAsync(user.Id, movie.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsOnWatchlistAsync_ReturnsFalse_WhenItemDoesNotExist()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();

        // Act
        var result = await service.IsOnWatchlistAsync(user.Id, 999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateWatchlistItemAsync_UpdatesNotesAndPriority()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var item = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            Notes = "Old notes",
            Priority = WatchlistItemPriority.Normal,
            AddedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        context.WatchlistItems.Add(item);
        await context.SaveChangesAsync();

        var updateRequest = new UpdateWatchlistItemRequest
        {
            Notes = "Updated notes",
            Priority = WatchlistItemPriority.High
        };

        // Act
        var result = await service.UpdateWatchlistItemAsync(user.Id, movie.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.Notes.Should().Be("Updated notes");
        result.Priority.Should().Be(WatchlistItemPriority.High);

        var inDb = await context.WatchlistItems.FindAsync(item.Id);
        inDb!.Notes.Should().Be("Updated notes");
        inDb.Priority.Should().Be(WatchlistItemPriority.High);
    }

    [Fact]
    public async Task UpdateWatchlistItemAsync_ReturnsNull_WhenItemNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();

        var updateRequest = new UpdateWatchlistItemRequest
        {
            Notes = "Updated notes",
            Priority = WatchlistItemPriority.High
        };

        // Act
        var result = await service.UpdateWatchlistItemAsync(user.Id, 999, updateRequest);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetWatchlistCountAsync_ReturnsCorrectCount()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var user = context.Users.First();
        var movie = context.Movies.First();

        var movie2 = new Movie { TmdbId = 551, Title = "The Matrix", Year = 1999, CreatedAt = DateTime.UtcNow };
        context.Movies.Add(movie2);
        await context.SaveChangesAsync();

        var item1 = new WatchlistItem { UserId = user.Id, MovieId = movie.Id, AddedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        var item2 = new WatchlistItem { UserId = user.Id, MovieId = movie2.Id, AddedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };

        context.WatchlistItems.AddRange(item1, item2);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetWatchlistCountAsync(user.Id);

        // Assert
        result.Should().Be(2);
    }

    [Fact]
    public async Task CanAddToWatchlistAsync_ReturnsTrue_ForPremiumUser()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var premiumUser = context.Users.First(u => u.IsPremium);

        // Act
        var result = await service.CanAddToWatchlistAsync(premiumUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanAddToWatchlistAsync_ReturnsTrue_ForFreeUserBelowLimit()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);

        // Act
        var result = await service.CanAddToWatchlistAsync(freeUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanAddToWatchlistAsync_ReturnsFalse_ForFreeUserAtLimit()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);

        // Add 50 watchlist items (free tier limit)
        for (int i = 0; i < 50; i++)
        {
            var movie = new Movie
            {
                TmdbId = 1000 + i,
                Title = $"Movie {i}",
                Year = 2020,
                CreatedAt = DateTime.UtcNow
            };
            context.Movies.Add(movie);
        }
        await context.SaveChangesAsync();

        var movies = context.Movies.OrderByDescending(m => m.Id).Take(50).ToList();
        foreach (var movie in movies)
        {
            var item = new WatchlistItem
            {
                UserId = freeUser.Id,
                MovieId = movie.Id,
                AddedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            context.WatchlistItems.Add(item);
        }
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanAddToWatchlistAsync(freeUser.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanAddToWatchlistAsync_ReturnsFalse_WhenUserNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var movieService = Substitute.For<IMovieService>();
        var logger = Substitute.For<ILogger<WatchlistService>>();
        var service = new WatchlistService(context, movieService, logger);

        // Act
        var result = await service.CanAddToWatchlistAsync(999);

        // Assert
        result.Should().BeFalse();
    }
}
