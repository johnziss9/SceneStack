namespace SceneStack.API.Models;

public class WriterMember
{
    public int PersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Job { get; set; } = string.Empty; // e.g., "Screenplay", "Writer", "Story"
    public string? ProfilePath { get; set; }
}
