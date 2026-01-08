namespace SceneStack.API.DTOs;

public class AiSearchResponse
{
    public List<WatchResponse> Results { get; set; } = new();
    public int TotalMatches { get; set; }
    public int TokensUsed { get; set; }
    public decimal Cost { get; set; }
}