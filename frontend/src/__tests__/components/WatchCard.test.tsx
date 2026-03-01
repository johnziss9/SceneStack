import { render, screen } from '@/test-utils'
import { WatchCard } from '@/components/WatchCard'
import type { GroupedWatch } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('WatchCard', () => {
    beforeEach(() => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })
    })
    const mockGroupedWatch: GroupedWatch = {
        movieId: 1,
        movie: {
            id: 1,
            tmdbId: 550,
            title: 'Fight Club',
            year: 1999,
            posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
            synopsis: 'A movie about...',
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
    }

    it('renders movie title and year', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.getByText('1999')).toBeInTheDocument()
    })

    it('displays poster image with correct TMDb URL', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        const posterImg = screen.getByAltText('Fight Club')
        expect(posterImg).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg')
    })

    it('shows fallback when no poster path', () => {
        const watchWithoutPoster: GroupedWatch = {
            ...mockGroupedWatch,
            movie: {
                ...mockGroupedWatch.movie,
                posterPath: null,
            },
        }

        render(<WatchCard groupedWatch={watchWithoutPoster} />)

        expect(screen.getByText('No poster')).toBeInTheDocument()
    })

    it('displays watch count badge when watched multiple times', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        expect(screen.getByText('2x')).toBeInTheDocument()
    })

    it('does not display watch count badge when watched only once', () => {
        const singleWatch: GroupedWatch = {
            ...mockGroupedWatch,
            watchCount: 1,
            watches: [mockGroupedWatch.watches[0]],
        }

        render(<WatchCard groupedWatch={singleWatch} />)

        expect(screen.queryByText('1x')).not.toBeInTheDocument()
    })

    it('displays average rating formatted to one decimal', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        expect(screen.getByText('8.5')).toBeInTheDocument()
        expect(screen.getByText('/10')).toBeInTheDocument()
    })

    it('does not display rating if averageRating is null', () => {
        const watchWithoutRating: GroupedWatch = {
            ...mockGroupedWatch,
            averageRating: null,
        }

        render(<WatchCard groupedWatch={watchWithoutRating} />)

        expect(screen.queryByText('/10')).not.toBeInTheDocument()
    })

    it('displays last watched date formatted correctly', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        // Date '2024-12-30' should be formatted as 'Dec 30, 2024'
        expect(screen.getByText(/Last watched: Dec 30, 2024/)).toBeInTheDocument()
    })

    it('displays last watch location with cinema emoji', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        expect(screen.getByText(/🎬 Cinema/)).toBeInTheDocument()
    })

    it('displays last watch location with home emoji', () => {
        const homeWatch: GroupedWatch = {
            ...mockGroupedWatch,
            watches: [
                {
                    ...mockGroupedWatch.watches[0],
                    watchLocation: 'Home',
                },
            ],
        }

        render(<WatchCard groupedWatch={homeWatch} />)

        expect(screen.getByText(/🏠 Home/)).toBeInTheDocument()
    })

    it('displays who the movie was watched with', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        expect(screen.getByText(/With: Friends/)).toBeInTheDocument()
    })

    it('does not display watchedWith if null', () => {
        const watchWithoutCompany: GroupedWatch = {
            ...mockGroupedWatch,
            watches: [
                {
                    ...mockGroupedWatch.watches[0],
                    watchedWith: null,
                },
            ],
        }

        render(<WatchCard groupedWatch={watchWithoutCompany} />)

        expect(screen.queryByText(/With:/)).not.toBeInTheDocument()
    })

    it('links to the correct detail page', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/watched/1')
    })

    it('handles missing year gracefully', () => {
        const watchWithoutYear: GroupedWatch = {
            ...mockGroupedWatch,
            movie: {
                ...mockGroupedWatch.movie,
                year: undefined,
            },
        }

        render(<WatchCard groupedWatch={watchWithoutYear} />)

        expect(screen.queryByText('1999')).not.toBeInTheDocument()
    })

    it('uses the first watch as the last watch (most recent)', () => {
        render(<WatchCard groupedWatch={mockGroupedWatch} />)

        // Should show info from first watch (most recent: 2024-12-30)
        expect(screen.getByText(/Dec 30, 2024/)).toBeInTheDocument()
        expect(screen.getByText(/Cinema/)).toBeInTheDocument()
    })
})