namespace SceneStack.API.Models;

public class WatchlistItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public string? Notes { get; set; }
    // Priority represents the user's ranking: 1 (highest priority) to N (lowest priority)
    // New items are added at the bottom with Priority = max + 1
    public int Priority { get; set; } = 1;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
