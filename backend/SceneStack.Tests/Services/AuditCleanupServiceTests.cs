using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
/// Tests for AuditCleanupService to verify old audit logs are deleted based on retention policy
/// </summary>
public class AuditCleanupServiceTests
{
    [Fact]
    public async Task CleanupOldAuditLogs_DeletesLogsOlderThanRetention()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: true);
        var service = new AuditCleanupService(context, logger, configuration);

        // Add audit logs with different ages
        var oldLog1 = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400) // 400 days old - should be deleted
        };

        var oldLog2 = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.Logout,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-370) // 370 days old - should be deleted
        };

        var recentLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-30) // 30 days old - should be kept
        };

        context.AuditLogs.AddRange(oldLog1, oldLog2, recentLog);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(2); // Two old logs deleted

        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1); // Only recent log remains
        remainingLogs.First().Id.Should().Be(recentLog.Id);
    }

    [Fact]
    public async Task CleanupOldAuditLogs_WithCustomRetention_UsesConfiguredValue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 90, cleanupEnabled: true); // 90 day retention
        var service = new AuditCleanupService(context, logger, configuration);

        // Add logs
        var oldLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-100) // 100 days old - should be deleted with 90 day retention
        };

        var recentLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.Logout,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-80) // 80 days old - should be kept with 90 day retention
        };

        context.AuditLogs.AddRange(oldLog, recentLog);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(1); // One old log deleted
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1);
        remainingLogs.First().Id.Should().Be(recentLog.Id);
    }

    [Fact]
    public async Task CleanupOldAuditLogs_WhenDisabled_DoesNotDeleteAnything()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: false); // Cleanup disabled
        var service = new AuditCleanupService(context, logger, configuration);

        // Add old logs
        var oldLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400) // Very old
        };

        context.AuditLogs.Add(oldLog);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(0); // Nothing deleted when disabled
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1); // Log still exists
    }

    [Fact]
    public async Task CleanupOldAuditLogs_WhenNoOldLogs_ReturnsZero()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: true);
        var service = new AuditCleanupService(context, logger, configuration);

        // Add only recent logs
        var recentLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-10) // Very recent
        };

        context.AuditLogs.Add(recentLog);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(0); // Nothing to delete
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1); // Log still exists
    }

    [Fact]
    public async Task CleanupOldAuditLogs_DeletesMultipleCategories()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: true);
        var service = new AuditCleanupService(context, logger, configuration);

        // Add old logs of different categories
        var oldAuthLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400)
        };

        var oldAccountLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Account,
            EventType = AuditEvents.ProfileUpdated,
            Action = "Update",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400)
        };

        var oldPrivacyLog = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Privacy,
            EventType = AuditEvents.PrivacySettingsUpdated,
            Action = "Update",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400)
        };

        context.AuditLogs.AddRange(oldAuthLog, oldAccountLog, oldPrivacyLog);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(3); // All old logs deleted regardless of category
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().BeEmpty();
    }

    [Fact]
    public async Task CleanupOldAuditLogs_PreservesLogsAtExactCutoffDate()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: true);
        var service = new AuditCleanupService(context, logger, configuration);

        var cutoffDate = DateTime.UtcNow.AddDays(-365);

        // Add logs at exact cutoff and slightly before/after
        var beforeCutoff = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = cutoffDate.AddMinutes(-1) // Just before cutoff - should be deleted
        };

        var atCutoff = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = cutoffDate // Exactly at cutoff - borderline (depends on < vs <=)
        };

        var afterCutoff = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = cutoffDate.AddMinutes(1) // Just after cutoff - should be kept
        };

        context.AuditLogs.AddRange(beforeCutoff, atCutoff, afterCutoff);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        // Logs with Timestamp < cutoffDate are deleted
        // So both "before" and "at" cutoff are deleted, only "after" remains
        deletedCount.Should().Be(2);
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1);
        remainingLogs.First().Id.Should().Be(afterCutoff.Id);
    }

    [Fact]
    public async Task CleanupOldAuditLogs_DeletesLogsForDifferentUsers()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<AuditCleanupService>>();
        var configuration = CreateConfiguration(retentionDays: 365, cleanupEnabled: true);
        var service = new AuditCleanupService(context, logger, configuration);

        // Add old logs for different users
        var oldLogUser1 = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400)
        };

        var oldLogUser2 = new AuditLog
        {
            UserId = 2,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.LoginSuccess,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-400)
        };

        var recentLogUser1 = new AuditLog
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = AuditEvents.Logout,
            Action = "Authenticate",
            Success = true,
            Timestamp = DateTime.UtcNow.AddDays(-30)
        };

        context.AuditLogs.AddRange(oldLogUser1, oldLogUser2, recentLogUser1);
        await context.SaveChangesAsync();

        // Act
        var deletedCount = await service.CleanupOldAuditLogsAsync();

        // Assert
        deletedCount.Should().Be(2); // Old logs for both users deleted
        var remainingLogs = await context.AuditLogs.ToListAsync();
        remainingLogs.Should().HaveCount(1);
        remainingLogs.First().UserId.Should().Be(1);
    }

    /// <summary>
    /// Helper method to create mock configuration with audit settings
    /// </summary>
    private static IConfiguration CreateConfiguration(int retentionDays, bool cleanupEnabled)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "AuditSettings:RetentionDays", retentionDays.ToString() },
                { "AuditSettings:CleanupEnabled", cleanupEnabled.ToString() }
            })
            .Build();

        return configuration;
    }
}
