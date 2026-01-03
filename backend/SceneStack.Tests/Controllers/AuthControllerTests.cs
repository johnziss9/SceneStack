using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Services;

namespace SceneStack.Tests.Controllers;

public class AuthControllerTests
{
    [Fact]
    public async Task Register_ValidRequest_ReturnsOkWithToken()
    {
        // Arrange
        var authService = Substitute.For<IAuthService>();
        var controller = new AuthController(authService);

        var request = new RegisterRequest(
            Username: "testuser",
            Email: "test@example.com",
            Password: "Password123!"
        );

        var authResponse = new AuthResponse(
            Token: "fake-jwt-token",
            Username: "testuser",
            Email: "test@example.com",
            UserId: 1
        );

        authService.RegisterAsync(request).Returns(authResponse);

        // Act
        var result = await controller.Register(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedResponse = okResult.Value.Should().BeOfType<AuthResponse>().Subject;
        returnedResponse.Token.Should().Be("fake-jwt-token");
        returnedResponse.Username.Should().Be("testuser");
        returnedResponse.Email.Should().Be("test@example.com");
        returnedResponse.UserId.Should().Be(1);
    }

    [Fact]
    public async Task Register_ServiceReturnsNull_ReturnsBadRequest()
    {
        // Arrange
        var authService = Substitute.For<IAuthService>();
        var controller = new AuthController(authService);

        var request = new RegisterRequest(
            Username: "testuser",
            Email: "test@example.com",
            Password: "Password123!"
        );

        authService.RegisterAsync(request).Returns((AuthResponse?)null);

        // Act
        var result = await controller.Register(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOkWithToken()
    {
        // Arrange
        var authService = Substitute.For<IAuthService>();
        var controller = new AuthController(authService);

        var request = new LoginRequest(
            Email: "test@example.com",
            Password: "Password123!"
        );

        var authResponse = new AuthResponse(
            Token: "fake-jwt-token",
            Username: "testuser",
            Email: "test@example.com",
            UserId: 1
        );

        authService.LoginAsync(request).Returns(authResponse);

        // Act
        var result = await controller.Login(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedResponse = okResult.Value.Should().BeOfType<AuthResponse>().Subject;
        returnedResponse.Token.Should().Be("fake-jwt-token");
        returnedResponse.Username.Should().Be("testuser");
        returnedResponse.UserId.Should().Be(1);
    }

    [Fact]
    public async Task Login_InvalidCredentials_ReturnsUnauthorized()
    {
        // Arrange
        var authService = Substitute.For<IAuthService>();
        var controller = new AuthController(authService);

        var request = new LoginRequest(
            Email: "test@example.com",
            Password: "WrongPassword123!"
        );

        authService.LoginAsync(request).Returns((AuthResponse?)null);

        // Act
        var result = await controller.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().NotBeNull();
    }

    [Fact]
    public void Logout_ReturnsOkWithMessage()
    {
        // Arrange
        var authService = Substitute.For<IAuthService>();
        var controller = new AuthController(authService);

        // Act
        var result = controller.Logout();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }
}