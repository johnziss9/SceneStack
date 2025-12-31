import { render, screen, waitFor } from '@/test-utils'
import { WatchList } from '@/components/WatchList'
import { watchApi } from '@/lib'
import userEvent from '@testing-library/user-event'
import type { GroupedWatch } from '@/types'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        getGroupedWatches: jest.fn(),
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

describe('WatchList', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    const mockGroupedWatches: GroupedWatch[] = [
        {
            movieId: 1,
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path1.jpg',
                synopsis: 'A movie...',
            },
            watchCount: 2,
            averageRating: 8.5,
            latestRating: 9,
            watches: [
                {
                    id: 1,
                    watchedDate: '2024-12-30',
                    rating: 9,
                    notes: 'Great!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Friends',
                    isRewatch: false,
                },
                {
                    id: 2,
                    watchedDate: '2024-11-15',
                    rating: 8,
                    notes: 'Good',
                    watchLocation: 'Home',
                    watchedWith: null,
                    isRewatch: true,
                },
            ],
        },
        {
            movieId: 2,
            movie: {
                id: 2,
                tmdbId: 551,
                title: 'The Matrix',
                year: 1999,
                posterPath: '/path2.jpg',
                synopsis: 'Another movie...',
            },
            watchCount: 1,
            averageRating: 9.0,
            latestRating: 9,
            watches: [
                {
                    id: 3,
                    watchedDate: '2024-12-28',
                    rating: 9,
                    notes: 'Amazing!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Solo',
                    isRewatch: false,
                },
            ],
        },
    ]

    it('displays loading state initially', () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        render(<WatchList />)

        expect(screen.getByText('Loading watches...')).toBeInTheDocument()
    })

    it('fetches and displays grouped watches', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByText('The Matrix')).toBeInTheDocument()
        })

        expect(watchApi.getGroupedWatches).toHaveBeenCalledWith(1)
    })

    it('displays error message on fetch failure', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<WatchList />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load watches. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('shows retry button on error', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('retries fetching watches when retry button is clicked', async () => {
        const user = userEvent.setup()

            // First call fails
            ; (watchApi.getGroupedWatches as jest.Mock).mockRejectedValueOnce(
                new Error('API Error')
            )

        render(<WatchList />)

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to load watches. Please try again.')).toBeInTheDocument()
        })

            // Second call succeeds
            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValueOnce(mockGroupedWatches)

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show loading then success
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(watchApi.getGroupedWatches).toHaveBeenCalledTimes(2)
    })

    it('displays empty state when no watches', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue([])

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('No watches yet')).toBeInTheDocument()
            expect(
                screen.getByText('Start by searching for a movie to add to your watched list')
            ).toBeInTheDocument()
        })
    })

    it('shows search movies link in empty state', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue([])

        render(<WatchList />)

        await waitFor(() => {
            const searchLink = screen.getByRole('link', { name: /search movies/i })
            expect(searchLink).toBeInTheDocument()
            expect(searchLink).toHaveAttribute('href', '/')
        })
    })

    it('renders correct number of watch cards', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Should render 2 cards
        const cards = screen.getAllByRole('link')
        expect(cards).toHaveLength(2)
    })

    it('displays watch cards in a grid layout', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        const { container } = render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Check for grid classes
        const grid = container.querySelector('.grid')
        expect(grid).toBeInTheDocument()
        expect(grid).toHaveClass('grid-cols-2')
    })

    it('calls fetchWatches on component mount', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(watchApi.getGroupedWatches).toHaveBeenCalledTimes(1)
        })
    })

    it('passes correct props to WatchCard components', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Check that watch count badge appears for Fight Club (watched 2x)
        expect(screen.getByText('2x')).toBeInTheDocument()

        // Check that The Matrix doesn't have watch count badge (watched 1x)
        expect(screen.queryByText('1x')).not.toBeInTheDocument()
    })

    it('uses hardcoded userId 1 for Phase 1', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockGroupedWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(watchApi.getGroupedWatches).toHaveBeenCalledWith(1)
        })
    })

    it('handles single watch correctly', async () => {
        const singleWatch: GroupedWatch[] = [mockGroupedWatches[1]] // Just The Matrix

            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(singleWatch)

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('The Matrix')).toBeInTheDocument()
        })

        // Should only render one card
        const cards = screen.getAllByRole('link')
        expect(cards).toHaveLength(1)
    })

    it('handles many watches correctly', async () => {
        const manyWatches: GroupedWatch[] = Array.from({ length: 20 }, (_, i) => ({
            movieId: i + 1,
            movie: {
                id: i + 1,
                tmdbId: 500 + i,
                title: `Movie ${i + 1}`,
                year: 2000 + i,
                posterPath: `/path${i}.jpg`,
                synopsis: 'A movie...',
            },
            watchCount: 1,
            averageRating: 8.0,
            latestRating: 8,
            watches: [
                {
                    id: i + 1,
                    watchedDate: '2024-12-01',
                    rating: 8,
                    isRewatch: false,
                },
            ],
        }))

            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(manyWatches)

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        // Should render all 20 cards
        const cards = screen.getAllByRole('link')
        expect(cards).toHaveLength(20)
    })
})