namespace SceneStack.API.Models;

public class AiInsight
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public int TokensUsed { get; set; }
    public decimal Cost { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Movie Movie { get; set; } = null!;
    public User User { get; set; } = null!;
}