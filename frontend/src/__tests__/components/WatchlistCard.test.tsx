import { render, screen, waitFor } from '@/test-utils'
import { WatchlistCard } from '@/components/WatchlistCard'
import { watchlistApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import userEvent from '@testing-library/user-event'
import type { WatchlistItem } from '@/types'

// Mock modules
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))
jest.mock('@/lib/api', () => ({
    watchlistApi: {
        removeFromWatchlist: jest.fn(),
        updateWatchlistItem: jest.fn(),
    },
}))
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))
jest.mock('@/components/WatchForm', () => ({
    WatchForm: jest.fn(() => null),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockRemoveFromWatchlist = watchlistApi.removeFromWatchlist as jest.MockedFunction<typeof watchlistApi.removeFromWatchlist>
const mockUpdateWatchlistItem = watchlistApi.updateWatchlistItem as jest.MockedFunction<typeof watchlistApi.updateWatchlistItem>

describe('WatchlistCard', () => {
    const mockRouter = {
        push: jest.fn(),
    }

    const mockItem: WatchlistItem = {
        id: 1,
        movieId: 1,
        movie: {
            id: 1,
            tmdbId: 550,
            title: 'Fight Club',
            year: 1999,
            posterPath: '/poster.jpg',
            synopsis: 'A movie about...',
        },
        notes: 'Want to watch this!',
        priority: 1, // High priority
        addedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    }

    const mockOnRemoved = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        mockUseRouter.mockReturnValue(mockRouter as any)
        mockRemoveFromWatchlist.mockResolvedValue(undefined)
        mockUpdateWatchlistItem.mockResolvedValue(mockItem)
    })

    it('renders movie title and year', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.getByText('1999')).toBeInTheDocument()
    })

    it('renders poster image with correct URL', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const poster = screen.getByAltText('Fight Club')
        expect(poster).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/poster.jpg')
    })

    it('shows fallback when no poster', () => {
        const itemWithoutPoster = {
            ...mockItem,
            movie: { ...mockItem.movie, posterPath: null },
        }

        render(<WatchlistCard item={itemWithoutPoster} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('No poster')).toBeInTheDocument()
    })

    it('renders high priority badge', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('High Priority')).toBeInTheDocument()
    })

    it('renders normal priority badge when priority is 0', () => {
        const normalPriorityItem = { ...mockItem, priority: 0 }

        render(<WatchlistCard item={normalPriorityItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('Normal')).toBeInTheDocument()
    })

    it('displays notes when provided', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText(/Want to watch this!/)).toBeInTheDocument()
    })

    it('hides notes when not provided', () => {
        const itemWithoutNotes = { ...mockItem, notes: null }

        render(<WatchlistCard item={itemWithoutNotes} onRemoved={mockOnRemoved} />)

        // Notes section should not exist
        expect(screen.queryByText(/Want to watch this!/)).not.toBeInTheDocument()
    })

    it('displays "Saved X ago" date', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('Saved 2 days ago')).toBeInTheDocument()
    })

    it('shows "today" for items added today', () => {
        const todayItem = { ...mockItem, addedAt: new Date().toISOString() }

        render(<WatchlistCard item={todayItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('Saved today')).toBeInTheDocument()
    })

    it('shows "yesterday" for items added yesterday', () => {
        const yesterdayItem = {
            ...mockItem,
            addedAt: new Date(Date.now() - 86400000).toISOString(),
        }

        render(<WatchlistCard item={yesterdayItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByText('Saved yesterday')).toBeInTheDocument()
    })

    it('renders "Mark as Watched" button', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByRole('button', { name: /mark as watched/i })).toBeInTheDocument()
    })

    it('renders remove button', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        expect(screen.getByRole('button', { name: /remove from watchlist/i })).toBeInTheDocument()
    })

    it('removes item from watchlist when remove button clicked', async () => {
        const user = userEvent.setup()

        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const removeButton = screen.getByRole('button', { name: /remove from watchlist/i })
        await user.click(removeButton)

        await waitFor(() => {
            expect(mockRemoveFromWatchlist).toHaveBeenCalledWith(1)
            expect(mockOnRemoved).toHaveBeenCalledWith(1)
        })
    })

    it('shows loading state on remove button while removing', async () => {
        mockRemoveFromWatchlist.mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 100))
        )

        const user = userEvent.setup()

        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const removeButton = screen.getByRole('button', { name: /remove from watchlist/i })
        await user.click(removeButton)

        // Should show loading spinner
        expect(screen.getByRole('button', { name: /remove from watchlist/i })).toBeDisabled()
    })

    it('toggles priority when priority badge is clicked', async () => {
        const user = userEvent.setup()

        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const priorityButton = screen.getByText('High Priority')
        await user.click(priorityButton)

        await waitFor(() => {
            expect(mockUpdateWatchlistItem).toHaveBeenCalledWith(1, { priority: 0 })
        })
    })

    it('links poster and title to /movies/[tmdbId]', () => {
        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2) // Poster and title links
        links.forEach(link => {
            expect(link).toHaveAttribute('href', '/movies/550')
        })
    })

    it('mark as watched button is clickable', async () => {
        const user = userEvent.setup()

        render(<WatchlistCard item={mockItem} onRemoved={mockOnRemoved} />)

        const markAsWatchedButton = screen.getByRole('button', { name: /mark as watched/i })
        expect(markAsWatchedButton).toBeEnabled()

        await user.click(markAsWatchedButton)
        // Button should still be enabled after click
        expect(markAsWatchedButton).toBeEnabled()
    })
})
