// AI Insight types
export interface AiInsight {
    id: number;
    movieId: number;
    userId: number;
    content: string;
    generatedAt: string;
    tokensUsed: number;
    cost: number;
}

export interface GenerateInsightRequest {
    movieId: number;
}

export interface AiInsightResponse {
    id: number;
    movieId: number;
    content: string;
    generatedAt: string;
    cached: boolean;
    tokensUsed: number;
    cost: number;
}

export interface RegenerateInsightRequest {
    movieId: number;
}

// AI Search types
export interface AiSearchRequest {
    query: string;
}

export interface AiSearchResponse {
    results: WatchEntry[];
    totalMatches: number;
    tokensUsed: number;
    cost: number;
}

// AI Usage Statistics
export interface AiUsageStats {
    insightsGenerated: number;
    searchesPerformed: number;
    totalTokensUsed: number;
    totalCost: number;
    monthStart: string;
}

// Note: WatchEntry is imported from existing types
import type { WatchEntry } from './watch';