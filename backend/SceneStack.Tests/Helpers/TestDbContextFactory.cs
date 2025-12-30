using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Models;

namespace SceneStack.Tests.Helpers;

public static class TestDbContextFactory
{
    public static ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test
            .Options;

        var context = new ApplicationDbContext(options);

        // Seed test data
        SeedTestData(context);

        return context;
    }

    private static void SeedTestData(ApplicationDbContext context)
    {
        // Add a test user
        var testUser = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "hashedpassword",
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(testUser);

        // Add a test movie
        var testMovie = new Movie
        {
            Id = 1,
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            PosterPath = "/poster.jpg",
            Synopsis = "Test synopsis",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Movies.Add(testMovie);

        context.SaveChanges();
    }
}