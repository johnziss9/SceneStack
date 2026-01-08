namespace SceneStack.API.Models;

public class AiUsage
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Feature { get; set; } = string.Empty; // "Insight" or "Search"
    public int TokensUsed { get; set; }
    public decimal Cost { get; set; }
    
    // Navigation property
    public User User { get; set; } = null!;
}