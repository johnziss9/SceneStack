using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
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
    private MoviesController CreateControllerWithAuthenticatedUser(
        IMovieService movieService,
        ITmdbService tmdbService,
        int userId = 1)
    {
        var controller = new MoviesController(movieService, tmdbService);

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
    public async Task GetTmdbMovie_ValidId_ReturnsOkWithEnrichedMovie()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var enrichedMovie = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            Synopsis = "A ticking-time-bomb insomniac...",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>(),
            Runtime = 139,
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(enrichedMovie);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovie = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;
        returnedMovie.Title.Should().Be("Fight Club");
        returnedMovie.TmdbId.Should().Be(550);
    }

    [Fact]
    public async Task GetTmdbMovie_InvalidId_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        movieService.GetOrCreateFromTmdbAsync(999).Returns((Movie?)null);

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

    [Fact]
    public async Task GetTmdbMovie_EnrichedMovie_ReturnsDetailResponseWithAllFields()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        var enrichedMovie = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            PosterPath = "/poster.jpg",
            BackdropPath = "/backdrop.jpg",
            Synopsis = "An insomniac office worker...",
            Tagline = "Mischief. Mayhem. Soap.",
            Runtime = 139,
            Genres = new List<string> { "Drama", "Thriller" },
            TmdbRating = 8.8,
            TmdbVoteCount = 20000,
            DirectorName = "David Fincher",
            Cast = new List<CastMember>
            {
                new CastMember { Name = "Edward Norton", Character = "The Narrator", ProfilePath = "/norton.jpg" },
                new CastMember { Name = "Brad Pitt", Character = "Tyler Durden", ProfilePath = "/pitt.jpg" }
            }
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(enrichedMovie);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        response.Id.Should().Be(1);
        response.TmdbId.Should().Be(550);
        response.Title.Should().Be("Fight Club");
        response.Year.Should().Be(1999);
        response.BackdropPath.Should().Be("/backdrop.jpg");
        response.Tagline.Should().Be("Mischief. Mayhem. Soap.");
        response.Runtime.Should().Be(139);
        response.Genres.Should().Contain(new[] { "Drama", "Thriller" });
        response.TmdbRating.Should().Be(8.8);
        response.TmdbVoteCount.Should().Be(20000);
        response.DirectorName.Should().Be("David Fincher");
        response.Cast.Should().HaveCount(2);
        response.Cast[0].Name.Should().Be("Edward Norton");
        response.Cast[0].Character.Should().Be("The Narrator");
        response.Cast[0].ProfilePath.Should().Be("/norton.jpg");
    }

    [Fact]
    public async Task GetTmdbMovie_ServiceReturnsNull_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = new MoviesController(movieService, tmdbService);

        movieService.GetOrCreateFromTmdbAsync(999).Returns((Movie?)null);

        // Act
        var result = await controller.GetTmdbMovie(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetMyStatus_UserHasWatchedMovie_ReturnsStatusWithWatchInfo()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = CreateControllerWithAuthenticatedUser(movieService, tmdbService, userId: 1);

        var status = new MovieUserStatus
        {
            LocalMovieId = 1,
            WatchCount = 3,
            LatestRating = 9,
            OnWatchlist = false,
            WatchlistItemId = null
        };

        movieService.GetMyStatusAsync(1, 550).Returns(status);

        // Act
        var result = await controller.GetMyStatus(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStatus = okResult.Value.Should().BeOfType<MovieUserStatus>().Subject;

        returnedStatus.LocalMovieId.Should().Be(1);
        returnedStatus.WatchCount.Should().Be(3);
        returnedStatus.LatestRating.Should().Be(9);
        returnedStatus.OnWatchlist.Should().BeFalse();
        returnedStatus.WatchlistItemId.Should().BeNull();
    }

    [Fact]
    public async Task GetMyStatus_UserHasMovieOnWatchlist_ReturnsStatusWithWatchlistInfo()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = CreateControllerWithAuthenticatedUser(movieService, tmdbService, userId: 1);

        var status = new MovieUserStatus
        {
            LocalMovieId = 1,
            WatchCount = 0,
            LatestRating = null,
            OnWatchlist = true,
            WatchlistItemId = 5
        };

        movieService.GetMyStatusAsync(1, 550).Returns(status);

        // Act
        var result = await controller.GetMyStatus(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStatus = okResult.Value.Should().BeOfType<MovieUserStatus>().Subject;

        returnedStatus.LocalMovieId.Should().Be(1);
        returnedStatus.WatchCount.Should().Be(0);
        returnedStatus.LatestRating.Should().BeNull();
        returnedStatus.OnWatchlist.Should().BeTrue();
        returnedStatus.WatchlistItemId.Should().Be(5);
    }

    [Fact]
    public async Task GetMyStatus_MovieNotInDatabase_ReturnsEmptyStatus()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = CreateControllerWithAuthenticatedUser(movieService, tmdbService, userId: 1);

        var status = new MovieUserStatus
        {
            LocalMovieId = null,
            WatchCount = 0,
            LatestRating = null,
            OnWatchlist = false,
            WatchlistItemId = null
        };

        movieService.GetMyStatusAsync(1, 999).Returns(status);

        // Act
        var result = await controller.GetMyStatus(999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStatus = okResult.Value.Should().BeOfType<MovieUserStatus>().Subject;

        returnedStatus.LocalMovieId.Should().BeNull();
        returnedStatus.WatchCount.Should().Be(0);
        returnedStatus.OnWatchlist.Should().BeFalse();
    }

    [Fact]
    public async Task GetMyStatus_UserHasBothWatchAndWatchlist_ReturnsCompleteStatus()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var controller = CreateControllerWithAuthenticatedUser(movieService, tmdbService, userId: 1);

        var status = new MovieUserStatus
        {
            LocalMovieId = 1,
            WatchCount = 2,
            LatestRating = 8,
            OnWatchlist = true,
            WatchlistItemId = 3
        };

        movieService.GetMyStatusAsync(1, 550).Returns(status);

        // Act
        var result = await controller.GetMyStatus(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStatus = okResult.Value.Should().BeOfType<MovieUserStatus>().Subject;

        returnedStatus.LocalMovieId.Should().Be(1);
        returnedStatus.WatchCount.Should().Be(2);
        returnedStatus.LatestRating.Should().Be(8);
        returnedStatus.OnWatchlist.Should().BeTrue();
        returnedStatus.WatchlistItemId.Should().Be(3);
    }
}