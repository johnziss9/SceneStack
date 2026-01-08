namespace SceneStack.API.DTOs;

public class AiUsageStatsResponse
{
    public int InsightsGenerated { get; set; }
    public int SearchesPerformed { get; set; }
    public int TotalTokensUsed { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime MonthStart { get; set; }
}