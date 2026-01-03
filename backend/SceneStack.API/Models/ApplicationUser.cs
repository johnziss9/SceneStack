using Microsoft.AspNetCore.Identity;

namespace SceneStack.API.Models;

public class ApplicationUser : IdentityUser
{
    // Link to domain user
    public int DomainUserId { get; set; }
    public User DomainUser { get; set; } = null!;

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}