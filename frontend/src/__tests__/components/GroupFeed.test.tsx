import { render, screen, waitFor } from '@/test-utils'
import { GroupFeed } from '@/components/GroupFeed'
import { groupApi } from '@/lib/api'
import userEvent from '@testing-library/user-event'
import type { GroupFeedItem } from '@/types'

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getFeed: jest.fn(),
    },
}))

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
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

describe('GroupFeed', () => {
    const mockFeedItems: GroupFeedItem[] = [
        {
            id: 1,
            userId: 1,
            username: 'johndoe',
            movieId: 1,
            movieTitle: 'Fight Club',
            posterPath: '/path1.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 9,
            notes: 'Great movie!',
            watchLocation: 'Cinema',
            watchedWith: 'Friends',
            isRewatch: false,
        },
        {
            id: 2,
            userId: 2,
            username: 'janedoe',
            movieId: 2,
            movieTitle: 'The Matrix',
            posterPath: '/path2.jpg',
            watchedDate: '2024-12-28T00:00:00Z',
            rating: 10,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: true,
        },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('displays loading state initially', () => {
        ; (groupApi.getFeed as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<GroupFeed groupId={1} />)

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays feed items', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByText('The Matrix')).toBeInTheDocument()
        })

        expect(groupApi.getFeed).toHaveBeenCalledWith(1, 0, 20)
    })

    it('displays error message on fetch failure', async () => {
        ; (groupApi.getFeed as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load group feed. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('shows retry button on error', async () => {
        ; (groupApi.getFeed as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('retries fetching feed when retry button is clicked', async () => {
        const user = userEvent.setup()

            // First call fails
            ; (groupApi.getFeed as jest.Mock).mockRejectedValueOnce(
                new Error('API Error')
            )

        render(<GroupFeed groupId={1} />)

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to load group feed. Please try again.')).toBeInTheDocument()
        })

            // Second call succeeds
            ; (groupApi.getFeed as jest.Mock).mockResolvedValueOnce(mockFeedItems)

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show feed after retry
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(groupApi.getFeed).toHaveBeenCalledTimes(2)
    })

    it('displays empty state when no feed items', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue([])

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('No watches yet')).toBeInTheDocument()
            expect(
                screen.getByText(/Group members haven't shared any watches yet/i)
            ).toBeInTheDocument()
        })
    })

    it('displays user name for each feed item', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('johndoe')).toBeInTheDocument()
            expect(screen.getByText('janedoe')).toBeInTheDocument()
        })
    })

    it('displays movie titles for each feed item', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByText('The Matrix')).toBeInTheDocument()
        })
    })

    it('displays ratings when available', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('9')).toBeInTheDocument()
            expect(screen.getByText('10')).toBeInTheDocument()
        })
    })

    it('displays watch location when available', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Cinema')).toBeInTheDocument()
        })
    })

    it('displays watched with when available', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friends')).toBeInTheDocument()
        })
    })

    it('displays notes when available', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('"Great movie!"')).toBeInTheDocument()
        })
    })

    it('displays rewatch badge when isRewatch is true', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Rewatch')).toBeInTheDocument()
        })
    })

    it('does not display rewatch badge when isRewatch is false', async () => {
        const itemsWithoutRewatch: GroupFeedItem[] = [
            {
                ...mockFeedItems[0],
                isRewatch: false,
            },
        ]

            ; (groupApi.getFeed as jest.Mock).mockResolvedValue(itemsWithoutRewatch)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Should only have one "Rewatch" text (from the actual rewatch item in mockFeedItems)
        const rewatchBadges = screen.queryAllByText('Rewatch')
        expect(rewatchBadges).toHaveLength(0)
    })

    it('displays formatted watch date', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Dec 30, 2024')).toBeInTheDocument()
            expect(screen.getByText('Dec 28, 2024')).toBeInTheDocument()
        })
    })

    it('displays movie poster when posterPath is available', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            const posters = screen.getAllByRole('img', { name: /Fight Club|The Matrix/i })
            expect(posters.length).toBeGreaterThan(0)
            expect(posters[0]).toHaveAttribute('src', expect.stringContaining('/path1.jpg'))
        })
    })

    it('displays placeholder when poster is not available', async () => {
        const itemsWithoutPoster: GroupFeedItem[] = [
            {
                ...mockFeedItems[0],
                posterPath: null,
            },
        ]

            ; (groupApi.getFeed as jest.Mock).mockResolvedValue(itemsWithoutPoster)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('No poster')).toBeInTheDocument()
        })
    })

    it('shows load more button when hasMore is true', async () => {
        // Return exactly 20 items to indicate more available
        const twentyItems: GroupFeedItem[] = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            userId: 1,
            username: 'testuser',
            movieId: i + 1,
            movieTitle: `Movie ${i + 1}`,
            posterPath: '/path.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        }))

            ; (groupApi.getFeed as jest.Mock).mockResolvedValue(twentyItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })

    it('does not show load more button when hasMore is false', async () => {
        // Return less than 20 items
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })

    it('loads more items when load more button is clicked', async () => {
        const user = userEvent.setup()

        // First call returns 20 items
        const twentyItems: GroupFeedItem[] = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            userId: 1,
            username: 'testuser',
            movieId: i + 1,
            movieTitle: `Movie ${i + 1}`,
            posterPath: '/path.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        }))

        // Second call returns more items
        const moreItems: GroupFeedItem[] = Array.from({ length: 5 }, (_, i) => ({
            id: i + 21,
            userId: 1,
            username: 'testuser',
            movieId: i + 21,
            movieTitle: `Movie ${i + 21}`,
            posterPath: '/path.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        }))

            ; (groupApi.getFeed as jest.Mock).mockResolvedValueOnce(twentyItems)
            ; (groupApi.getFeed as jest.Mock).mockResolvedValueOnce(moreItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        const loadMoreButton = screen.getByRole('button', { name: /load more/i })
        await user.click(loadMoreButton)

        await waitFor(() => {
            expect(screen.getByText('Movie 21')).toBeInTheDocument()
        })

        expect(groupApi.getFeed).toHaveBeenCalledWith(1, 0, 20)
        expect(groupApi.getFeed).toHaveBeenCalledWith(1, 20, 20)
    })

    it('shows loading state while loading more items', async () => {
        const user = userEvent.setup()

        const twentyItems: GroupFeedItem[] = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            userId: 1,
            username: 'testuser',
            movieId: i + 1,
            movieTitle: `Movie ${i + 1}`,
            posterPath: '/path.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        }))

            ; (groupApi.getFeed as jest.Mock).mockResolvedValueOnce(twentyItems)
            ; (groupApi.getFeed as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        const loadMoreButton = screen.getByRole('button', { name: /load more/i })
        await user.click(loadMoreButton)

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })
    })

    it('disables load more button while loading', async () => {
        const user = userEvent.setup()

        const twentyItems: GroupFeedItem[] = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            userId: 1,
            username: 'testuser',
            movieId: i + 1,
            movieTitle: `Movie ${i + 1}`,
            posterPath: '/path.jpg',
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        }))

            ; (groupApi.getFeed as jest.Mock).mockResolvedValueOnce(twentyItems)
            ; (groupApi.getFeed as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        const loadMoreButton = screen.getByRole('button', { name: /load more/i })
        await user.click(loadMoreButton)

        await waitFor(() => {
            expect(loadMoreButton).toBeDisabled()
        })
    })

    it('renders links to movie details', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        const links = screen.getAllByRole('link')
        expect(links.length).toBeGreaterThan(0)
        expect(links[0]).toHaveAttribute('href', expect.stringContaining('/watched/'))
    })

    it('refetches feed when groupId changes', async () => {
        ; (groupApi.getFeed as jest.Mock).mockResolvedValue(mockFeedItems)

        const { rerender } = render(<GroupFeed groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(groupApi.getFeed).toHaveBeenCalledWith(1, 0, 20)

        // Change groupId
        rerender(<GroupFeed groupId={2} />)

        await waitFor(() => {
            expect(groupApi.getFeed).toHaveBeenCalledWith(2, 0, 20)
        })
    })
})