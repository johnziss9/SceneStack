import { render, screen, waitFor, act } from '@/test-utils'
import { MovieSearchBar } from '@/components/MovieSearchBar'
import { movieApi } from '@/lib'
import userEvent from '@testing-library/user-event'
import type { TmdbSearchResponse } from '@/types'

// Mock the movieApi
jest.mock('@/lib', () => ({
    movieApi: {
        searchMovies: jest.fn(),
    },
}))

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
    console.error = jest.fn()
})
afterAll(() => {
    console.error = originalError
})

describe('MovieSearchBar', () => {
    const mockOnResultsChange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it('renders search input with placeholder', () => {
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        expect(screen.getByPlaceholderText('Search for a movie...')).toBeInTheDocument()
    })

    it('displays search icon', () => {
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const searchInput = screen.getByPlaceholderText('Search for a movie...')
        expect(searchInput.parentElement).toBeInTheDocument()
    })

    it('shows clear button when query is not empty', async () => {
        const user = userEvent.setup({ delay: null })
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not show clear button when query is empty', () => {
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('debounces search input by 500ms', async () => {
        const user = userEvent.setup({ delay: null })
        const mockResponse: TmdbSearchResponse = {
            page: 1,
            results: [
                {
                    id: 550,
                    title: 'Fight Club',
                    release_date: '1999-10-15',
                    poster_path: '/path.jpg',
                    overview: 'A movie...',
                    vote_average: 8.4,
                    vote_count: 1000,
                },
            ],
            total_pages: 1,
            total_results: 1,
        }

            ; (movieApi.searchMovies as jest.Mock).mockResolvedValue(mockResponse)

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight')

        // Should not call API immediately
        expect(movieApi.searchMovies).not.toHaveBeenCalled()

        // Fast-forward time by 500ms and wait for updates
        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        // Wait for API call to complete
        await waitFor(() => {
            expect(movieApi.searchMovies).toHaveBeenCalledTimes(1)
            expect(movieApi.searchMovies).toHaveBeenCalledWith('Fight')
        })
    })

    it('cancels previous search if user types again within 500ms', async () => {
        const user = userEvent.setup({ delay: null })
        const mockResponse: TmdbSearchResponse = {
            page: 1,
            results: [],
            total_pages: 1,
            total_results: 0,
        }

            ; (movieApi.searchMovies as jest.Mock).mockResolvedValue(mockResponse)

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')

        // Type "Figh"
        await user.type(input, 'Figh')

        await act(async () => {
            jest.advanceTimersByTime(300) // Wait 300ms (not enough to trigger search)
        })

        // Type more "t Club"
        await user.type(input, 't Club')

        // Should not have called API yet
        expect(movieApi.searchMovies).not.toHaveBeenCalled()

        // Now advance full 500ms from last keystroke
        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            // Should only call once with full query
            expect(movieApi.searchMovies).toHaveBeenCalledTimes(1)
            expect(movieApi.searchMovies).toHaveBeenCalledWith('Fight Club')
        })
    })

    it('calls onResultsChange with search results', async () => {
        const user = userEvent.setup({ delay: null })
        const mockResults = [
            {
                id: 550,
                title: 'Fight Club',
                release_date: '1999-10-15',
                poster_path: '/path.jpg',
                overview: 'A movie...',
                vote_average: 8.4,
                vote_count: 1000,
            },
        ]
        const mockResponse: TmdbSearchResponse = {
            page: 1,
            results: mockResults,
            total_pages: 1,
            total_results: 1,
        }

            ; (movieApi.searchMovies as jest.Mock).mockResolvedValue(mockResponse)

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(mockOnResultsChange).toHaveBeenCalledWith(mockResults, 1, 1, 'Fight Club')
        })
    })

    it('displays loading state while searching', async () => {
        const user = userEvent.setup({ delay: null })
        const mockResponse: TmdbSearchResponse = {
            page: 1,
            results: [],
            total_pages: 0,
            total_results: 0,
        }

            ; (movieApi.searchMovies as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
            )

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(screen.getByText('Searching...')).toBeInTheDocument()
        })
    })

    it('displays error message on API failure', async () => {
        const user = userEvent.setup({ delay: null })
            ; (movieApi.searchMovies as jest.Mock).mockRejectedValue(new Error('API Error'))

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(screen.getByText('Failed to search movies. Please try again.')).toBeInTheDocument()
        })
    })

    it('calls onResultsChange with empty array on error', async () => {
        const user = userEvent.setup({ delay: null })
            ; (movieApi.searchMovies as jest.Mock).mockRejectedValue(new Error('API Error'))

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(mockOnResultsChange).toHaveBeenCalledWith([], 0, 0, '')
        })
    })

    it('clears search when clear button is clicked', async () => {
        const user = userEvent.setup({ delay: null })
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        const clearButton = screen.getByRole('button')
        await user.click(clearButton)

        expect(input).toHaveValue('')
        expect(mockOnResultsChange).toHaveBeenCalledWith([], 0, 0, '')
    })

    it('clears error when clear button is clicked', async () => {
        const user = userEvent.setup({ delay: null })
            ; (movieApi.searchMovies as jest.Mock).mockRejectedValue(new Error('API Error'))

        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')
        await user.type(input, 'Fight Club')

        await act(async () => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(screen.getByText('Failed to search movies. Please try again.')).toBeInTheDocument()
        })

        const clearButton = screen.getByRole('button')
        await user.click(clearButton)

        expect(screen.queryByText('Failed to search movies. Please try again.')).not.toBeInTheDocument()
    })

    it('calls onResultsChange with empty array when query is cleared', async () => {
        const user = userEvent.setup({ delay: null })
        render(<MovieSearchBar onResultsChange={mockOnResultsChange} />)

        const input = screen.getByPlaceholderText('Search for a movie...')

        // Type something
        await user.type(input, 'Fight Club')

        // Clear it
        await user.clear(input)

        expect(mockOnResultsChange).toHaveBeenCalledWith([], 0, 0, '')
    })
})