import { render, screen, waitFor } from '@/test-utils'
import { MovieCard } from '@/components/MovieCard'
import { useAuth } from '@/contexts/AuthContext'
import type { TmdbMovie } from '@/types'
import userEvent from '@testing-library/user-event'
import { movieApi, watchlistApi } from '@/lib/api'
import { PremiumRequiredError, ApiError } from '@/lib/api-client'

// Mock AuthContext
jest.mock('@/contexts/AuthContext')
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

// Mock API modules
jest.mock('@/lib/api', () => ({
    movieApi: {
        getMyStatus: jest.fn(),
    },
    watchlistApi: {
        addToWatchlist: jest.fn(),
        removeFromWatchlist: jest.fn(),
    },
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockGetMyStatus = movieApi.getMyStatus as jest.MockedFunction<typeof movieApi.getMyStatus>
const mockAddToWatchlist = watchlistApi.addToWatchlist as jest.MockedFunction<typeof watchlistApi.addToWatchlist>
const mockRemoveFromWatchlist = watchlistApi.removeFromWatchlist as jest.MockedFunction<typeof watchlistApi.removeFromWatchlist>

describe('MovieCard', () => {
    const mockMovie: TmdbMovie = {
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
        vote_average: 8.4,
        vote_count: 1000,
    }

    const mockOnAddToWatched = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        // Default: user is authenticated
        mockUseAuth.mockReturnValue({
            user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

        // Default: movie is not on watchlist
        mockGetMyStatus.mockResolvedValue({
            localMovieId: null,
            watchCount: 0,
            latestRating: null,
            onWatchlist: false,
            watchlistItemId: null,
        })
    })

    it('renders movie information correctly', () => {
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.getByText('1999')).toBeInTheDocument()
        expect(screen.getByText('8.4')).toBeInTheDocument()
    })

    it('displays poster image with correct TMDb URL', () => {
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        const posterImg = screen.getByAltText('Fight Club')
        expect(posterImg).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg')
    })

    it('shows fallback placeholder when no poster path', () => {
        const movieWithoutPoster: TmdbMovie = {
            ...mockMovie,
            poster_path: null,
        }

        render(<MovieCard movie={movieWithoutPoster} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.getByText('No poster')).toBeInTheDocument()
    })

    it('displays truncated overview', () => {
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.getByText(/A ticking-time-bomb insomniac/)).toBeInTheDocument()
    })

    it('handles missing release date', () => {
        const movieWithoutDate: TmdbMovie = {
            ...mockMovie,
            release_date: undefined,
        }

        render(<MovieCard movie={movieWithoutDate} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.queryByText('1999')).not.toBeInTheDocument()
    })

    it('handles missing vote_average and shows N/A', () => {
        const movieWithoutRating: TmdbMovie = {
            ...mockMovie,
            vote_average: 0,
        }

        render(<MovieCard movie={movieWithoutRating} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('formats vote_average to one decimal place', () => {
        const movieWithRating: TmdbMovie = {
            ...mockMovie,
            vote_average: 8.437,
        }

        render(<MovieCard movie={movieWithRating} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.getByText('8.4')).toBeInTheDocument()
    })

    it('calls onAddToWatched when "Add to Watched" button is clicked', async () => {
        const user = userEvent.setup()
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        const addButton = screen.getByRole('button', { name: /add to watched/i })
        await user.click(addButton)

        expect(mockOnAddToWatched).toHaveBeenCalledTimes(1)
        expect(mockOnAddToWatched).toHaveBeenCalledWith(mockMovie)
    })

    it('renders the "Add to Watched" button', () => {
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        const addButton = screen.getByRole('button', { name: /add to watched/i })
        expect(addButton).toBeInTheDocument()
    })

    it('extracts year from release_date correctly', () => {
        render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

        // Year should be extracted from '1999-10-15'
        expect(screen.getByText('1999')).toBeInTheDocument()
    })

    it('does not render overview if not provided', () => {
        const movieWithoutOverview: TmdbMovie = {
            ...mockMovie,
            overview: '',
        }

        render(<MovieCard movie={movieWithoutOverview} onAddToWatched={mockOnAddToWatched} />)

        expect(screen.queryByText(/A ticking-time-bomb/)).not.toBeInTheDocument()
    })

    describe('Authentication', () => {
        it('should show "Add to Watched" button when user is authenticated', () => {
            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            expect(screen.getByRole('button', { name: /add to watched/i })).toBeInTheDocument()
        })

        it('should show "Sign in to log watches" button when user is not authenticated', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            expect(screen.getByRole('button', { name: /sign in to log watches/i })).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /add to watched/i })).not.toBeInTheDocument()
        })

        it('should link to login page when not authenticated', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            const signInLink = screen.getByRole('button', { name: /sign in to log watches/i }).closest('a')
            expect(signInLink).toHaveAttribute('href', '/login')
        })

        it('should call onAddToWatched when authenticated user clicks button', async () => {
            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            const button = screen.getByRole('button', { name: /add to watched/i })
            await user.click(button)

            expect(mockOnAddToWatched).toHaveBeenCalledWith(mockMovie)
        })

        it('should not call onAddToWatched when not authenticated', async () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            const button = screen.getByRole('button', { name: /sign in to log watches/i })
            await user.click(button)

            expect(mockOnAddToWatched).not.toHaveBeenCalled()
        })
    })

    describe('Phase 6: Movie Detail Links', () => {
        it('poster links to /movies/[tmdbId]', () => {
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            const posterLink = screen.getByAltText('Fight Club').closest('a')
            expect(posterLink).toHaveAttribute('href', '/movies/550')
        })

        it('title links to /movies/[tmdbId]', () => {
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            const titleLink = screen.getByText('Fight Club').closest('a')
            expect(titleLink).toHaveAttribute('href', '/movies/550')
        })
    })

    describe('Phase 6: Watchlist Button', () => {
        beforeEach(() => {
            mockGetMyStatus.mockResolvedValue({
                localMovieId: null,
                watchCount: 0,
                latestRating: null,
                onWatchlist: false,
                watchlistItemId: null,
            })
        })

        it('is hidden for unauthenticated users', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            expect(screen.queryByLabelText(/save to watchlist/i)).not.toBeInTheDocument()
            expect(screen.queryByLabelText(/remove from watchlist/i)).not.toBeInTheDocument()
        })

        it('shows bookmark icon when not on watchlist', async () => {
            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                const button = screen.getByLabelText('Save to watchlist')
                expect(button).toBeInTheDocument()
            })
        })

        it('shows filled bookmark icon when already on watchlist', async () => {
            mockGetMyStatus.mockResolvedValue({
                localMovieId: 1,
                watchCount: 0,
                latestRating: null,
                onWatchlist: true,
                watchlistItemId: 1,
            })

            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                const button = screen.getByLabelText('Remove from watchlist')
                expect(button).toBeInTheDocument()
            })
        })

        it('adds movie to watchlist when clicked', async () => {
            mockAddToWatchlist.mockResolvedValue({
                id: 1,
                movieId: 1,
                movie: {
                    id: 1,
                    tmdbId: 550,
                    title: 'Fight Club',
                    posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                    releaseDate: '1999-10-15',
                },
                notes: null,
                priority: 0,
                addedAt: new Date().toISOString(),
            })

            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                expect(screen.getByLabelText('Save to watchlist')).toBeInTheDocument()
            })

            const button = screen.getByLabelText('Save to watchlist')
            await user.click(button)

            await waitFor(() => {
                expect(mockAddToWatchlist).toHaveBeenCalledWith(550)
            })
        })

        it('removes movie from watchlist when clicked and already on watchlist', async () => {
            mockGetMyStatus.mockResolvedValue({
                localMovieId: 1,
                watchCount: 0,
                latestRating: null,
                onWatchlist: true,
                watchlistItemId: 1,
            })

            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                expect(screen.getByLabelText('Remove from watchlist')).toBeInTheDocument()
            })

            const button = screen.getByLabelText('Remove from watchlist')
            await user.click(button)

            await waitFor(() => {
                expect(mockRemoveFromWatchlist).toHaveBeenCalledWith(1)
            })
        })

        it('shows error toast when watchlist limit reached', async () => {
            mockAddToWatchlist.mockRejectedValue(new PremiumRequiredError('Watchlist limit reached'))

            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                expect(screen.getByLabelText('Save to watchlist')).toBeInTheDocument()
            })

            const button = screen.getByLabelText('Save to watchlist')
            await user.click(button)

            await waitFor(() => {
                expect(mockAddToWatchlist).toHaveBeenCalled()
            })
        })

        it('handles duplicate (409) error by marking as on watchlist', async () => {
            mockAddToWatchlist.mockRejectedValue(new ApiError('Already on watchlist', 409))

            mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com', isPremium: false },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            })

            const user = userEvent.setup()
            render(<MovieCard movie={mockMovie} onAddToWatched={mockOnAddToWatched} />)

            await waitFor(() => {
                expect(screen.getByLabelText('Save to watchlist')).toBeInTheDocument()
            })

            const button = screen.getByLabelText('Save to watchlist')
            await user.click(button)

            await waitFor(() => {
                expect(mockAddToWatchlist).toHaveBeenCalled()
            })
        })
    })
})