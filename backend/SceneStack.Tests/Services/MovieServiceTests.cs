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

public class MovieServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ExistingMovie_ReturnsMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Fight Club");
        result.TmdbId.Should().Be(550);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentMovie_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_SoftDeletedMovie_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Soft delete the test movie
        var movie = await context.Movies.FindAsync(1);
        movie!.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(1);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_ReturnsOnlyNonDeletedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Add another movie and soft delete it
        var deletedMovie = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "Deleted Movie",
            Year = 2000,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow
        };
        context.Movies.Add(deletedMovie);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync();

        // Assert
        result.Should().HaveCount(1);
        result.First().Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task CreateAsync_ValidMovie_CreatesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var newMovie = new Movie
        {
            TmdbId = 552,
            Title = "New Movie",
            Year = 2024,
            Synopsis = "Test synopsis",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await service.CreateAsync(newMovie);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Title.Should().Be("New Movie");

        // Verify it's in the database
        var movieInDb = await context.Movies.FindAsync(result.Id);
        movieInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_ExistingMovie_UpdatesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        var updatedMovie = new Movie
        {
            Title = "Fight Club - Updated",
            Year = 1999,
            Synopsis = "Updated synopsis",
            PosterPath = "/poster.jpg"
        };
        
        // Act
        var result = await service.UpdateAsync(1, updatedMovie);

        // Assert
        result.Should().NotBeNull();
        result!.Synopsis.Should().Be("Updated synopsis");

        // Verify in database
        var movieInDb = await context.Movies.FindAsync(1);
        movieInDb!.Synopsis.Should().Be("Updated synopsis");
    }

    [Fact]
    public async Task DeleteAsync_ExistingMovie_SoftDeletesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.DeleteAsync(1);

        // Assert
        result.Should().BeTrue();

        // Verify soft delete
        var movie = await context.Movies.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == 1);
        movie.Should().NotBeNull();
        movie!.IsDeleted.Should().BeTrue();
        movie.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetByTmdbIdAsync_ExistingMovie_ReturnsMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByTmdbIdAsync(550);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task GetByTmdbIdAsync_NonExistentTmdbId_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByTmdbIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_ExistingMovie_ReturnsExistingMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(550);
        
        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.Title.Should().Be("Fight Club");
        
        // Verify TMDb API was NOT called (movie already exists)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_SoftDeletedMovie_RestoresMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Soft delete the test movie
        var movie = await context.Movies.IgnoreQueryFilters().FirstAsync(m => m.Id == 1);
        movie.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(550);
        
        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.IsDeleted.Should().BeFalse();
        result.DeletedAt.Should().BeNull();
        
        // Verify TMDb API was NOT called (movie was restored)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_FetchesFromTmdbAndCreates()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Mock TMDb API response
        var tmdbMovie = new TmdbMovie
        {
            Id = 551,
            Title = "The Matrix",
            ReleaseDate = "1999-03-31",
            PosterPath = "/matrix.jpg",
            Overview = "A computer hacker learns about the true nature of reality."
        };
        tmdbService.GetMovieDetailsAsync(551).Returns(tmdbMovie);
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(551);
        
        // Assert
        result.Should().NotBeNull();
        result.TmdbId.Should().Be(551);
        result.Title.Should().Be("The Matrix");
        result.Year.Should().Be(1999);
        result.PosterPath.Should().Be("/matrix.jpg");
        result.Synopsis.Should().Be("A computer hacker learns about the true nature of reality.");
        
        // Verify TMDb API WAS called
        await tmdbService.Received(1).GetMovieDetailsAsync(551);
        
        // Verify it's in the database
        var movieInDb = await context.Movies.FirstOrDefaultAsync(m => m.TmdbId == 551);
        movieInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_TmdbApiFails_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Mock TMDb API to return null (movie not found or API error)
        tmdbService.GetMovieDetailsAsync(999).Returns((TmdbMovie?)null);
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(999);
        
        // Assert
        result.Should().BeNull();
        
        // Verify TMDb API WAS called
        await tmdbService.Received(1).GetMovieDetailsAsync(999);
    }
}