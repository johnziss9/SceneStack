namespace SceneStack.API.Configuration;

public class ClaudeApiSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int MaxTokens { get; set; }
    public decimal Temperature { get; set; }
}