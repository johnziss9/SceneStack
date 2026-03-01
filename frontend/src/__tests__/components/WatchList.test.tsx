import { render, screen, waitFor } from '@/test-utils'
import { WatchList } from '@/components/WatchList'
import { watchApi } from '@/lib'
import { groupApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import userEvent from '@testing-library/user-event'
import type { GroupedWatch, GroupBasicInfo } from '@/types'
import type { PaginatedGroupedWatches } from '@/types/watch'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        getGroupedWatches: jest.fn(),
        bulkUpdate: jest.fn(),
    },
}))

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getUserGroups: jest.fn(),
    },
}))

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext')

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
    useSearchParams: () => ({
        get: jest.fn(),
        keys: function* () { yield* [] },
        toString: () => '',
    }),
    usePathname: () => '/watched',
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
    console.error = jest.fn()
})
afterAll(() => {
    console.error = originalError
})

const mockPaginated = (items: GroupedWatch[], hasMore = false): PaginatedGroupedWatches => ({
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasMore,
})

// Helper to create expected API call parameters with default filters
const expectedApiParams = (page: number = 1) => ({
    page,
    pageSize: 20,
    search: undefined,
    ratingMin: undefined,
    ratingMax: undefined,
    watchedFrom: undefined,
    watchedTo: undefined,
    rewatchOnly: undefined,
    unratedOnly: undefined,
    sortBy: "recentlyWatched",
    groupId: undefined,
})

