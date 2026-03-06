using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SceneStack.API.Constants;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IAuditService _auditService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IConfiguration configuration,
        IAuditService auditService)
    {
        _userManager = userManager;
        _context = context;
        _configuration = configuration;
        _auditService = auditService;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        // 1. Check if deleted users with this email or username exist
        var deletedUsersToAnonymize = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsDeleted && (u.Email == request.Email || u.Username == request.Username))
            .ToListAsync();

        // 2. Clean up old AspNetUsers records and anonymize email/username for deleted accounts
        foreach (var deletedUser in deletedUsersToAnonymize)
        {
            // Delete old AspNetUsers records
            var existingAuthUser = await _userManager.Users
                .FirstOrDefaultAsync(au => au.DomainUserId == deletedUser.Id);

            if (existingAuthUser != null)
            {
                await _userManager.DeleteAsync(existingAuthUser);
            }

            // Anonymize email if it matches
            if (deletedUser.Email == request.Email)
            {
                deletedUser.Email = $"deleted_{deletedUser.Id}_{Guid.NewGuid().ToString().Substring(0, 8)}@deleted.local";
            }

            // Anonymize username if it matches
            if (deletedUser.Username == request.Username)
            {
                deletedUser.Username = $"deleted_{deletedUser.Id}_{Guid.NewGuid().ToString().Substring(0, 8)}";
            }

            deletedUser.UpdatedAt = DateTime.UtcNow;
        }

        if (deletedUsersToAnonymize.Any())
        {
            await _context.SaveChangesAsync();
        }

        // 3. Create the domain user
        // Note: We keep old deleted User records for data integrity (group history, etc.)
        // and create a new User record for the new registration
        var domainUser = new User
        {
            Username = request.Username,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false,
            IsDeactivated = false
        };

        _context.Users.Add(domainUser);
        await _context.SaveChangesAsync();

        // 4. Create the authentication user
        var authUser = new ApplicationUser
        {
            UserName = request.Username,
            Email = request.Email,
            DomainUserId = domainUser.Id,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(authUser, request.Password);

        if (!result.Succeeded)
        {
            // Clean up domain user if auth user creation fails
            _context.Users.Remove(domainUser);
            await _context.SaveChangesAsync();

            // Audit log: Registration failed
            await _auditService.LogAuthenticationAsync(
                userId: null,
                eventType: AuditEvents.RegisterFailed,
                success: false,
                errorMessage: string.Join(", ", result.Errors.Select(e => e.Description)),
                additionalData: new Dictionary<string, object>
                {
                    { "Username", request.Username },
                    { "Email", request.Email },
                    { "Errors", result.Errors.Select(e => new { e.Code, e.Description }).ToList() }
                });

            return null;
        }

        // 5. Generate JWT token
        var token = GenerateJwtToken(authUser, domainUser);

        // Audit log: Registration success
        await _auditService.LogAuthenticationAsync(
            userId: domainUser.Id,
            eventType: AuditEvents.RegisterSuccess,
            success: true,
            additionalData: new Dictionary<string, object>
            {
                { "Username", domainUser.Username },
                { "Email", domainUser.Email }
            });

        return new AuthResponse(
            Token: token,
            Username: domainUser.Username,
            Email: domainUser.Email,
            UserId: domainUser.Id,
            IsDeactivated: false
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // 1. Find the auth user by email or username
        var authUser = await _userManager.FindByEmailAsync(request.EmailOrUsername);
        if (authUser == null)
        {
            // Try finding by username if email lookup failed
            authUser = await _userManager.FindByNameAsync(request.EmailOrUsername);
            if (authUser == null)
            {
                // Audit log: Login failed - user not found
                await _auditService.LogAuthenticationAsync(
                    userId: null,
                    eventType: AuditEvents.LoginFailedInvalidCredentials,
                    success: false,
                    errorMessage: "User not found",
                    additionalData: new Dictionary<string, object>
                    {
                        { "EmailOrUsername", request.EmailOrUsername }
                    });

                return null;
            }
        }

        // 2. Verify password
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, request.Password);
        if (!isPasswordValid)
        {
            // Audit log: Login failed - invalid password
            await _auditService.LogAuthenticationAsync(
                userId: authUser.DomainUserId,
                eventType: AuditEvents.LoginFailedInvalidCredentials,
                success: false,
                errorMessage: "Invalid password",
                additionalData: new Dictionary<string, object>
                {
                    { "EmailOrUsername", request.EmailOrUsername }
                });

            return null;
        }

        // 3. Load the domain user (bypass query filter to check deleted accounts)
        var domainUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == authUser.DomainUserId);

        if (domainUser == null)
        {
            return null;
        }

        // 4. Check if account is permanently deleted
        if (domainUser.IsDeleted)
        {
            // Audit log: Login failed - account permanently deleted
            await _auditService.LogAuthenticationAsync(
                userId: domainUser.Id,
                eventType: AuditEvents.LoginFailedAccountDeleted,
                success: false,
                errorMessage: "Account has been permanently deleted",
                additionalData: new Dictionary<string, object>
                {
                    { "EmailOrUsername", request.EmailOrUsername },
                    { "DeletedAt", domainUser.DeletedAt ?? DateTime.UtcNow }
                });

            throw new InvalidOperationException("Account has been permanently deactivated and cannot be accessed.");
        }

        // 5. Generate JWT token
        var token = GenerateJwtToken(authUser, domainUser);

        // 6. Calculate days until permanent deletion ONLY if scheduled for deletion
        int? daysUntilPermanentDeletion = null;
        if (domainUser.IsDeactivated && domainUser.DeletedAt.HasValue)
        {
            // DeletedAt is set = account is scheduled for deletion (30-day countdown)
            var daysSinceDeletionStarted = (DateTime.UtcNow - domainUser.DeletedAt.Value).Days;
            var daysRemaining = 30 - daysSinceDeletionStarted;
            daysUntilPermanentDeletion = daysRemaining > 0 ? daysRemaining : 0;
        }
        // If deactivated but DeletedAt is null = simple deactivation (no countdown)

        // Audit log: Login success
        await _auditService.LogAuthenticationAsync(
            userId: domainUser.Id,
            eventType: AuditEvents.LoginSuccess,
            success: true,
            additionalData: new Dictionary<string, object>
            {
                { "Username", domainUser.Username },
                { "Email", domainUser.Email },
                { "IsDeactivated", domainUser.IsDeactivated },
                { "DaysUntilPermanentDeletion", daysUntilPermanentDeletion ?? 0 }
            });

        return new AuthResponse(
            Token: token,
            Username: domainUser.Username,
            Email: domainUser.Email,
            UserId: domainUser.Id,
            IsDeactivated: domainUser.IsDeactivated,
            DeactivatedAt: domainUser.DeactivatedAt,
            DaysUntilPermanentDeletion: daysUntilPermanentDeletion
        );
    }

    private string GenerateJwtToken(ApplicationUser authUser, User domainUser)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var issuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT Issuer not configured");
        var audience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT Audience not configured");

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, domainUser.Id.ToString()), // Domain User.Id (int)
            new Claim(ClaimTypes.Name, authUser.UserName ?? string.Empty),
            new Claim(ClaimTypes.Email, authUser.Email ?? string.Empty),
            new Claim("AuthUserId", authUser.Id), // ApplicationUser.Id (string GUID)
            new Claim("IsPremium", domainUser.IsPremium.ToString())
        };

        // Add roles to claims
        var roles = _userManager.GetRolesAsync(authUser).Result;
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7), // 7-day token
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}