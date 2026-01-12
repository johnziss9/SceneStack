import { render, screen, waitFor } from '@/test-utils'
import { AiSearchBar } from '@/components/AiSearchBar'
import userEvent from '@testing-library/user-event'
import { aiApi } from '@/lib/api'
import { RateLimitError } from '@/lib/api-client'

// Mock the API
jest.mock('@/lib/api', () => ({
    aiApi: {
        search: jest.fn(),
    },
}))

const mockAiApi = aiApi as jest.Mocked<typeof aiApi>

describe('AiSearchBar', () => {
    let mockOnResultsChange: jest.Mock
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        mockOnResultsChange = jest.fn()
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should show upgrade prompt for non-premium users', () => {
        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={false} />)

        expect(screen.getByText('AI Search')).toBeInTheDocument()
        expect(screen.getByText(/Use natural language to search your watches/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Upgrade to Premium/i })).toBeInTheDocument()
    })

    it('should open upgrade modal when upgrade button clicked for non-premium user', async () => {
        const user = userEvent.setup()
        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={false} />)

        const upgradeButton = screen.getByRole('button', { name: /Upgrade to Premium/i })
        await user.click(upgradeButton)

        // Modal should open - check for dialog content
        await waitFor(() => {
            expect(screen.getByText('AI Search lets you find watches using natural language queries.')).toBeInTheDocument()
        })
    })

    it('should render search input for premium users', () => {
        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        expect(screen.getByLabelText(/AI Search/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)).toBeInTheDocument()
    })

    it('should show premium badge on label', () => {
        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        expect(screen.getByText('✨ Premium')).toBeInTheDocument()
    })

    it('should trigger search when Enter key is pressed', async () => {
        const user = userEvent.setup()
        const mockResults = {
            results: [],
            totalMatches: 0,
            tokensUsed: 100,
            cost: 0.001,
        }
        mockAiApi.search.mockResolvedValue(mockResults)

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)

        await user.type(input, 'thriller{Enter}')

        await waitFor(() => {
            expect(mockAiApi.search).toHaveBeenCalledWith({ query: 'thriller' })
        })
    })

    it('should trigger search when search button clicked', async () => {
        const user = userEvent.setup()
        const mockResults = {
            results: [],
            totalMatches: 0,
            tokensUsed: 100,
            cost: 0.001,
        }
        mockAiApi.search.mockResolvedValue(mockResults)

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)
        await user.type(input, 'thriller')

        // Get all buttons, search button is the only one (no clear button yet since no search performed)
        const buttons = screen.getAllByRole('button')
        const searchButton = buttons[buttons.length - 1] // Last button is search
        await user.click(searchButton)

        await waitFor(() => {
            expect(mockAiApi.search).toHaveBeenCalledWith({ query: 'thriller' })
        })
    })

    it('should call onResultsChange with API results', async () => {
        const user = userEvent.setup()
        const mockResults = {
            results: [
                {
                    id: 1,
                    movieId: 1,
                    watchedDate: '2024-06-15T00:00:00Z',
                    rating: 9,
                    notes: 'Great thriller!',
                    watchLocation: 'Cinema',
                    watchedWith: 'John',
                    isRewatch: false,
                    movie: {
                        id: 1,
                        tmdbId: 550,
                        title: 'Fight Club',
                        year: 1999,
                        posterPath: '/poster.jpg',
                        synopsis: 'A thriller',
                    }
                }
            ],
            totalMatches: 1,
            tokensUsed: 100,
            cost: 0.001,
        }
        mockAiApi.search.mockResolvedValue(mockResults)

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)
        await user.type(input, 'thriller{Enter}')

        await waitFor(() => {
            expect(mockOnResultsChange).toHaveBeenCalledWith(mockResults)
        })
    })

    it('should show clear button when query exists', async () => {
        const user = userEvent.setup()

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)
        
        // Only 1 button initially (search button, disabled)
        let buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(1)

        await user.type(input, 'thriller')

        // Now should have 2 buttons (clear + search)
        buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(2)
    })

    it('should clear query when clear button clicked', async () => {
        const user = userEvent.setup()

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i) as HTMLInputElement
        
        await user.type(input, 'thriller')
        expect(input.value).toBe('thriller')

        // Get all buttons, clear button is first
        const buttons = screen.getAllByRole('button')
        await user.click(buttons[0]) // Clear button (X icon)

        expect(input.value).toBe('')
        expect(mockOnResultsChange).toHaveBeenCalledWith(null)
    })

    it('should handle general API errors', async () => {
        const user = userEvent.setup()
        mockAiApi.search.mockRejectedValue(new Error('API Error'))

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try:/i)
        await user.type(input, 'test query')
        await user.keyboard('{Enter}')

        await waitFor(() => {
            expect(screen.getByText(/Search failed/i)).toBeInTheDocument()
        })
    })

    it('should handle rate limit errors', async () => {
        const user = userEvent.setup()
        mockAiApi.search.mockRejectedValue(new RateLimitError('Rate limit exceeded'))

        render(<AiSearchBar onResultsChange={mockOnResultsChange} isPremium={true} />)

        const input = screen.getByPlaceholderText(/Try: "thriller I watched last summer"/i)
        await user.type(input, 'thriller{Enter}')

        await waitFor(() => {
            expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument()
        })
    })
})