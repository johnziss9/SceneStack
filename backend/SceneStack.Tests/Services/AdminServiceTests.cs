using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;
using Xunit;

namespace SceneStack.Tests.Services;

/// <summary>
/// Tests for AdminService covering audit log filtering, system health, and dashboard stats
/// </summary>
public class AdminServiceTests
{
    #region Audit Log Filtering Tests

    [Fact]
    public async Task GetAuditLogsAsync_ReturnsAllLogs_WhenNoFiltersApplied()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");
        var log1 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log2 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Account, AuditEvents.ProfileUpdated);
        var log3 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Group, AuditEvents.GroupCreated);

        // Act
        var result = await service.GetAuditLogsAsync();

        // Assert
        result.Logs.Should().HaveCount(3);
        result.Logs.Should().Contain(l => l.Id == log1.Id);
        result.Logs.Should().Contain(l => l.Id == log2.Id);
        result.Logs.Should().Contain(l => l.Id == log3.Id);
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersByUsername()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user1 = await CreateTestUser(context, "john");
        var user2 = await CreateTestUser(context, "jane");

        var log1 = await CreateTestAuditLog(context, user1.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log2 = await CreateTestAuditLog(context, user2.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log3 = await CreateTestAuditLog(context, user1.Id, AuditEventCategory.Account, AuditEvents.ProfileUpdated);

        // Act - Search for "john"
        var result = await service.GetAuditLogsAsync(username: "john");

        // Assert
        result.Logs.Should().HaveCount(2);
        result.Logs.Should().Contain(l => l.Id == log1.Id);
        result.Logs.Should().Contain(l => l.Id == log3.Id);
        result.Logs.Should().NotContain(l => l.Id == log2.Id);
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersByUsernamePartialMatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user1 = await CreateTestUser(context, "johnsmith");
        var user2 = await CreateTestUser(context, "johndoe");
        var user3 = await CreateTestUser(context, "janedoe");

        var log1 = await CreateTestAuditLog(context, user1.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log2 = await CreateTestAuditLog(context, user2.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log3 = await CreateTestAuditLog(context, user3.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);

        // Act - Search for partial "john" - should match both johnsmith and johndoe
        var result = await service.GetAuditLogsAsync(username: "john");

        // Assert
        result.Logs.Should().HaveCount(2);
        result.Logs.Should().Contain(l => l.UserId == user1.Id);
        result.Logs.Should().Contain(l => l.UserId == user2.Id);
        result.Logs.Should().NotContain(l => l.UserId == user3.Id);
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersByCategory()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        var log1 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log2 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Account, AuditEvents.ProfileUpdated);
        var log3 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Group, AuditEvents.GroupCreated);

        // Act - Filter by Authentication category
        var result = await service.GetAuditLogsAsync(category: AuditEventCategory.Authentication);

        // Assert
        result.Logs.Should().HaveCount(1);
        result.Logs.First().Id.Should().Be(log1.Id);
        result.Logs.First().Category.Should().Be(AuditEventCategory.Authentication);
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersByEventType()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        var log1 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        var log2 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.LoginFailed);
        var log3 = await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.Logout);

        // Act - Filter by specific event type
        var result = await service.GetAuditLogsAsync(eventType: AuditEvents.LoginSuccess);

        // Assert
        result.Logs.Should().HaveCount(1);
        result.Logs.First().EventType.Should().Be(AuditEvents.LoginSuccess);
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersBySuccessStatus()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        // Create successful and failed audit logs
        var successLog1 = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow,
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var successLog2 = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Account,
            EventType = AuditEvents.ProfileUpdated,
            Action = "Update",
            Success = true,
            Timestamp = DateTime.UtcNow,
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var failedLog = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginFailed,
            Action = "Login",
            Success = false,
            ErrorMessage = "Invalid credentials",
            Timestamp = DateTime.UtcNow,
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(successLog1, successLog2, failedLog);
        await context.SaveChangesAsync();

        // Act - Filter by failed logs only
        var result = await service.GetAuditLogsAsync(success: false);

        // Assert
        result.Logs.Should().HaveCount(1);
        result.Logs.First().Success.Should().BeFalse();
        result.Logs.First().ErrorMessage.Should().Be("Invalid credentials");
    }

    [Fact]
    public async Task GetAuditLogsAsync_FiltersByDateRange()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        // Create logs with different timestamps
        var oldLog = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-10),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var recentLog = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-2),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var futureLog = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(oldLog, recentLog, futureLog);
        await context.SaveChangesAsync();

        // Act - Filter by date range (last 5 days)
        var dateFrom = DateTime.UtcNow.AddDays(-5);
        var dateTo = DateTime.UtcNow;
        var result = await service.GetAuditLogsAsync(dateFrom: dateFrom, dateTo: dateTo);

        // Assert
        result.Logs.Should().HaveCount(1);
        result.Logs.First().Id.Should().Be(recentLog.Id);
    }

    [Fact]
    public async Task GetAuditLogsAsync_CombinesMultipleFilters()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user1 = await CreateTestUser(context, "john");
        var user2 = await CreateTestUser(context, "jane");

        // Create various logs
        var targetLog = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var wrongUser = new AuditLog
        {
            UserId = user2.Id, // Different user
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var wrongCategory = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Account, // Different category
            EventType = AuditEvents.ProfileUpdated,
            Action = "Update",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var wrongSuccess = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginFailed,
            Action = "Login",
            Success = false, // Failed
            Timestamp = DateTime.UtcNow.AddDays(-1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(targetLog, wrongUser, wrongCategory, wrongSuccess);
        await context.SaveChangesAsync();

        // Act - Apply multiple filters at once
        var result = await service.GetAuditLogsAsync(
            username: "john",
            category: AuditEventCategory.Authentication,
            success: true
        );

        // Assert - Should only return the target log that matches all filters
        result.Logs.Should().HaveCount(1);
        result.Logs.First().Id.Should().Be(targetLog.Id);
    }

    [Fact]
    public async Task GetAuditLogsAsync_ReturnsLogsOrderedByTimestampDescending()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        var log1 = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-3),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var log2 = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-1),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var log3 = new AuditLog
        {
            UserId = user.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-2),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(log1, log2, log3);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAuditLogsAsync();

        // Assert - Should be ordered newest first
        result.Logs.Should().HaveCount(3);
        result.Logs[0].Id.Should().Be(log2.Id); // Most recent
        result.Logs[1].Id.Should().Be(log3.Id); // Middle
        result.Logs[2].Id.Should().Be(log1.Id); // Oldest
    }

    [Fact]
    public async Task GetAuditLogsAsync_RespectsPagination()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user = await CreateTestUser(context, "testuser");

        // Create 10 logs
        for (int i = 0; i < 10; i++)
        {
            await CreateTestAuditLog(context, user.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);
        }

        // Act - Request page 1 with page size 5
        var result = await service.GetAuditLogsAsync(page: 1, pageSize: 5);

        // Assert
        result.Logs.Should().HaveCount(5);
        result.TotalCount.Should().Be(10);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(5);
    }

    #endregion

    #region System Health Tests

    [Fact]
    public async Task GetSystemHealthAsync_ReturnsCorrectMetrics()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user1 = await CreateTestUser(context, "user1");
        var user2 = await CreateTestUser(context, "user2");
        var user3 = await CreateTestUser(context, "user3");

        // Create audit logs (some recent failures)
        var successLog = await CreateTestAuditLog(context, user1.Id, AuditEventCategory.Authentication, AuditEvents.LoginSuccess);

        var errorLog1 = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginFailed,
            Action = "Login",
            Success = false,
            ErrorMessage = "Error 1",
            Timestamp = DateTime.UtcNow.AddHours(-2), // Recent
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var errorLog2 = new AuditLog
        {
            UserId = user2.Id,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupCreated,
            Action = "Create",
            Success = false,
            ErrorMessage = "Error 2",
            Timestamp = DateTime.UtcNow.AddDays(-3), // Within 7 days
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var oldError = new AuditLog
        {
            UserId = user3.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginFailed,
            Action = "Login",
            Success = false,
            ErrorMessage = "Old error",
            Timestamp = DateTime.UtcNow.AddDays(-10), // Too old (>7 days)
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(errorLog1, errorLog2, oldError);
        await context.SaveChangesAsync();

        // Act
        var health = await service.GetSystemHealthAsync();

        // Assert
        health.TotalAuditLogs.Should().Be(4); // 1 success + 3 errors
        health.ErrorsLast7Days.Should().Be(2); // Only recent errors
        health.TotalUsers.Should().Be(13); // 10 seeded users + 3 created in test
        health.ServerStartTime.Should().BeCloseTo(Program.ApplicationStartTime, TimeSpan.FromSeconds(1));
    }

    #endregion

    #region Dashboard Stats Tests

    [Fact]
    public async Task GetDashboardStatsAsync_ReturnsCorrectCounts()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AdminService>>();
        var service = new AdminService(context, logger);

        var user1 = await CreateTestUser(context, "user1");
        var user2 = await CreateTestUser(context, "user2");

        // Create logs in different time ranges
        var last24h = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddHours(-12),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var last7days = new AuditLog
        {
            UserId = user2.Id,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Login",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-3),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        var errorLast7days = new AuditLog
        {
            UserId = user1.Id,
            Category = AuditEventCategory.Group,
            EventType = AuditEvents.GroupCreated,
            Action = "Create",
            Success = false,
            ErrorMessage = "Test error",
            Timestamp = DateTime.UtcNow.AddDays(-2),
            IpAddress = "127.0.0.1",
            UserAgent = "Test"
        };

        context.AuditLogs.AddRange(last24h, last7days, errorLast7days);
        await context.SaveChangesAsync();

        // Act
        var stats = await service.GetDashboardStatsAsync();

        // Assert
        stats.AuditLogsLast24Hours.Should().Be(1);
        stats.ErrorsLast7Days.Should().Be(1);
        stats.ActiveUsersLast7Days.Should().Be(2); // Both users active in last 7 days
        stats.RecentAuditLogs.Should().HaveCount(3);
        stats.RecentAuditLogs.First().Success.Should().BeTrue();
    }

    #endregion

    #region Helper Methods

    private async Task<User> CreateTestUser(ApplicationDbContext context, string username)
    {
        var user = new User
        {
            Username = username,
            Email = $"{username}@test.com",
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private async Task<AuditLog> CreateTestAuditLog(
        ApplicationDbContext context,
        int userId,
        AuditEventCategory category,
        string eventType)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Category = category,
            EventType = eventType,
            Action = "Test Action",
            Success = true,
            Timestamp = DateTime.UtcNow,
            IpAddress = "127.0.0.1",
            UserAgent = "Test User Agent"
        };
        context.AuditLogs.Add(log);
        await context.SaveChangesAsync();
        return log;
    }

    #endregion
}
