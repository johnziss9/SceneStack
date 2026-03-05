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
using SceneStack.API.Services;

namespace SceneStack.Tests.Controllers;

public class MoviesControllerTests
{
    private MoviesController CreateControllerWithAuthenticatedUser(
        IMovieService movieService,
        ITmdbService tmdbService,
        int userId = 1)
    {
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var result = await controller.SearchMovies("Fight Club", 1);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);
        
        tmdbService.SearchMoviesAsync(Arg.Any<string>(), Arg.Any<int>()).Returns((TmdbMovieSearchResult?)null);

        // Act
        var result = await controller.SearchMovies("NonexistentMovie", 1);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 7467, Name = "David Fincher", ProfilePath = "/fincher.jpg" }
            },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 819, Name = "Edward Norton", Character = "The Narrator", ProfilePath = "/norton.jpg" },
                new CastMember { PersonId = 287, Name = "Brad Pitt", Character = "Tyler Durden", ProfilePath = "/pitt.jpg" }
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
        response.Directors.Should().HaveCount(1);
        response.Directors[0].PersonId.Should().Be(7467);
        response.Directors[0].Name.Should().Be("David Fincher");
        response.Cast.Should().HaveCount(2);
        response.Cast[0].PersonId.Should().Be(819);
        response.Cast[0].Name.Should().Be("Edward Norton");
        response.Cast[0].Character.Should().Be("The Narrator");
        response.Cast[0].ProfilePath.Should().Be("/norton.jpg");
        response.Cast[1].PersonId.Should().Be(287);
        response.Cast[1].Name.Should().Be("Brad Pitt");
    }

    [Fact]
    public async Task GetTmdbMovie_ServiceReturnsNull_ReturnsNotFound()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

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

    [Fact]
    public async Task GetSimilarMovies_ValidTmdbId_ReturnsOkWithRecommendations()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var controller = CreateControllerWithAuthenticatedUser(movieService, tmdbService, userId: 1);

        // Override the recommendations service in the helper method
        var logger = Substitute.For<ILogger<MoviesController>>();
        controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        // Set up authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        var recommendations = new List<RecommendedMovie>
        {
            new RecommendedMovie
            {
                Movie = new TmdbMovie
                {
                    Id = 680,
                    Title = "Pulp Fiction",
                    ReleaseDate = "1994-10-14",
                    VoteAverage = 8.5,
                    VoteCount = 25000
                },
                Score = 0.85,
                Reason = "Matches your preferred genres and director",
                MatchedGenres = new List<string> { "Crime", "Drama" },
                MatchedCast = new List<string> { "John Travolta", "Samuel L. Jackson" }
            }
        };

        recommendationsService.GetMovieSimilarRecommendationsAsync(550, 1, 12).Returns(recommendations);

        // Act
        var result = await controller.GetSimilarMovies(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedData = okResult.Value.Should().BeAssignableTo<List<RecommendedMovie>>().Subject;

        returnedData.Should().HaveCount(1);
        returnedData.First().Movie.Id.Should().Be(680);
        returnedData.First().Movie.Title.Should().Be("Pulp Fiction");
        returnedData.First().Reason.Should().Contain("genres");
    }

    [Fact]
    public async Task GetSimilarMovies_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        // Set up authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        recommendationsService
            .GetMovieSimilarRecommendationsAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<int>())
            .Returns<List<RecommendedMovie>>(x => throw new Exception("TMDb API error"));

        // Act
        var result = await controller.GetSimilarMovies(550);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetSimilarMovies_EmptyResults_ReturnsOkWithEmptyList()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        // Set up authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        recommendationsService
            .GetMovieSimilarRecommendationsAsync(999, 1, 12)
            .Returns(new List<RecommendedMovie>());

        // Act
        var result = await controller.GetSimilarMovies(999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedData = okResult.Value.Should().BeAssignableTo<List<RecommendedMovie>>().Subject;
        returnedData.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSimilarMovies_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        // Set up authenticated user
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        recommendationsService
            .GetMovieSimilarRecommendationsAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<int>())
            .Returns(new List<RecommendedMovie>());

        // Act
        await controller.GetSimilarMovies(550);

        // Assert
        await recommendationsService.Received(1).GetMovieSimilarRecommendationsAsync(550, 42, 12);
    }

    [Fact]
    public async Task GetTmdbMovie_MovieWithWriters_MapsWriterPersonIdsCorrectly()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        var movieWithWriters = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            Synopsis = "A ticking-time-bomb insomniac...",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>(),
            Runtime = 139,
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 2031, Name = "Chuck Palahniuk", Job = "Novel", ProfilePath = "/chuck.jpg" },
                new WriterMember { PersonId = 28234, Name = "Jim Uhls", Job = "Screenplay", ProfilePath = "/jim.jpg" }
            },
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(movieWithWriters);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        response.Writers.Should().HaveCount(2);
        response.Writers[0].PersonId.Should().Be(2031);
        response.Writers[0].Name.Should().Be("Chuck Palahniuk");
        response.Writers[0].Job.Should().Be("Novel");
        response.Writers[0].ProfilePath.Should().Be("/chuck.jpg");
        response.Writers[1].PersonId.Should().Be(28234);
        response.Writers[1].Name.Should().Be("Jim Uhls");
        response.Writers[1].Job.Should().Be("Screenplay");
    }

    [Fact]
    public async Task GetTmdbMovie_MovieWithMissingPersonIds_ReturnsZeroPersonIds()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        var legacyMovie = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Legacy Movie",
            Year = 1999,
            Synopsis = "Old movie without PersonIds",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 0, Name = "Unknown Actor", Character = "Lead", ProfilePath = "/unknown.jpg" }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 0, Name = "Unknown Director", ProfilePath = "/dir.jpg" }
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 0, Name = "Unknown Writer", Job = "Screenplay", ProfilePath = "/writer.jpg" }
            },
            Runtime = 139,
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(legacyMovie);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert - Should not crash, should return 0 for missing PersonIds
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        response.Cast.Should().HaveCount(1);
        response.Cast[0].PersonId.Should().Be(0);
        response.Cast[0].Name.Should().Be("Unknown Actor");

        response.Directors.Should().HaveCount(1);
        response.Directors[0].PersonId.Should().Be(0);
        response.Directors[0].Name.Should().Be("Unknown Director");

        response.Writers.Should().HaveCount(1);
        response.Writers[0].PersonId.Should().Be(0);
        response.Writers[0].Name.Should().Be("Unknown Writer");
    }

    [Fact]
    public async Task GetTmdbMovie_MovieWithMultipleDirectorsAndWriters_MapsAllPersonIdsCorrectly()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        var movieWithMultipleCrew = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "The Matrix",
            Year = 1999,
            Synopsis = "The Wachowskis' masterpiece",
            Genres = new List<string> { "Sci-Fi", "Action" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 6384, Name = "Keanu Reeves", Character = "Neo", ProfilePath = "/keanu.jpg" },
                new CastMember { PersonId = 2975, Name = "Laurence Fishburne", Character = "Morpheus", ProfilePath = "/laurence.jpg" },
                new CastMember { PersonId = 530, Name = "Carrie-Anne Moss", Character = "Trinity", ProfilePath = "/carrie.jpg" }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 1269, Name = "Lana Wachowski", ProfilePath = "/lana.jpg" },
                new DirectorMember { PersonId = 1196, Name = "Lilly Wachowski", ProfilePath = "/lilly.jpg" }
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 1269, Name = "Lana Wachowski", Job = "Writer", ProfilePath = "/lana.jpg" },
                new WriterMember { PersonId = 1196, Name = "Lilly Wachowski", Job = "Writer", ProfilePath = "/lilly.jpg" }
            },
            Runtime = 136,
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(movieWithMultipleCrew);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        // Verify all Cast PersonIds are mapped
        response.Cast.Should().HaveCount(3);
        response.Cast[0].PersonId.Should().Be(6384);
        response.Cast[0].Name.Should().Be("Keanu Reeves");
        response.Cast[1].PersonId.Should().Be(2975);
        response.Cast[1].Name.Should().Be("Laurence Fishburne");
        response.Cast[2].PersonId.Should().Be(530);
        response.Cast[2].Name.Should().Be("Carrie-Anne Moss");

        // Verify all Director PersonIds are mapped
        response.Directors.Should().HaveCount(2);
        response.Directors[0].PersonId.Should().Be(1269);
        response.Directors[0].Name.Should().Be("Lana Wachowski");
        response.Directors[1].PersonId.Should().Be(1196);
        response.Directors[1].Name.Should().Be("Lilly Wachowski");

        // Verify all Writer PersonIds are mapped
        response.Writers.Should().HaveCount(2);
        response.Writers[0].PersonId.Should().Be(1269);
        response.Writers[0].Name.Should().Be("Lana Wachowski");
        response.Writers[1].PersonId.Should().Be(1196);
        response.Writers[1].Name.Should().Be("Lilly Wachowski");
    }

    [Fact]
    public async Task GetTmdbMovie_MovieWithNullProfilePaths_HandlesGracefully()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        var movieWithNullProfiles = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Independent Film",
            Year = 2020,
            Synopsis = "Cast without public photos",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 12345, Name = "Unknown Actor", Character = "Lead", ProfilePath = null }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 67890, Name = "Unknown Director", ProfilePath = null }
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 11111, Name = "Unknown Writer", Job = "Screenplay", ProfilePath = null }
            },
            Runtime = 90,
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(movieWithNullProfiles);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        response.Cast[0].PersonId.Should().Be(12345);
        response.Cast[0].ProfilePath.Should().BeNull();

        response.Directors[0].PersonId.Should().Be(67890);
        response.Directors[0].ProfilePath.Should().BeNull();

        response.Writers[0].PersonId.Should().Be(11111);
        response.Writers[0].ProfilePath.Should().BeNull();
    }

    [Fact]
    public async Task GetTmdbMovie_MovieWithEmptyCastAndCrew_ReturnsEmptyLists()
    {
        // Arrange
        var movieService = Substitute.For<IMovieService>();
        var tmdbService = Substitute.For<ITmdbService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<MoviesController>>();
        var controller = new MoviesController(movieService, tmdbService, recommendationsService, logger);

        var movieWithoutCrew = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Minimal Movie",
            Year = 2020,
            Synopsis = "Movie with no cast/crew data",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>(),
            Directors = new List<DirectorMember>(),
            Writers = new List<WriterMember>(),
            Runtime = 60,
            CreatedAt = DateTime.UtcNow
        };

        movieService.GetOrCreateFromTmdbAsync(550).Returns(movieWithoutCrew);

        // Act
        var result = await controller.GetTmdbMovie(550);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MovieDetailResponse>().Subject;

        response.Cast.Should().BeEmpty();
        response.Directors.Should().BeEmpty();
        response.Writers.Should().BeEmpty();
    }
}