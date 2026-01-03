using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using Xunit;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace SceneStack.Tests.Services;

public class AuthServiceTests
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup UserManager mock
        var userStore = Substitute.For<IUserStore<ApplicationUser>>();
        _userManager = Substitute.For<UserManager<ApplicationUser>>(
            userStore, null, null, null, null, null, null, null, null);

        // Setup Configuration mock
        _configuration = Substitute.For<IConfiguration>();
        var jwtSection = Substitute.For<IConfigurationSection>();
        jwtSection["SecretKey"].Returns("test-secret-key-that-is-at-least-32-characters-long-for-testing");
        jwtSection["Issuer"].Returns("TestIssuer");
        jwtSection["Audience"].Returns("TestAudience");
        _configuration.GetSection("JwtSettings").Returns(jwtSection);

        _authService = new AuthService(_userManager, _context, _configuration);
    }

    [Fact]
    public async Task RegisterAsync_WithValidRequest_ShouldCreateUserAndReturnToken()
    {
        // Arrange
        var request = new RegisterRequest(
            Username: "testuser",
            Email: "test@example.com",
            Password: "Password123!"
        );

        _userManager.CreateAsync(Arg.Any<ApplicationUser>(), Arg.Any<string>())
            .Returns(IdentityResult.Success);

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result!.Username.Should().Be("testuser");
        result.Email.Should().Be("test@example.com");
        result.Token.Should().NotBeNullOrEmpty();
        result.UserId.Should().BeGreaterThan(0);

        // Verify domain user was created
        var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        domainUser.Should().NotBeNull();
        domainUser!.Username.Should().Be("testuser");
    }

    [Fact]
    public async Task RegisterAsync_WhenUserManagerFails_ShouldReturnNull()
    {
        // Arrange
        var request = new RegisterRequest(
            Username: "testuser",
            Email: "test@example.com",
            Password: "Password123!"
        );

        _userManager.CreateAsync(Arg.Any<ApplicationUser>(), Arg.Any<string>())
            .Returns(IdentityResult.Failed(new IdentityError { Description = "User already exists" }));

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().BeNull();

        // Verify domain user was cleaned up (rolled back)
        var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        domainUser.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ShouldReturnToken()
    {
        // Arrange
        // First create a domain user
        var domainUser = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(domainUser);
        await _context.SaveChangesAsync();

        var authUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com",
            DomainUserId = domainUser.Id
        };

        var request = new LoginRequest(
            Email: "test@example.com",
            Password: "Password123!"
        );

        _userManager.FindByEmailAsync(request.Email).Returns(authUser);
        _userManager.CheckPasswordAsync(authUser, request.Password).Returns(true);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result!.Username.Should().Be("testuser");
        result.Email.Should().Be("test@example.com");
        result.Token.Should().NotBeNullOrEmpty();
        result.UserId.Should().Be(domainUser.Id);
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ShouldReturnNull()
    {
        // Arrange
        var request = new LoginRequest(
            Email: "nonexistent@example.com",
            Password: "Password123!"
        );

        _userManager.FindByEmailAsync(request.Email).Returns((ApplicationUser?)null);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ShouldReturnNull()
    {
        // Arrange
        var authUser = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "testuser",
            Email = "test@example.com",
            DomainUserId = 1
        };

        var request = new LoginRequest(
            Email: "test@example.com",
            Password: "WrongPassword123!"
        );

        _userManager.FindByEmailAsync(request.Email).Returns(authUser);
        _userManager.CheckPasswordAsync(authUser, request.Password).Returns(false);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().BeNull();
    }
}