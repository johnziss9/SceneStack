using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        // 1. Create the domain user first
        var domainUser = new User
        {
            Username = request.Username,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.Users.Add(domainUser);
        await _context.SaveChangesAsync();

        // 2. Create the authentication user
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
            return null;
        }

        // 3. Generate JWT token
        var token = GenerateJwtToken(authUser, domainUser);

        return new AuthResponse(
            Token: token,
            Username: domainUser.Username,
            Email: domainUser.Email,
            UserId: domainUser.Id
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // 1. Find the auth user by email
        var authUser = await _userManager.FindByEmailAsync(request.Email);
        if (authUser == null)
        {
            return null;
        }

        // 2. Verify password
        var isPasswordValid = await _userManager.CheckPasswordAsync(authUser, request.Password);
        if (!isPasswordValid)
        {
            return null;
        }

        // 3. Load the domain user
        var domainUser = await _context.Users.FindAsync(authUser.DomainUserId);
        if (domainUser == null)
        {
            return null;
        }

        // 4. Generate JWT token
        var token = GenerateJwtToken(authUser, domainUser);

        return new AuthResponse(
            Token: token,
            Username: domainUser.Username,
            Email: domainUser.Email,
            UserId: domainUser.Id
        );
    }

    private string GenerateJwtToken(ApplicationUser authUser, User domainUser)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var issuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT Issuer not configured");
        var audience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT Audience not configured");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, domainUser.Id.ToString()), // Domain User.Id (int)
            new Claim(ClaimTypes.Name, authUser.UserName ?? string.Empty),
            new Claim(ClaimTypes.Email, authUser.Email ?? string.Empty),
            new Claim("AuthUserId", authUser.Id), // ApplicationUser.Id (string GUID)
            new Claim("IsPremium", domainUser.IsPremium.ToString())
        };

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