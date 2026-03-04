namespace SceneStack.API.Models;

public class MovieGroup
{
    public int MovieId { get; set; }
    public int GroupId { get; set; }
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Movie Movie { get; set; } = null!;
    public Group Group { get; set; } = null!;
}