describe('WatchList', () => {
    const mockGroups: GroupBasicInfo[] = [
        { id: 1, name: 'Friday Movie Night', memberCount: 5 },
        { id: 2, name: 'Classic Cinema', memberCount: 3 },
    ]

    beforeEach(() => {
        jest.clearAllMocks()

        // Mock authenticated user
        mockUseAuth.mockReturnValue({
            user: { id: 1, username: 'testuser', email: 'test@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

        // Mock user groups by default
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
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
                    isPrivate: false,
                    groupIds: [1], // Shared with Friday Movie Night
                },
                {
                    id: 2,
                    watchedDate: '2024-11-15',
                    rating: 8,
                    notes: 'Good',
                    watchLocation: 'Home',
                    watchedWith: null,
                    isRewatch: true,
                    isPrivate: true,
                    groupIds: [],
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
                    isPrivate: false,
                    groupIds: [1, 2], // Shared with both groups
                },
            ],
        },
    ]

    it('displays loading state initially', () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<WatchList />)

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays grouped watches', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByText('The Matrix')).toBeInTheDocument()
        })

        expect(watchApi.getGroupedWatches).toHaveBeenCalledWith(expectedApiParams(1))
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
            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValueOnce(mockPaginated(mockGroupedWatches))

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show loading then success
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(watchApi.getGroupedWatches).toHaveBeenCalledTimes(2)
    })

    it('displays empty state when no watches', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated([]))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('No watches yet')).toBeInTheDocument()
            expect(
                screen.getByText('Start by searching for a movie to add to your watched list')
            ).toBeInTheDocument()
        })
    })

    it('shows search movies link in empty state', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated([]))

        render(<WatchList />)

        await waitFor(() => {
            const searchLink = screen.getByRole('link', { name: /search movies/i })
            expect(searchLink).toBeInTheDocument()
            expect(searchLink).toHaveAttribute('href', '/')
        })
    })

    it('renders correct number of watch cards', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Should render 2 cards
        const cards = screen.getAllByRole('link')
        expect(cards).toHaveLength(2)
    })

    it('displays watch cards in a grid layout', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

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
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(watchApi.getGroupedWatches).toHaveBeenCalledTimes(1)
        })
    })

    it('passes correct props to WatchCard components', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Check that watch count badge appears for Fight Club (watched 2x)
        expect(screen.getByText('2x')).toBeInTheDocument()

        // Check that The Matrix doesn't have watch count badge (watched 1x)
        expect(screen.queryByText('1x')).not.toBeInTheDocument()
    })

    it('calls API with page 1 and page size 20 on initial load', async () => {
        ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(watchApi.getGroupedWatches).toHaveBeenCalledWith(expectedApiParams(1))
        })
    })

    it('handles single watch correctly', async () => {
        const singleWatch: GroupedWatch[] = [mockGroupedWatches[1]] // Just The Matrix

            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(singleWatch))

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
                    isPrivate: true,
                    groupIds: [],
                },
            ],
        }))

            ; (watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(manyWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Movie 1')).toBeInTheDocument()
        })

        // Should render all 20 cards
        const cards = screen.getAllByRole('link')
        expect(cards).toHaveLength(20)
    })

    // Group Features Tests
    it('fetches user groups on mount', async () => {
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(groupApi.getUserGroups).toHaveBeenCalledTimes(1)
        })
    })

    it('displays group filter when user has groups', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Open filters panel
        await user.click(screen.getByRole('button', { name: /filters/i }))

        // Open advanced filters
        await user.click(screen.getByRole('button', { name: /show advanced filters/i }))

        await waitFor(() => {
            expect(screen.getByText('Group:')).toBeInTheDocument()
        })
    })

    // Privacy Filter Tests
    it('displays privacy filter dropdown', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Open filters panel
        await user.click(screen.getByRole('button', { name: /filters/i }))

        // Open advanced filters
        await user.click(screen.getByRole('button', { name: /show advanced filters/i }))

        await waitFor(() => {
            expect(screen.getByText('Show:')).toBeInTheDocument()
        })
    })

    // Bulk Mode Tests
    it('displays bulk edit button', async () => {
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getAllByRole('button', { name: /select multiple/i }).length).toBeGreaterThan(0)
        })
    })

    it('enters bulk mode when bulk edit button is clicked', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
            expect(screen.getAllByRole('button', { name: /done/i })[0]).toBeInTheDocument()
        })
    })

    it('exits bulk mode when exit button is clicked', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Exit bulk mode
        const exitButtons = screen.getAllByRole('button', { name: /done/i })
        await user.click(exitButtons[0])

        await waitFor(() => {
            expect(screen.queryByText(/select all/i)).not.toBeInTheDocument()
            expect(screen.getAllByRole('button', { name: /select multiple/i })[0]).toBeInTheDocument()
        })
    })

    it('displays checkboxes in bulk mode', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Checkboxes should be rendered for selection
        const checkboxes = screen.getAllByRole('checkbox')
        // Should have at least the select all checkbox
        expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('select all selects all visible movies', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Click select all - first checkbox in bulk mode is the select all checkbox
        const checkboxes = screen.getAllByRole('checkbox')
        const selectAllCheckbox = checkboxes[0]
        await user.click(selectAllCheckbox)

        await waitFor(() => {
            // Text appears in two places: select all bar and bulk actions bar
            expect(screen.getAllByText(/2 movies selected/i).length).toBe(2)
        })
    })

    it('deselect all clears all selections', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Select all - first checkbox in bulk mode is the select all checkbox
        const checkboxes = screen.getAllByRole('checkbox')
        const selectAllCheckbox = checkboxes[0]
        await user.click(selectAllCheckbox)

        await waitFor(() => {
            // Text appears in two places: select all bar and bulk actions bar
            expect(screen.getAllByText(/2 movies selected/i).length).toBe(2)
        })

        // Deselect all
        await user.click(selectAllCheckbox)

        await waitFor(() => {
            expect(screen.queryByText(/movies selected/i)).not.toBeInTheDocument()
        })
    })

    // Bulk Operations Tests
    it('opens make private dialog when make private button is clicked with selection', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Select all movies - first checkbox in bulk mode is the select all checkbox
        const checkboxes = screen.getAllByRole('checkbox')
        const selectAllCheckbox = checkboxes[0]
        await user.click(selectAllCheckbox)

        await waitFor(() => {
            // Text appears in two places: select all bar and bulk actions bar
            expect(screen.getAllByText(/2 movies selected/i).length).toBe(2)
        })

        // Click make private button
        const makePrivateButtons = screen.getAllByRole('button', { name: /make private/i })
        await user.click(makePrivateButtons[makePrivateButtons.length - 1])

        await waitFor(() => {
            expect(screen.getByText('Make Movies Private')).toBeInTheDocument()
        })

        // Wait for dialog content to fully render
        await waitFor(() => {
            expect(screen.getByText(/You are about to make 2 movies private/i)).toBeInTheDocument()
        })
    })

    it('opens share dialog when share button is clicked with selection', async () => {
        const user = userEvent.setup()
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        // Enter bulk mode
        const bulkEditButtons = screen.getAllByRole('button', { name: /select multiple/i })
        await user.click(bulkEditButtons[0])

        await waitFor(() => {
            expect(screen.getByText(/select all/i)).toBeInTheDocument()
        })

        // Select all movies - first checkbox in bulk mode is the select all checkbox
        const checkboxes = screen.getAllByRole('checkbox')
        const selectAllCheckbox = checkboxes[0]
        await user.click(selectAllCheckbox)

        await waitFor(() => {
            // Text appears in two places: select all bar and bulk actions bar
            expect(screen.getAllByText(/2 movies selected/i).length).toBe(2)
        })

        // Click share button
        const shareButton = screen.getByRole('button', { name: /share with groups/i })
        await user.click(shareButton)

        await waitFor(() => {
            // Dialog title appears along with the button text
            expect(screen.getByRole('heading', { name: /share with groups/i })).toBeInTheDocument()
        })

        // Click "Specific Groups" button to open secondary modal with group list
        const specificGroupsButton = await screen.findByRole('button', { name: /specific groups/i })
        await user.click(specificGroupsButton)

        // Wait for groups to load in the secondary modal
        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })
    })

    it('displays result count', async () => {
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getAllByText(/2 of 2 movies/i).length).toBeGreaterThan(0)
        })
    })

    it('displays singular movie count', async () => {
        const singleWatch: GroupedWatch[] = [mockGroupedWatches[0]]
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(singleWatch))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getAllByText(/1 of 1 movie/i).length).toBeGreaterThan(0)
        })
    })

    // Pagination Tests
    it('shows load more button when hasMore is true', async () => {
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches, true))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
        })
    })

    it('does not show load more button when hasMore is false', async () => {
        ;(watchApi.getGroupedWatches as jest.Mock).mockResolvedValue(mockPaginated(mockGroupedWatches, false))

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
        })

        expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })

    it('loads more watches when load more button is clicked', async () => {
        const user = userEvent.setup()
        const page2Watches: GroupedWatch[] = [{
            movieId: 3,
            movie: { id: 3, tmdbId: 552, title: 'Inception', year: 2010, posterPath: null, synopsis: '' },
            watchCount: 1,
            averageRating: 10,
            latestRating: 10,
            watches: [{ id: 4, watchedDate: '2024-12-01', rating: 10, isRewatch: false, isPrivate: false, groupIds: [] }],
        }]

        ;(watchApi.getGroupedWatches as jest.Mock)
            .mockResolvedValueOnce(mockPaginated(mockGroupedWatches, true))
            .mockResolvedValueOnce({ ...mockPaginated(page2Watches, false), page: 2 })

        render(<WatchList />)

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /load more/i }))

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument()
            expect(watchApi.getGroupedWatches).toHaveBeenCalledWith(expectedApiParams(2))
        })
    })
})
