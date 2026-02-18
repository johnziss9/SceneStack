namespace SceneStack.API.Models;

public enum WatchlistItemPriority
{
    Normal = 0,
    High = 1
}

public class WatchlistItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public string? Notes { get; set; }
    public WatchlistItemPriority Priority { get; set; } = WatchlistItemPriority.Normal;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}
