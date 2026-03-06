using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;
using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SceneStack.Tests.Helpers;
using System.Net;

namespace SceneStack.Tests.Services;

public class AuditServiceTests
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuditService _auditService;

    public AuditServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new TestApplicationDbContext(options);

        // Setup logger
        _logger = Substitute.For<ILogger<AuditService>>();

        // Setup HttpContextAccessor with mock IP and User-Agent
        _httpContextAccessor = Substitute.For<IHttpContextAccessor>();
        var httpContext = Substitute.For<HttpContext>();
        var connection = Substitute.For<ConnectionInfo>();
        connection.RemoteIpAddress.Returns(IPAddress.Parse("127.0.0.1"));
        httpContext.Connection.Returns(connection);

        var headers = new HeaderDictionary
        {
            { "User-Agent", "Test User Agent" }
        };
        httpContext.Request.Headers.Returns(headers);
        _httpContextAccessor.HttpContext.Returns(httpContext);

        _auditService = new AuditService(_context, _logger, _httpContextAccessor);
    }

    [Fact]
    public async Task LogAsync_ShouldCreateAuditLog()
    {
        // Arrange
        var entry = new AuditLogEntry
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = "Login.Success",
            Action = "Authenticate",
            Success = true,
            AdditionalData = new Dictionary<string, object>
            {
                { "Username", "testuser" }
            }
        };

        // Act
        await _auditService.LogAsync(entry);

        // Assert
        var auditLog = await _context.AuditLogs.FirstOrDefaultAsync();
        auditLog.Should().NotBeNull();
        auditLog!.UserId.Should().Be(1);
        auditLog.Category.Should().Be(AuditEventCategory.Authentication);
        auditLog.EventType.Should().Be("Login.Success");
        auditLog.Action.Should().Be("Authenticate");
        auditLog.Success.Should().BeTrue();
        auditLog.IpAddress.Should().Be("127.0.0.1");
        auditLog.UserAgent.Should().Be("Test User Agent");
        auditLog.AdditionalData.Should().Contain("Username");
    }

    [Fact]
    public async Task LogAsync_WithOldAndNewValues_ShouldSerializeToJson()
    {
        // Arrange
        var oldValues = new { Username = "olduser", Email = "old@test.com" };
        var newValues = new { Username = "newuser", Email = "new@test.com" };

        var entry = new AuditLogEntry
        {
            UserId = 1,
            Category = AuditEventCategory.Account,
            EventType = "Profile.Updated",
            Action = "Update",
            Success = true,
            EntityType = "User",
            EntityId = "1",
            OldValues = oldValues,
            NewValues = newValues
        };

        // Act
        await _auditService.LogAsync(entry);

        // Assert
        var auditLog = await _context.AuditLogs.FirstOrDefaultAsync();
        auditLog.Should().NotBeNull();
        auditLog!.OldValues.Should().Contain("olduser");
        auditLog.OldValues.Should().Contain("old@test.com");
        auditLog.NewValues.Should().Contain("newuser");
        auditLog.NewValues.Should().Contain("new@test.com");
    }

    [Fact]
    public async Task LogAsync_WhenExceptionThrown_ShouldNotThrow()
    {
        // Arrange
        // Dispose context to force an error
        await _context.DisposeAsync();

        var entry = new AuditLogEntry
        {
            UserId = 1,
            Category = AuditEventCategory.Authentication,
            EventType = "Login.Success",
            Action = "Authenticate",
            Success = true
        };

        // Act & Assert - Should not throw
        await _auditService.Invoking(s => s.LogAsync(entry))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task LogAuthenticationAsync_ShouldCreateAuthenticationLog()
    {
        // Arrange
        var userId = 1;
        var eventType = "Login.Success";
        var additionalData = new Dictionary<string, object>
        {
            { "Username", "testuser" },
            { "Email", "test@example.com" }
        };

        // Act
        await _auditService.LogAuthenticationAsync(userId, eventType, true, null, additionalData);

        // Assert
        var auditLog = await _context.AuditLogs.FirstOrDefaultAsync();
        auditLog.Should().NotBeNull();
        auditLog!.UserId.Should().Be(userId);
        auditLog.Category.Should().Be(AuditEventCategory.Authentication);
        auditLog.EventType.Should().Be(eventType);
        auditLog.Success.Should().BeTrue();
        auditLog.AdditionalData.Should().Contain("testuser");
    }

    [Fact]
    public async Task LogEntityChangeAsync_ShouldCaptureBeforeAndAfter()
    {
        // Arrange
        var userId = 1;
        var oldEntity = new User { Id = 1, Username = "oldname", Email = "old@test.com" };
        var newEntity = new User { Id = 1, Username = "newname", Email = "new@test.com" };

        // Act
        await _auditService.LogEntityChangeAsync(
            userId,
            "Profile.Updated",
            "Update",
            oldEntity,
            newEntity);

        // Assert
        var auditLog = await _context.AuditLogs.FirstOrDefaultAsync();
        auditLog.Should().NotBeNull();
        auditLog!.EntityType.Should().Be("User");
        auditLog.EntityId.Should().Be("1");
        auditLog.OldValues.Should().Contain("oldname");
        auditLog.NewValues.Should().Contain("newname");
    }

    [Fact]
    public async Task GetUserAuditTrailAsync_ShouldReturnUserLogs()
    {
        // Arrange
        var userId = 1;
        await _auditService.LogAuthenticationAsync(userId, "Login.Success", true);
        await _auditService.LogAuthenticationAsync(userId, "Logout", true);
        await _auditService.LogAuthenticationAsync(2, "Login.Success", true); // Different user

        // Act
        var auditTrail = await _auditService.GetUserAuditTrailAsync(userId);

        // Assert
        auditTrail.Should().HaveCount(2);
        auditTrail.Should().AllSatisfy(log => log.UserId.Should().Be(userId));
    }

    [Fact]
    public async Task GetUserAuditTrailAsync_WithDateRange_ShouldFilterByDate()
    {
        // Arrange
        var userId = 1;
        await _auditService.LogAuthenticationAsync(userId, "Login.Success", true);
        await Task.Delay(200); // Delay to ensure different timestamps
        var cutoffTime = DateTime.UtcNow;
        await Task.Delay(200); // Another delay
        await _auditService.LogAuthenticationAsync(userId, "Logout", true);

        // Act - Get logs from cutoff time onwards (should only get the second one)
        var auditTrail = await _auditService.GetUserAuditTrailAsync(userId, from: cutoffTime);

        // Assert
        auditTrail.Should().HaveCount(1);
        auditTrail.First().EventType.Should().Be("Logout");
    }

    [Fact]
    public async Task GetSecurityEventsAsync_ShouldReturnSecurityAndFailedAuth()
    {
        // Arrange
        await _auditService.LogAuthenticationAsync(1, "Login.Success", true); // Not included
        await _auditService.LogAuthenticationAsync(2, "Login.Failed.InvalidCredentials", false); // Included
        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = 3,
            Category = AuditEventCategory.Security,
            EventType = "Security.UnauthorizedAccess",
            Action = "Access",
            Success = false
        }); // Included

        // Act
        var securityEvents = await _auditService.GetSecurityEventsAsync();

        // Assert
        securityEvents.Should().HaveCount(2);
        securityEvents.Should().Contain(log => log.EventType == "Login.Failed.InvalidCredentials");
        securityEvents.Should().Contain(log => log.EventType == "Security.UnauthorizedAccess");
    }

    [Fact]
    public async Task GetFailedLoginsAsync_ShouldReturnOnlyFailedLogins()
    {
        // Arrange
        await _auditService.LogAuthenticationAsync(1, "Login.Success", true); // Not included
        await _auditService.LogAuthenticationAsync(2, "Login.Failed.InvalidCredentials", false); // Included
        await _auditService.LogAuthenticationAsync(3, "Login.Failed.AccountDeleted", false); // Included

        // Act
        var failedLogins = await _auditService.GetFailedLoginsAsync();

        // Assert
        failedLogins.Should().HaveCount(2);
        failedLogins.Should().AllSatisfy(log =>
            log.EventType.Should().Contain("Login.Failed"));
    }

    [Fact]
    public async Task LogSimpleEventAsync_ShouldCreateSimpleLog()
    {
        // Arrange
        var userId = 1;

        // Act
        await _auditService.LogSimpleEventAsync(
            userId,
            AuditEventCategory.Watch,
            "Watch.Created",
            success: true);

        // Assert
        var auditLog = await _context.AuditLogs.FirstOrDefaultAsync();
        auditLog.Should().NotBeNull();
        auditLog!.UserId.Should().Be(userId);
        auditLog.Category.Should().Be(AuditEventCategory.Watch);
        auditLog.EventType.Should().Be("Watch.Created");
        auditLog.Success.Should().BeTrue();
    }
}
