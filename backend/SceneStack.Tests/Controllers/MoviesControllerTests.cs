using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;

namespace SceneStack.Tests.Controllers;

public class MoviesControllerTests
{
    [Fact]
    public async Task SearchMovies_ValidQuery_ReturnsOkWithResults()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var searchResult = new TmdbMovieSearchResult
        {
            Page = 1,
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 550,
                    Title = "Fight Club",
                    ReleaseDate = "1999-10-15",
                    Overview = "A ticking-time-bomb insomniac..."
                }
            },
            TotalPages = 1,
            TotalResults = 1
        };

        tmdbService.SearchMoviesAsync("Fight Club", 1).Returns(searchResult);

        // Act
        var result = await controller.SearchMovies("Fight Club");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedData = okResult.Value.Should().BeOfType<TmdbMovieSearchResult>().Subject;
        returnedData.Results.Should().HaveCount(1);
        returnedData.Results.First().Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task SearchMovies_EmptyQuery_ReturnsBadRequest()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        // Act
        var result = await controller.SearchMovies("");

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SearchMovies_TmdbServiceReturnsNull_ReturnsInternalServerError()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);
        
        tmdbService.SearchMoviesAsync(Arg.Any<string>(), Arg.Any<int>()).Returns((TmdbMovieSearchResult?)null);
        
        // Act
        var result = await controller.SearchMovies("NonexistentMovie");
        
        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetTmdbMovie_ValidId_ReturnsOkWithMovie()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var tmdbMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            ReleaseDate = "1999-10-15",
            Overview = "A ticking-time-bomb insomniac..."
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(tmdbMovie);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovie = okResult.Value.Should().BeOfType<TmdbMovie>().Subject;
        returnedMovie.Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task GetTmdbMovie_InvalidId_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        tmdbService.GetMovieDetailsAsync(999).Returns((TmdbMovie?)null);

        // Act
        var result = await controller.GetTmdbMovie(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetMovies_ReturnsOkWithMovies()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var movies = new List<Movie>
        {
            new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 }
        };

        movieService.GetAllAsync().Returns(movies);

        // Act
        var result = await controller.GetMovies();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovies = okResult.Value.Should().BeAssignableTo<IEnumerable<Movie>>().Subject;
        returnedMovies.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMovie_ExistingMovie_ReturnsOkWithMovie()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var movie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club", Year = 1999 };
        movieService.GetByIdAsync(1).Returns(movie);

        // Act
        var result = await controller.GetMovie(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovie = okResult.Value.Should().BeOfType<Movie>().Subject;
        returnedMovie.Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task GetMovie_NonExistentMovie_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        movieService.GetByIdAsync(999).Returns((Movie?)null);

        // Act
        var result = await controller.GetMovie(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CreateMovie_ValidMovie_ReturnsCreatedAtAction()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var newMovie = new Movie { TmdbId = 551, Title = "The Matrix", Year = 1999 };
        var createdMovie = new Movie { Id = 2, TmdbId = 551, Title = "The Matrix", Year = 1999 };

        movieService.CreateAsync(newMovie).Returns(createdMovie);

        // Act
        var result = await controller.CreateMovie(newMovie);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be(nameof(MoviesController.GetMovie));
        var returnedMovie = createdResult.Value.Should().BeOfType<Movie>().Subject;
        returnedMovie.Id.Should().Be(2);
    }

    [Fact]
    public async Task UpdateMovie_ExistingMovie_ReturnsOkWithUpdatedMovie()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var updateMovie = new Movie { Title = "Fight Club - Updated", Year = 1999 };
        var updatedMovie = new Movie { Id = 1, TmdbId = 550, Title = "Fight Club - Updated", Year = 1999 };

        movieService.UpdateAsync(1, updateMovie).Returns(updatedMovie);

        // Act
        var result = await controller.UpdateMovie(1, updateMovie);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovie = okResult.Value.Should().BeOfType<Movie>().Subject;
        returnedMovie.Title.Should().Be("Fight Club - Updated");
    }

    [Fact]
    public async Task UpdateMovie_NonExistentMovie_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var updateMovie = new Movie { Title = "Updated", Year = 1999 };
        movieService.UpdateAsync(999, updateMovie).Returns((Movie?)null);

        // Act
        var result = await controller.UpdateMovie(999, updateMovie);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteMovie_ExistingMovie_ReturnsNoContent()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        movieService.DeleteAsync(1).Returns(true);

        // Act
        var result = await controller.DeleteMovie(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteMovie_NonExistentMovie_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        movieService.DeleteAsync(999).Returns(false);

        // Act
        var result = await controller.DeleteMovie(999);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }
}