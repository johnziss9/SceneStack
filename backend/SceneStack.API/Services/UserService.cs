using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public UserService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<User?> GetProfileAsync(int userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    public async Task<User?> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return null;
        }

        // Check if username is being changed and if it's already taken
        if (!string.IsNullOrWhiteSpace(request.Username) && request.Username != user.Username)
        {
            var usernameExists = await _context.Users
                .AnyAsync(u => u.Username == request.Username && u.Id != userId);

            if (usernameExists)
            {
                throw new InvalidOperationException("Username is already taken");
            }

            user.Username = request.Username;

            // Update ApplicationUser username as well
            var authUser = await _userManager.Users
                .FirstOrDefaultAsync(u => u.DomainUserId == userId);
            if (authUser != null)
            {
                authUser.UserName = request.Username;
                await _userManager.UpdateAsync(authUser);
            }
        }

        // Update email
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            user.Email = request.Email;

            // Update ApplicationUser email as well
            var authUser = await _userManager.Users
                .FirstOrDefaultAsync(u => u.DomainUserId == userId);
            if (authUser != null)
            {
                authUser.Email = request.Email;
                await _userManager.UpdateAsync(authUser);
            }
        }

        // Update bio
        if (request.Bio != null)
        {
            user.Bio = request.Bio;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        // Validate that new password matches confirmation
        if (request.NewPassword != request.ConfirmPassword)
        {
            return false;
        }

        // Find the ApplicationUser by domain user ID
        var authUser = await _userManager.Users
            .FirstOrDefaultAsync(u => u.DomainUserId == userId);

        if (authUser == null)
        {
            return false;
        }

        // Verify current password
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, request.CurrentPassword);
        if (!isPasswordValid)
        {
            return false;
        }

        // Change password
        var result = await _userManager.ChangePasswordAsync(
            authUser,
            request.CurrentPassword,
            request.NewPassword
        );

        return result.Succeeded;
    }

    public async Task<bool> DeleteAccountAsync(int userId, string password)
    {
        // Find the ApplicationUser by domain user ID
        var authUser = await _userManager.Users
            .FirstOrDefaultAsync(u => u.DomainUserId == userId);

        if (authUser == null)
        {
            return false;
        }

        // Verify password before deletion
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, password);
        if (!isPasswordValid)
        {
            return false;
        }

        // Soft delete the domain user
        var domainUser = await _context.Users.FindAsync(userId);
        if (domainUser != null)
        {
            domainUser.IsDeleted = true;
            domainUser.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // Delete the ApplicationUser (hard delete from Identity)
        var result = await _userManager.DeleteAsync(authUser);

        return result.Succeeded;
    }
}
