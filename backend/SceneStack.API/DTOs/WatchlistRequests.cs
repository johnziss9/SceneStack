using SceneStack.API.Models;

namespace SceneStack.API.DTOs;

public class AddToWatchlistRequest
{
    public int TmdbId { get; set; }
    public string? Notes { get; set; }
    public WatchlistItemPriority Priority { get; set; } = WatchlistItemPriority.Normal;
}

public class UpdateWatchlistItemRequest
{
    public string? Notes { get; set; }
    public WatchlistItemPriority Priority { get; set; } = WatchlistItemPriority.Normal;
}
