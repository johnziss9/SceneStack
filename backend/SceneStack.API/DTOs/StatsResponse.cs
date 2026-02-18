namespace SceneStack.API.DTOs;

public class UserStatsResponse
{
    public int TotalMovies { get; set; }
    public int TotalWatches { get; set; }
    public double? AverageRating { get; set; }
    public int TotalRewatches { get; set; }
    public List<RatingDistributionItem> RatingsDistribution { get; set; } = new();
    public List<WatchesByYearItem> WatchesByYear { get; set; } = new();
    public List<WatchesByMonthItem> WatchesByMonth { get; set; } = new();
    public List<WatchesByDecadeItem> WatchesByDecade { get; set; } = new();
    public List<WatchLocationItem> WatchesByLocation { get; set; } = new();
    public List<TopRewatchedMovie> TopRewatched { get; set; } = new();
}

public class RatingDistributionItem
{
    public int Rating { get; set; }
    public int Count { get; set; }
}

public class WatchesByYearItem
{
    public int Year { get; set; }
    public int Count { get; set; }
}

public class WatchesByMonthItem
{
    public int Month { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class WatchesByDecadeItem
{
    public string Decade { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class WatchLocationItem
{
    public string Location { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TopRewatchedMovie
{
    public MovieBasicInfo Movie { get; set; } = null!;
    public int WatchCount { get; set; }
}
