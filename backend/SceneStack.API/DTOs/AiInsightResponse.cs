namespace SceneStack.API.DTOs;

public class AiInsightResponse
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public bool Cached { get; set; }
    public int TokensUsed { get; set; }
    public decimal Cost { get; set; }
}