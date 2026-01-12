import { render, screen } from '@/test-utils'
import { MovieCard } from '@/components/MovieCard'
import { useAuth } from '@/contexts/AuthContext'
import type { TmdbMovie } from '@/types'
import userEvent from '@testing-library/user-event'

// Mock AuthContext
jest.mock('@/contexts/AuthContext')
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

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
})