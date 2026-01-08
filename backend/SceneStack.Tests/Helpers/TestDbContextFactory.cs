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
        // Add a test user (premium)
        var testUser = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            IsPremium = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(testUser);

        // Add a second test user (non-premium)
        var freeUser = new User
        {
            Username = "freeuser",
            Email = "free@example.com",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(freeUser);

        // Add a test movie
        var testMovie = new Movie
        {
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            PosterPath = "/poster.jpg",
            Synopsis = "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Movies.Add(testMovie);

        // Save to assign IDs
        context.SaveChanges();

        // Now add a test watch (after SaveChanges so movie and user have IDs)
        var testWatch = new Watch
        {
            UserId = testUser.Id,  // Use the assigned ID
            MovieId = testMovie.Id,  // Use the assigned ID
            WatchedDate = DateTime.UtcNow.AddMonths(-2),
            Rating = 9,
            Notes = "One of the best psychological thrillers ever made. The twist ending was incredible.",
            WatchLocation = "Cinema",
            WatchedWith = "Sarah",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Watches.Add(testWatch);

        // Final save for watch
        context.SaveChanges();

        // Note: AiInsights and AiUsages are NOT seeded by default
        // Tests should add these as needed for their specific scenarios
    }
}