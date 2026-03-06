using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Constants;
using SceneStack.API.Controllers;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.Tests.Helpers;
using System.Security.Claims;
using Xunit;

namespace SceneStack.Tests.Controllers;

/// <summary>
/// Tests for PrivacyController with focus on audit logging
/// </summary>
public class PrivacyControllerTests
{
    [Fact]
    public async Task GetPrivacySettings_ReturnsCurrentSettings()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = false;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        // Act
        var result = await controller.GetPrivacySettings();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UserPrivacySettingsResponse>().Subject;
        response.ShareWatches.Should().BeTrue();
        response.ShareRatings.Should().BeFalse();
        response.ShareNotes.Should().BeTrue();
    }

    [Fact]
    public async Task UpdatePrivacySettings_UpdatesSettings()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = true;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false,
            ShareRatings = false,
            ShareNotes = false
        };

        // Act
        var result = await controller.UpdatePrivacySettings(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UserPrivacySettingsResponse>().Subject;
        response.ShareWatches.Should().BeFalse();
        response.ShareRatings.Should().BeFalse();
        response.ShareNotes.Should().BeFalse();

        // Verify database was updated
        var updatedUser = await context.Users.FindAsync(user.Id);
        updatedUser!.ShareWatches.Should().BeFalse();
        updatedUser.ShareRatings.Should().BeFalse();
        updatedUser.ShareNotes.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePrivacySettings_LogsAuditEvent_WhenChangesAreMade()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = true;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false,
            ShareRatings = false,
            ShareNotes = true // No change for this one
        };

        // Act
        await controller.UpdatePrivacySettings(request);

        // Assert - Verify audit logging was called with correct event type
        await auditService.Received(1).LogAsync(Arg.Is<AuditLogEntry>(entry =>
            entry.UserId == user.Id &&
            entry.Category == AuditEventCategory.Privacy &&
            entry.EventType == AuditEvents.PrivacySettingsUpdated &&
            entry.Success == true &&
            entry.EntityType == "User" &&
            entry.EntityId == user.Id.ToString()
        ));
    }

    [Fact]
    public async Task UpdatePrivacySettings_LogsChangedSettings_InAuditData()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = false;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false, // Changed
            ShareRatings = false, // No change
            ShareNotes = false    // Changed
        };

        // Act
        await controller.UpdatePrivacySettings(request);

        // Assert - Verify audit log contains additional data about what changed
        await auditService.Received(1).LogAsync(Arg.Is<AuditLogEntry>(entry =>
            entry.AdditionalData != null &&
            entry.AdditionalData.ContainsKey("ChangedSettings") &&
            entry.AdditionalData.ContainsKey("SettingChanges")
        ));
    }

    [Fact]
    public async Task UpdatePrivacySettings_DoesNotLogAudit_WhenNoChangesAreMade()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = false;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = true,  // No change
            ShareRatings = false, // No change
            ShareNotes = true     // No change
        };

        // Act
        await controller.UpdatePrivacySettings(request);

        // Assert - Verify audit logging was NOT called when no changes
        await auditService.DidNotReceive().LogAsync(Arg.Any<AuditLogEntry>());
    }

    [Fact]
    public async Task UpdatePrivacySettings_LogsOldAndNewValues()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = true;
        user.ShareNotes = false;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false,
            ShareRatings = false,
            ShareNotes = true
        };

        // Act
        await controller.UpdatePrivacySettings(request);

        // Assert - Verify old and new values are logged
        await auditService.Received(1).LogAsync(Arg.Is<AuditLogEntry>(entry =>
            entry.OldValues != null &&
            entry.NewValues != null
        ));
    }

    [Fact]
    public async Task UpdatePrivacySettings_ReturnsNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        SetupAuthenticatedUser(controller, 9999); // Non-existent user

        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false
        };

        // Act
        var result = await controller.UpdatePrivacySettings(request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();

        // Verify no audit log was created for non-existent user
        await auditService.DidNotReceive().LogAsync(Arg.Any<AuditLogEntry>());
    }

    [Fact]
    public async Task UpdatePrivacySettings_UpdatesOnlySpecifiedFields()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyController>>();
        var auditService = Substitute.For<IAuditService>();
        var controller = new PrivacyController(context, logger, auditService);

        var user = context.Users.First();
        user.ShareWatches = true;
        user.ShareRatings = true;
        user.ShareNotes = true;
        await context.SaveChangesAsync();

        SetupAuthenticatedUser(controller, user.Id);

        // Only update ShareWatches, leave others null
        var request = new UpdatePrivacySettingsRequest
        {
            ShareWatches = false,
            ShareRatings = null, // Not specified
            ShareNotes = null    // Not specified
        };

        // Act
        await controller.UpdatePrivacySettings(request);

        // Assert
        var updatedUser = await context.Users.FindAsync(user.Id);
        updatedUser!.ShareWatches.Should().BeFalse(); // Changed
        updatedUser.ShareRatings.Should().BeTrue();    // Unchanged
        updatedUser.ShareNotes.Should().BeTrue();      // Unchanged
    }

    /// <summary>
    /// Helper method to setup authenticated user context for controller tests
    /// </summary>
    private static void SetupAuthenticatedUser(PrivacyController controller, int userId)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, "testuser")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }
}
