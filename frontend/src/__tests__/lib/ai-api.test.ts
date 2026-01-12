import { aiApi } from '@/lib/api'
import { api } from '@/lib/api-client'
import type { AiInsightResponse, AiSearchResponse, AiUsageStats } from '@/types'

// Mock the api-client module
jest.mock('@/lib/api-client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
    },
    ApiError: class ApiError extends Error {
        constructor(public status: number, message: string) {
            super(message)
            this.name = 'ApiError'
        }
    },
    PremiumRequiredError: class PremiumRequiredError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'PremiumRequiredError'
        }
    },
    RateLimitError: class RateLimitError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'RateLimitError'
        }
    },
}))

describe('AI API Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('aiApi.generateInsight', () => {
        it('should generate insight for a movie', async () => {
            const mockResponse: AiInsightResponse = {
                id: 1,
                movieId: 550,
                content: 'This is a personalized insight about your journey with this film.',
                generatedAt: '2025-01-09T10:00:00Z',
                cached: false,
                tokensUsed: 500,
                cost: 0.0075,
            }

                ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.generateInsight({ movieId: 550 })

            expect(api.post).toHaveBeenCalledWith('/api/ai/insights', { movieId: 550 })
            expect(result).toEqual(mockResponse)
        })

        it('should return cached insight if available', async () => {
            const mockResponse: AiInsightResponse = {
                id: 1,
                movieId: 550,
                content: 'Cached insight content.',
                generatedAt: '2025-01-08T10:00:00Z',
                cached: true,
                tokensUsed: 500,
                cost: 0.0075,
            }

                ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.generateInsight({ movieId: 550 })

            expect(result.cached).toBe(true)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('aiApi.getCachedInsight', () => {
        it('should get cached insight for a movie', async () => {
            const mockResponse: AiInsightResponse = {
                id: 1,
                movieId: 550,
                content: 'Cached insight content.',
                generatedAt: '2025-01-08T10:00:00Z',
                cached: true,
                tokensUsed: 500,
                cost: 0.0075,
            }

                ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.getCachedInsight(550)

            expect(api.get).toHaveBeenCalledWith('/api/ai/insights/550')
            expect(result).toEqual(mockResponse)
        })

        it('should handle 404 when no cached insight exists', async () => {
            const mockError = {
                status: 404,
                message: 'Not found',
                name: 'ApiError',
            }
            ;(api.get as jest.Mock).mockRejectedValue(mockError)

            await expect(aiApi.getCachedInsight(550)).rejects.toMatchObject({
                status: 404,
            })
        })
    })

    describe('aiApi.regenerateInsight', () => {
        it('should regenerate insight for a movie', async () => {
            const mockResponse: AiInsightResponse = {
                id: 1,
                movieId: 550,
                content: 'Newly regenerated insight content.',
                generatedAt: '2025-01-09T12:00:00Z',
                cached: false,
                tokensUsed: 520,
                cost: 0.0078,
            }

                ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.regenerateInsight({ movieId: 550 })

            expect(api.post).toHaveBeenCalledWith('/api/ai/insights/550/regenerate', { movieId: 550 })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('aiApi.search', () => {
        it('should search watches using natural language', async () => {
            const mockResponse: AiSearchResponse = {
                results: [
                    {
                        id: 1,
                        movieId: 1,
                        watchedDate: '2024-07-15',
                        rating: 9,
                        notes: 'Watched with John',
                        watchLocation: 'Cinema',
                        watchedWith: 'John',
                        isRewatch: false,
                        movie: {
                            id: 1,
                            tmdbId: 550,
                            title: 'Fight Club',
                            year: 1999,
                            posterPath: '/path.jpg',
                            synopsis: 'A movie about...',
                        },
                    },
                ],
                totalMatches: 1,
                tokensUsed: 300,
                cost: 0.0045,
            }

                ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.search({ query: 'thriller I watched last summer with John' })

            expect(api.post).toHaveBeenCalledWith('/api/ai/search', { query: 'thriller I watched last summer with John' })
            expect(result).toEqual(mockResponse)
        })

        it('should return empty results when no matches found', async () => {
            const mockResponse: AiSearchResponse = {
                results: [],
                totalMatches: 0,
                tokensUsed: 250,
                cost: 0.00375,
            }

                ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.search({ query: 'nonexistent movie' })

            expect(result.results).toHaveLength(0)
            expect(result.totalMatches).toBe(0)
        })
    })

    describe('aiApi.getUsageStats', () => {
        it('should get AI usage statistics for current month', async () => {
            const mockResponse: AiUsageStats = {
                insightsGenerated: 5,
                searchesPerformed: 12,
                totalTokensUsed: 3500,
                totalCost: 0.0525,
                monthStart: '2025-01-01T00:00:00Z',
            }

                ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.getUsageStats()

            expect(api.get).toHaveBeenCalledWith('/api/ai/usage')
            expect(result).toEqual(mockResponse)
        })

        it('should return zero stats when no usage in current month', async () => {
            const mockResponse: AiUsageStats = {
                insightsGenerated: 0,
                searchesPerformed: 0,
                totalTokensUsed: 0,
                totalCost: 0,
                monthStart: '2025-01-01T00:00:00Z',
            }

                ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await aiApi.getUsageStats()

            expect(result.insightsGenerated).toBe(0)
            expect(result.searchesPerformed).toBe(0)
        })
    })
})