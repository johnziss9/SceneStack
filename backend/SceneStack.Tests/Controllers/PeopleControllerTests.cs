using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Services;

namespace SceneStack.Tests.Controllers;

public class PeopleControllerTests
{
    [Fact]
    public async Task SearchPeople_ValidQuery_ReturnsSearchResults()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbResult = new TmdbPersonSearchResult
        {
            Page = 1,
            Results = new List<TmdbPerson>
            {
                new TmdbPerson
                {
                    Id = 287,
                    Name = "Brad Pitt",
                    KnownForDepartment = "Acting",
                    ProfilePath = "/brad.jpg",
                    Popularity = 45.5
                }
            },
            TotalPages = 1,
            TotalResults = 1
        };

        tmdbService.SearchPeopleAsync("Brad Pitt", 1).Returns(tmdbResult);

        // Act
        var result = await controller.SearchPeople("Brad Pitt", 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonSearchResult>().Subject;

        response.Results.Should().HaveCount(1);
        response.Results[0].Id.Should().Be(287);
        response.Results[0].Name.Should().Be("Brad Pitt");
        response.Results[0].KnownForDepartment.Should().Be("Acting");
    }

    [Fact]
    public async Task SearchPeople_EmptyQuery_ReturnsBadRequest()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        // Act
        var result = await controller.SearchPeople("", 1);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SearchPeople_TmdbServiceReturnsNull_ReturnsInternalServerError()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        tmdbService.SearchPeopleAsync("Test", 1).Returns((TmdbPersonSearchResult?)null);

        // Act
        var result = await controller.SearchPeople("Test", 1);

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetPersonMovies_ValidPersonId_ReturnsMovieCredits()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbCredits = new TmdbPersonMovieCredits
        {
            Cast = new List<TmdbPersonCastCredit>
            {
                new TmdbPersonCastCredit
                {
                    Id = 550,
                    Title = "Fight Club",
                    Character = "Tyler Durden",
                    ReleaseDate = "1999-10-15",
                    PosterPath = "/poster.jpg",
                    VoteAverage = 8.4,
                    VoteCount = 20000,
                    Popularity = 45.5
                }
            },
            Crew = new List<TmdbPersonCrewCredit>
            {
                new TmdbPersonCrewCredit
                {
                    Id = 278,
                    Title = "The Shawshank Redemption",
                    Job = "Director",
                    Department = "Directing",
                    ReleaseDate = "1994-09-23",
                    PosterPath = "/shawshank.jpg",
                    VoteAverage = 8.7,
                    VoteCount = 25000,
                    Popularity = 50.0
                }
            }
        };

        tmdbService.GetPersonMovieCreditsAsync(287).Returns(tmdbCredits);

        // Act
        var result = await controller.GetPersonMovies(287);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonMovieCredits>().Subject;

        response.Cast.Should().HaveCount(1);
        response.Cast[0].Id.Should().Be(550);
        response.Cast[0].Title.Should().Be("Fight Club");
        response.Cast[0].Character.Should().Be("Tyler Durden");

