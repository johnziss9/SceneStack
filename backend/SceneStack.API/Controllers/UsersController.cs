using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // GET: api/users/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        var user = await _userService.GetProfileAsync(userId);

        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(new
        {
            userId = user.Id,
            username = user.Username,
            email = user.Email,
            bio = user.Bio,
            isPremium = user.IsPremium,
            createdAt = user.CreatedAt
        });
    }

    // PUT: api/users/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();

        try
        {
            var updatedUser = await _userService.UpdateProfileAsync(userId, request);

            if (updatedUser == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                userId = updatedUser.Id,
                username = updatedUser.Username,
                email = updatedUser.Email,
                bio = updatedUser.Bio,
                isPremium = updatedUser.IsPremium,
                createdAt = updatedUser.CreatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // PUT: api/users/password
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();

        var success = await _userService.ChangePasswordAsync(userId, request);

        if (!success)
        {
            return BadRequest(new { message = "Failed to change password. Please check your current password and try again." });
        }

        return Ok(new { message = "Password changed successfully" });
    }

    // DELETE: api/users/account
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var userId = User.GetUserId();

        var success = await _userService.DeleteAccountAsync(userId, request.Password);

        if (!success)
        {
            return BadRequest(new { message = "Failed to delete account. Please check your password and try again." });
        }

        return Ok(new { message = "Account deleted successfully" });
    }
}
