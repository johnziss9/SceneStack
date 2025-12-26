namespace SceneStack.API.DTOs;

public class CreateWatchRequest
{
    public int TmdbId { get; set; }
    public int UserId { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
}

public class UpdateWatchRequest
{
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
}