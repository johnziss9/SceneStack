namespace SceneStack.API.DTOs;

public class CreateWatchRequest
{
    public int TmdbId { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
    public bool IsPrivate { get; set; } = false;
    public List<int> GroupIds { get; set; } = new();  // Groups to share this watch with
}

public class UpdateWatchRequest
{
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
    public bool IsPrivate { get; set; }
    public List<int>? GroupIds { get; set; }
}

public class BulkUpdateWatchesRequest
{
    public List<int> WatchIds { get; set; } = new();
    public bool IsPrivate { get; set; }
    public List<int>? GroupIds { get; set; }
    public string GroupOperation { get; set; } = "replace"; // "add" or "replace"
}