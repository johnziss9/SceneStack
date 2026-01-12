import { render, screen, waitFor } from '@/test-utils'
import { AiUsageStats } from '@/components/AiUsageStats'
import { aiApi } from '@/lib/api'
import type { AiUsageStats as AiUsageStatsType } from '@/types'

// Mock the API
jest.mock('@/lib/api', () => ({
    aiApi: {
        getUsageStats: jest.fn(),
    },
}))

const mockAiApi = aiApi as jest.Mocked<typeof aiApi>

describe('AiUsageStats', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should show loading skeleton initially', () => {
        mockAiApi.getUsageStats.mockImplementation(() => new Promise(() => { })) // Never resolves

        render(<AiUsageStats />)

        // Should show card with loading state (check for Card component)
        expect(screen.queryByText('AI Usage This Month')).not.toBeInTheDocument()
        expect(screen.queryByText('Insights Generated')).not.toBeInTheDocument()
    })

    it('should fetch and display usage stats', async () => {
        const mockStats: AiUsageStatsType = {
            insightsGenerated: 5,
            searchesPerformed: 12,
            totalTokensUsed: 3500,
            totalCost: 0.0525,
            monthStart: '2025-01-01T00:00:00Z',
        }

        mockAiApi.getUsageStats.mockResolvedValue(mockStats)

        render(<AiUsageStats />)

        // Wait for stats to load
        await waitFor(() => {
            expect(screen.getByText('AI Usage This Month')).toBeInTheDocument()
        })

        // Check month display
        expect(screen.getByText('January 2025')).toBeInTheDocument()

        // Check insights count
        expect(screen.getByText('Insights Generated')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()

        // Check searches count
        expect(screen.getByText('Searches Performed')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('should call getUsageStats API on mount', async () => {
        const mockStats: AiUsageStatsType = {
            insightsGenerated: 3,
            searchesPerformed: 7,
            totalTokensUsed: 2000,
            totalCost: 0.03,
            monthStart: '2025-01-01T00:00:00Z',
        }

        mockAiApi.getUsageStats.mockResolvedValue(mockStats)

        render(<AiUsageStats />)

        await waitFor(() => {
            expect(mockAiApi.getUsageStats).toHaveBeenCalledTimes(1)
        })
    })

    it('should display zero stats when no usage', async () => {
        const mockStats: AiUsageStatsType = {
            insightsGenerated: 0,
            searchesPerformed: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            monthStart: '2025-01-01T00:00:00Z',
        }

        mockAiApi.getUsageStats.mockResolvedValue(mockStats)

        render(<AiUsageStats />)

        await waitFor(() => {
            expect(screen.getByText('AI Usage This Month')).toBeInTheDocument()
        })

        // Check that both insights and searches show 0
        expect(screen.getByText('Insights Generated')).toBeInTheDocument()
        expect(screen.getByText('Searches Performed')).toBeInTheDocument()

        // Should show two zeros (one for insights, one for searches)
        const zeroElements = screen.getAllByText('0')
        expect(zeroElements.length).toBe(2)
    })

    it('should render nothing if stats fail to load', async () => {
        mockAiApi.getUsageStats.mockRejectedValue(new Error('Failed to fetch'))

        const { container } = render(<AiUsageStats />)

        await waitFor(() => {
            expect(container.firstChild).toBeNull()
        })
    })

    it('should format month correctly from monthStart date', async () => {
        const mockStats: AiUsageStatsType = {
            insightsGenerated: 1,
            searchesPerformed: 2,
            totalTokensUsed: 500,
            totalCost: 0.0075,
            monthStart: '2024-12-01T00:00:00Z',
        }

        mockAiApi.getUsageStats.mockResolvedValue(mockStats)

        render(<AiUsageStats />)

        await waitFor(() => {
            expect(screen.getByText('December 2024')).toBeInTheDocument()
        })
    })

    it('should display stats in correct structure with labels', async () => {
        const mockStats: AiUsageStatsType = {
            insightsGenerated: 8,
            searchesPerformed: 15,
            totalTokensUsed: 4500,
            totalCost: 0.0675,
            monthStart: '2025-01-01T00:00:00Z',
        }

        mockAiApi.getUsageStats.mockResolvedValue(mockStats)

        render(<AiUsageStats />)

        await waitFor(() => {
            // Check structure
            expect(screen.getByText('AI Usage This Month')).toBeInTheDocument()
            expect(screen.getByText('Insights Generated')).toBeInTheDocument()
            expect(screen.getByText('8')).toBeInTheDocument()
            expect(screen.getByText('Searches Performed')).toBeInTheDocument()
            expect(screen.getByText('15')).toBeInTheDocument()
        })
    })
})