        response.Crew.Should().HaveCount(1);
        response.Crew[0].Id.Should().Be(278);
        response.Crew[0].Job.Should().Be("Director");
    }

    [Fact]
    public async Task GetPersonMovies_TmdbServiceReturnsNull_ReturnsInternalServerError()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        tmdbService.GetPersonMovieCreditsAsync(999).Returns((TmdbPersonMovieCredits?)null);

        // Act
        var result = await controller.GetPersonMovies(999);

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task SearchPeople_Pagination_ReturnsCorrectPage()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbResult = new TmdbPersonSearchResult
        {
            Page = 2,
            Results = new List<TmdbPerson>
            {
                new TmdbPerson
                {
                    Id = 500,
                    Name = "Tom Cruise",
                    KnownForDepartment = "Acting",
                    ProfilePath = "/tom.jpg",
                    Popularity = 50.0
                }
            },
            TotalPages = 5,
            TotalResults = 100
        };

        tmdbService.SearchPeopleAsync("Tom", 2).Returns(tmdbResult);

        // Act
        var result = await controller.SearchPeople("Tom", 2);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonSearchResult>().Subject;

        response.Page.Should().Be(2);
        response.TotalPages.Should().Be(5);
        response.Results.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchPeople_SpecialCharactersInQuery_HandlesCorrectly()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbResult = new TmdbPersonSearchResult
        {
            Page = 1,
            Results = new List<TmdbPerson>
            {
                new TmdbPerson
                {
                    Id = 1100,
                    Name = "Penélope Cruz",
                    KnownForDepartment = "Acting",
                    ProfilePath = "/penelope.jpg",
                    Popularity = 35.0
                }
            },
            TotalPages = 1,
            TotalResults = 1
        };

        tmdbService.SearchPeopleAsync("Penélope Cruz", 1).Returns(tmdbResult);

        // Act
        var result = await controller.SearchPeople("Penélope Cruz", 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonSearchResult>().Subject;

        response.Results[0].Name.Should().Be("Penélope Cruz");
    }

    [Fact]
    public async Task SearchPeople_LargeResultSet_ReturnsMultipleResults()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbResult = new TmdbPersonSearchResult
        {
            Page = 1,
            Results = new List<TmdbPerson>
            {
                new TmdbPerson { Id = 1, Name = "John Smith", KnownForDepartment = "Acting", Popularity = 10.0 },
                new TmdbPerson { Id = 2, Name = "John Doe", KnownForDepartment = "Acting", Popularity = 9.0 },
                new TmdbPerson { Id = 3, Name = "John Williams", KnownForDepartment = "Sound", Popularity = 8.0 },
                new TmdbPerson { Id = 4, Name = "John Carter", KnownForDepartment = "Directing", Popularity = 7.0 }
            },
            TotalPages = 10,
            TotalResults = 200
        };

        tmdbService.SearchPeopleAsync("John", 1).Returns(tmdbResult);

        // Act
        var result = await controller.SearchPeople("John", 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonSearchResult>().Subject;

        response.Results.Should().HaveCount(4);
        response.TotalResults.Should().Be(200);
    }

    [Fact]
    public async Task GetPersonMovies_PersonWithOnlyCastCredits_ReturnsCastOnly()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbCredits = new TmdbPersonMovieCredits
        {
            Cast = new List<TmdbPersonCastCredit>
            {
                new TmdbPersonCastCredit
                {
                    Id = 100,
                    Title = "Movie A",
                    Character = "Lead Role",
                    ReleaseDate = "2020-01-01",
                    PosterPath = "/a.jpg",
                    VoteAverage = 7.5,
                    VoteCount = 1000,
                    Popularity = 25.0
                },
                new TmdbPersonCastCredit
                {
                    Id = 101,
                    Title = "Movie B",
                    Character = "Supporting Role",
                    ReleaseDate = "2021-01-01",
                    PosterPath = "/b.jpg",
                    VoteAverage = 8.0,
                    VoteCount = 2000,
                    Popularity = 30.0
                }
            },
            Crew = new List<TmdbPersonCrewCredit>() // Empty crew
        };

        tmdbService.GetPersonMovieCreditsAsync(123).Returns(tmdbCredits);

        // Act
        var result = await controller.GetPersonMovies(123);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonMovieCredits>().Subject;

        response.Cast.Should().HaveCount(2);
        response.Crew.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPersonMovies_PersonWithOnlyCrewCredits_ReturnsCrewOnly()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbCredits = new TmdbPersonMovieCredits
        {
            Cast = new List<TmdbPersonCastCredit>(), // Empty cast
            Crew = new List<TmdbPersonCrewCredit>
            {
                new TmdbPersonCrewCredit
                {
                    Id = 200,
                    Title = "Film X",
                    Job = "Director",
                    Department = "Directing",
                    ReleaseDate = "2019-06-01",
                    PosterPath = "/x.jpg",
                    VoteAverage = 8.5,
                    VoteCount = 5000,
                    Popularity = 40.0
                }
            }
        };

        tmdbService.GetPersonMovieCreditsAsync(456).Returns(tmdbCredits);

        // Act
        var result = await controller.GetPersonMovies(456);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonMovieCredits>().Subject;

        response.Cast.Should().BeEmpty();
        response.Crew.Should().HaveCount(1);
        response.Crew[0].Job.Should().Be("Director");
    }

    [Fact]
    public async Task GetPersonMovies_PersonWithBothCastAndCrewOnSameMovie_ReturnsBothCredits()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbCredits = new TmdbPersonMovieCredits
        {
            Cast = new List<TmdbPersonCastCredit>
            {
                new TmdbPersonCastCredit
                {
                    Id = 300,
                    Title = "Multi-Role Film",
                    Character = "Main Character",
                    ReleaseDate = "2022-01-01",
                    PosterPath = "/multi.jpg",
                    VoteAverage = 7.0,
                    VoteCount = 800,
                    Popularity = 20.0
                }
            },
            Crew = new List<TmdbPersonCrewCredit>
            {
                new TmdbPersonCrewCredit
                {
                    Id = 300, // Same movie ID
                    Title = "Multi-Role Film",
                    Job = "Producer",
                    Department = "Production",
                    ReleaseDate = "2022-01-01",
                    PosterPath = "/multi.jpg",
                    VoteAverage = 7.0,
                    VoteCount = 800,
                    Popularity = 20.0
                }
            }
        };

        tmdbService.GetPersonMovieCreditsAsync(789).Returns(tmdbCredits);

        // Act
        var result = await controller.GetPersonMovies(789);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonMovieCredits>().Subject;

        response.Cast.Should().HaveCount(1);
        response.Crew.Should().HaveCount(1);
        response.Cast[0].Id.Should().Be(300);
        response.Crew[0].Id.Should().Be(300);
    }

    [Fact]
    public async Task GetPersonMovies_PersonWithNoCredits_ReturnsEmptyLists()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbCredits = new TmdbPersonMovieCredits
        {
            Cast = new List<TmdbPersonCastCredit>(),
            Crew = new List<TmdbPersonCrewCredit>()
        };

        tmdbService.GetPersonMovieCreditsAsync(999).Returns(tmdbCredits);

        // Act
        var result = await controller.GetPersonMovies(999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonMovieCredits>().Subject;

        response.Cast.Should().BeEmpty();
        response.Crew.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchPeople_NoResults_ReturnsEmptyList()
    {
        // Arrange
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<PeopleController>>();
        var controller = new PeopleController(tmdbService);

        var tmdbResult = new TmdbPersonSearchResult
        {
            Page = 1,
            Results = new List<TmdbPerson>(),
            TotalPages = 0,
            TotalResults = 0
        };

        tmdbService.SearchPeopleAsync("NonexistentPerson12345", 1).Returns(tmdbResult);

        // Act
        var result = await controller.SearchPeople("NonexistentPerson12345", 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TmdbPersonSearchResult>().Subject;

        response.Results.Should().BeEmpty();
        response.TotalResults.Should().Be(0);
    }
}
