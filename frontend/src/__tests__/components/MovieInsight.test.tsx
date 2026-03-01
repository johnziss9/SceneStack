import { render, screen, waitFor } from '@/test-utils'
import { MovieInsight } from '@/components/MovieInsight'
import userEvent from '@testing-library/user-event'
import { aiApi } from '@/lib/api'
import { RateLimitError, PremiumRequiredError } from '@/lib/api-client'

// Mock the API
jest.mock('@/lib/api', () => ({
    aiApi: {
        getCachedInsight: jest.fn(),
        generateInsight: jest.fn(),
        regenerateInsight: jest.fn(),
    },
}))

const mockAiApi = aiApi as jest.Mocked<typeof aiApi>

describe('MovieInsight', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should not render when watchCount is 0', () => {
        const { container } = render(
            <MovieInsight movieId={1} watchCount={0} isPremium={true} />
        )

        expect(container.firstChild).toBeNull()
    })

    it('should show upgrade prompt for non-premium users', () => {
        render(<MovieInsight movieId={1} watchCount={3} isPremium={false} />)

        expect(screen.getByText('AI Insight')).toBeInTheDocument()
        expect(screen.getByText(/AI Insights are available with a premium subscription/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Upgrade to Premium/i })).toBeInTheDocument()
    })

    it('should open upgrade modal when upgrade button clicked', async () => {
        const user = userEvent.setup()
        render(<MovieInsight movieId={1} watchCount={3} isPremium={false} />)

        const upgradeButton = screen.getByRole('button', { name: /Upgrade to Premium/i })
        await user.click(upgradeButton)

        // Modal should open - check for unique dialog content
        await waitFor(() => {
            expect(screen.getByText(/AI Insights help you remember your personal journey/i)).toBeInTheDocument()
        })
    })

    it('should show load button for premium users without checking cache on mount', async () => {
        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })

        // Should not check cache automatically on mount
        expect(mockAiApi.getCachedInsight).not.toHaveBeenCalled()
    })

    it('should not check for cached insight for non-premium users', () => {
        render(<MovieInsight movieId={1} watchCount={3} isPremium={false} />)

        expect(mockAiApi.getCachedInsight).not.toHaveBeenCalled()
    })

    it('should show load button initially for premium users', async () => {
        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })
    })

    it('should display cached insight when load button is clicked', async () => {
        const user = userEvent.setup()
        const mockInsight = {
            id: 1,
            movieId: 1,
            content: 'You have watched this movie 3 times over the past year...',
            generatedAt: '2025-01-01T00:00:00Z',
            cached: true,
            tokensUsed: 500,
            cost: 0.01,
        }
        mockAiApi.generateInsight.mockResolvedValue(mockInsight)

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        const loadButton = await screen.findByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByText(/You have watched this movie 3 times/i)).toBeInTheDocument()
        })
    })

    it('should show regenerate button when insight is loaded', async () => {
        const user = userEvent.setup()
        const mockInsight = {
            id: 1,
            movieId: 1,
            content: 'Test insight',
            generatedAt: '2025-01-01T00:00:00Z',
            cached: true,
            tokensUsed: 500,
            cost: 0.01,
        }
        mockAiApi.generateInsight.mockResolvedValue(mockInsight)

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        const loadButton = await screen.findByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument()
        })
    })

    it('should show timestamp for loaded insight', async () => {
        const user = userEvent.setup()
        const mockInsight = {
            id: 1,
            movieId: 1,
            content: 'Test insight',
            generatedAt: '2025-01-08T12:00:00Z',
            cached: true,
            tokensUsed: 500,
            cost: 0.01,
        }
        mockAiApi.generateInsight.mockResolvedValue(mockInsight)

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        const loadButton = await screen.findByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByText(/Generated/i)).toBeInTheDocument()
        })
    })

    it('should generate insight when button clicked', async () => {
        const user = userEvent.setup()
        const mockGeneratedInsight = {
            id: 1,
            movieId: 1,
            content: 'Newly generated insight',
            generatedAt: '2025-01-08T12:00:00Z',
            cached: false,
            tokensUsed: 500,
            cost: 0.01,
        }
        mockAiApi.generateInsight.mockResolvedValue(mockGeneratedInsight)

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })

        const loadButton = screen.getByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(mockAiApi.generateInsight).toHaveBeenCalledWith({ movieId: 1 })
        })

        await waitFor(() => {
            expect(screen.getByText(/Newly generated insight/i)).toBeInTheDocument()
        })
    })

    it('should show loading state while generating', async () => {
        const user = userEvent.setup()
        mockAiApi.generateInsight.mockImplementation(() => new Promise(() => {})) // Never resolves

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })

        const loadButton = screen.getByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        // Should show skeleton loading (3 skeleton elements)
        await waitFor(() => {
            const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
            expect(skeletons.length).toBeGreaterThan(0)
        })
    })

    it('should regenerate insight when regenerate button clicked', async () => {
        const user = userEvent.setup()
        const mockCachedInsight = {
            id: 1,
            movieId: 1,
            content: 'Old insight',
            generatedAt: '2025-01-01T00:00:00Z',
            cached: true,
            tokensUsed: 500,
            cost: 0.01,
        }
        mockAiApi.generateInsight.mockResolvedValue(mockCachedInsight)

        const mockNewInsight = {
            id: 2,
            movieId: 1,
            content: 'New regenerated insight',
            generatedAt: '2025-01-08T12:00:00Z',
            cached: false,
            tokensUsed: 600,
            cost: 0.012,
        }
        mockAiApi.regenerateInsight.mockResolvedValue(mockNewInsight)

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        // First load the initial insight
        const loadButton = await screen.findByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument()
        })

        const regenerateButton = screen.getByRole('button', { name: /Regenerate/i })
        await user.click(regenerateButton)

        await waitFor(() => {
            expect(mockAiApi.regenerateInsight).toHaveBeenCalledWith({ movieId: 1 })
        })

        await waitFor(() => {
            expect(screen.getByText(/New regenerated insight/i)).toBeInTheDocument()
        })
    })

    it('should handle rate limit error', async () => {
        const user = userEvent.setup()
        mockAiApi.generateInsight.mockRejectedValue(new RateLimitError('Rate limit exceeded'))

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })

        const loadButton = screen.getByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByText(/Rate Limit Reached/i)).toBeInTheDocument()
        })
    })

    it('should handle general API error', async () => {
        const user = userEvent.setup()
        mockAiApi.generateInsight.mockRejectedValue(new Error('API Error'))

        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Load AI Insight/i })).toBeInTheDocument()
        })

        const loadButton = screen.getByRole('button', { name: /Load AI Insight/i })
        await user.click(loadButton)

        await waitFor(() => {
            expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
        })
    })

    it('should show premium badge', async () => {
        render(<MovieInsight movieId={1} watchCount={3} isPremium={true} />)

        await waitFor(() => {
            expect(screen.getByText('✨ Premium')).toBeInTheDocument()
        })
    })
})