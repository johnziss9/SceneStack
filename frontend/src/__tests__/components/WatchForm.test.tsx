import { render, screen, waitFor } from '@/test-utils'
import { WatchForm } from '@/components/WatchForm'
import { watchApi } from '@/lib'
import userEvent from '@testing-library/user-event'
import type { TmdbMovie, Watch } from '@/types'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        createWatch: jest.fn(),
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

describe('WatchForm', () => {
    const mockMovie: TmdbMovie = {
        id: 550,
        title: 'Fight Club',
        release_date: '1999-10-15',
        poster_path: '/path.jpg',
        overview: 'A movie...',
        vote_average: 8.4,
        vote_count: 1000,
    }

    const mockOnOpenChange = jest.fn()
    const mockOnSuccess = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders dialog with movie title when open', () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(screen.getByText('Log Watch')).toBeInTheDocument()
        expect(screen.getByText('Fight Club (1999)')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={false}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(screen.queryByText('Log Watch')).not.toBeInTheDocument()
    })

    it('renders all form fields', () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(screen.getByLabelText(/watch date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/rating/i)).toBeInTheDocument()
        expect(screen.getByText('Location')).toBeInTheDocument()
        expect(screen.getByLabelText(/watched with/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/this is a rewatch/i)).toBeInTheDocument()
    })

    it('defaults watch date to today', () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const dateInput = screen.getByLabelText(/watch date/i) as HTMLInputElement
        const today = new Date().toISOString().split('T')[0]
        expect(dateInput.value).toBe(today)
    })

    it('submits form with minimal required fields', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-30T00:00:00Z',
            isRewatch: false,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Just submit with default date
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    tmdbId: 550,
                    userId: 1,
                    isRewatch: false,
                })
            )
        })
    })

    it('submits form with rating filled in', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 9,
            isRewatch: false,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Fill in rating
        const ratingInput = screen.getByLabelText(/rating/i)
        await user.type(ratingInput, '9')

        // Fill in notes
        const notesInput = screen.getByLabelText(/notes/i)
        await user.type(notesInput, 'Great movie!')

        // Fill in watched with
        const watchedWithInput = screen.getByLabelText(/watched with/i)
        await user.type(watchedWithInput, 'Friends')

        // Submit form
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    tmdbId: 550,
                    userId: 1,
                    rating: 9,
                    notes: 'Great movie!',
                    watchedWith: 'Friends',
                    isRewatch: false,
                })
            )
        })
    })

    it('submits form with rewatch checked', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-30T00:00:00Z',
            isRewatch: true,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Check rewatch checkbox
        const rewatchCheckbox = screen.getByLabelText(/this is a rewatch/i)
        await user.click(rewatchCheckbox)

        // Submit form
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    isRewatch: true,
                })
            )
        })
    })

    it('submits form with custom date', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-25T00:00:00Z',
            isRewatch: false,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Change date
        const dateInput = screen.getByLabelText(/watch date/i)
        await user.clear(dateInput)
        await user.type(dateInput, '2024-12-25')

        // Submit form
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    watchedDate: expect.stringContaining('2024-12-25'),
                })
            )
        })
    })

    it('closes dialog and calls onSuccess after successful submission', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-30T00:00:00Z',
            isRewatch: false,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockOnOpenChange).toHaveBeenCalledWith(false)
            expect(mockOnSuccess).toHaveBeenCalled()
        })
    })

    it('displays error message on API failure', async () => {
        const user = userEvent.setup()
            ; (watchApi.createWatch as jest.Mock).mockRejectedValue(new Error('API Error'))

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Failed to add watch. Please try again.')).toBeInTheDocument()
        })

        // Should not close dialog or call onSuccess
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
        expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('shows loading state while submitting', async () => {
        const user = userEvent.setup()
            ; (watchApi.createWatch as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        // Should show loading state
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument()
        })
    })

    it('disables buttons while submitting', async () => {
        const user = userEvent.setup()
            ; (watchApi.createWatch as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        const cancelButton = screen.getByRole('button', { name: /cancel/i })

        await user.click(submitButton)

        await waitFor(() => {
            expect(submitButton).toBeDisabled()
            expect(cancelButton).toBeDisabled()
        })
    })

    it('calls onOpenChange when cancel button is clicked', async () => {
        const user = userEvent.setup()
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)

        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('returns null when movie is null', () => {
        const { container } = render(
            <WatchForm
                movie={null}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(container.firstChild).toBeNull()
    })

    it('handles movie without release date', () => {
        const movieWithoutDate: TmdbMovie = {
            ...mockMovie,
            release_date: undefined,
        }

        render(
            <WatchForm
                movie={movieWithoutDate}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Should show title without year
        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.queryByText(/\(1999\)/)).not.toBeInTheDocument()
    })

    it('converts rating string to number when submitting', async () => {
        const user = userEvent.setup()
        const mockResponse: Watch = {
            id: 1,
            userId: 1,
            movieId: 1,
            watchedDate: '2024-12-30T00:00:00Z',
            rating: 7,
            isRewatch: false,
            createdAt: '2024-12-30T10:00:00Z',
            movie: {
                id: 1,
                tmdbId: 550,
                title: 'Fight Club',
                year: 1999,
                posterPath: '/path.jpg',
                synopsis: 'A movie...',
            },
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            },
        }

            ; (watchApi.createWatch as jest.Mock).mockResolvedValue(mockResponse)

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const ratingInput = screen.getByLabelText(/rating/i)
        await user.type(ratingInput, '7')

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    rating: 7, // Should be number, not string
                })
            )
        })
    })
})