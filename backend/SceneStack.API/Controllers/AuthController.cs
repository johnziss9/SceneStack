using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.Constants;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditService _auditService;

    public AuthController(IAuthService authService, IAuditService auditService)
    {
        _authService = authService;
        _auditService = auditService;
    }

    // POST: api/auth/register
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);

        if (result == null)
        {
            return BadRequest(new { message = "Registration failed. User may already exist." });
        }

        return Ok(result);
    }

    // POST: api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);

            if (result == null)
            {
                return Unauthorized(new { message = "Invalid email/username or password." });
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("permanently deactivated"))
        {
            Console.WriteLine($"Caught permanently deactivated exception: {ex.Message}");
            return StatusCode(410, new { message = ex.Message }); // 410 Gone - resource permanently deleted
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Unexpected login error: {ex.Message}");
            throw;
        }
    }

    // POST: api/auth/logout
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // With JWT, logout is handled client-side by removing the token
        // This endpoint exists for consistency and future enhancements (e.g., token blacklisting)

        var userId = User.GetUserId();

        // Audit log: Logout
        await _auditService.LogAuthenticationAsync(
            userId: userId,
            eventType: AuditEvents.Logout,
            success: true);

        return Ok(new { message = "Logged out successfully" });
    }
}