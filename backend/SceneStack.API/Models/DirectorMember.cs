namespace SceneStack.API.Models;

public class DirectorMember
{
    public int PersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ProfilePath { get; set; }
}
