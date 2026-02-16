import { render, screen, waitFor } from '@/test-utils'
import { WatchForm } from '@/components/WatchForm'
import { watchApi } from '@/lib'
import { groupApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import userEvent from '@testing-library/user-event'
import type { TmdbMovie, Watch, GroupBasicInfo } from '@/types'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        createWatch: jest.fn(),
    },
}))

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getUserGroups: jest.fn(),
    },
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext')

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
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

    const mockGroups: GroupBasicInfo[] = [
        { id: 1, name: 'Friday Movie Night', memberCount: 5 },
        { id: 2, name: 'Classic Cinema', memberCount: 3 },
    ]

    const mockOnOpenChange = jest.fn()
    const mockOnSuccess = jest.fn()

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

    // Privacy & Sharing Tests
    it('defaults privacy checkbox to checked (private)', async () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            const privateCheckbox = screen.getByLabelText(/mark as private/i)
            expect(privateCheckbox).toBeChecked()
        })
    })

    it('fetches user groups when dialog opens', async () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(groupApi.getUserGroups).toHaveBeenCalledTimes(1)
        })
    })

    it('displays user groups for sharing', async () => {
        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Classic Cinema')).toBeInTheDocument()
        })
    })

    it('displays message when user has no groups', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/You're not a member of any groups yet/i)).toBeInTheDocument()
        })
    })

    it('submits with isPrivate=true by default', async () => {
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

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPrivate: true,
                })
            )
        })
    })

    it('allows unchecking private and sharing with specific groups', async () => {
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

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Uncheck private
        const privateCheckbox = screen.getByLabelText(/mark as private/i)
        await user.click(privateCheckbox)

        // Select a specific group
        const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(groupCheckbox)

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPrivate: false,
                    groupIds: [1],
                })
            )
        })
    })

    it('allows sharing with all groups', async () => {
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

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Uncheck private
        const privateCheckbox = screen.getByLabelText(/mark as private/i)
        await user.click(privateCheckbox)

        // Check "All my groups"
        const allGroupsCheckbox = screen.getByRole('checkbox', { name: /all my groups/i })
        await user.click(allGroupsCheckbox)

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    isPrivate: false,
                    groupIds: [1, 2], // All group IDs
                })
            )
        })
    })

    it('shows validation error when not private and no groups selected', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Uncheck private
        const privateCheckbox = screen.getByLabelText(/mark as private/i)
        await user.click(privateCheckbox)

        // Try to submit without selecting groups
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(
                screen.getByText(/Please select at least one group to share with, or mark as private/i)
            ).toBeInTheDocument()
        })

        expect(watchApi.createWatch).not.toHaveBeenCalled()
    })

    it('clears group selections when marking as private', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Uncheck private
        const privateCheckbox = screen.getByLabelText(/mark as private/i)
        await user.click(privateCheckbox)

        // Select a group
        const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(groupCheckbox)
        expect(groupCheckbox).toBeChecked()

        // Check private again
        await user.click(privateCheckbox)

        // Group selection should be cleared
        await waitFor(() => {
            expect(groupCheckbox).not.toBeChecked()
        })
    })

    // Form Validation Tests
    it('shows validation error for rating below 1', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const ratingInput = screen.getByLabelText(/rating/i)
        await user.type(ratingInput, '0')

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/Rating must be between 1 and 10/i)).toBeInTheDocument()
        })

        expect(watchApi.createWatch).not.toHaveBeenCalled()
    })

    it('shows validation error for rating above 10', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const ratingInput = screen.getByLabelText(/rating/i)
        await user.type(ratingInput, '11')

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/Rating must be between 1 and 10/i)).toBeInTheDocument()
        })

        expect(watchApi.createWatch).not.toHaveBeenCalled()
    })

    it('displays location dropdown with options', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Click on location select trigger
        const locationTrigger = screen.getByRole('combobox', { name: /location/i })
        await user.click(locationTrigger)

        // Check for options
        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Cinema' })).toBeInTheDocument()
            expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument()
            expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
        })
    })

    it('shows custom location input when "Other" is selected', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Click on location select
        const locationTrigger = screen.getByRole('combobox', { name: /location/i })
        await user.click(locationTrigger)

        // Select "Other"
        const otherOption = screen.getByRole('option', { name: 'Other' })
        await user.click(otherOption)

        // Custom location input should appear
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Enter location/i)).toBeInTheDocument()
        })
    })

    it('shows validation error when "Other" location is selected without custom text', async () => {
        const user = userEvent.setup()

        render(
            <WatchForm
                movie={mockMovie}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Select "Other" location
        const locationTrigger = screen.getByRole('combobox', { name: /location/i })
        await user.click(locationTrigger)
        const otherOption = screen.getByRole('option', { name: 'Other' })
        await user.click(otherOption)

        // Try to submit without entering custom location
        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/Please specify the location/i)).toBeInTheDocument()
        })

        expect(watchApi.createWatch).not.toHaveBeenCalled()
    })

    it('submits with custom location when "Other" is selected and filled', async () => {
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

        // Select "Other" location
        const locationTrigger = screen.getByRole('combobox', { name: /location/i })
        await user.click(locationTrigger)
        const otherOption = screen.getByRole('option', { name: 'Other' })
        await user.click(otherOption)

        // Enter custom location
        const customLocationInput = screen.getByPlaceholderText(/Enter location/i)
        await user.type(customLocationInput, "Friend's house")

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    watchLocation: "Friend's house",
                })
            )
        })
    })

    it('submits with predefined location when selected', async () => {
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

        // Select "Cinema" location
        const locationTrigger = screen.getByRole('combobox', { name: /location/i })
        await user.click(locationTrigger)
        const cinemaOption = screen.getByRole('option', { name: 'Cinema' })
        await user.click(cinemaOption)

        const submitButton = screen.getByRole('button', { name: /save watch/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.createWatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    watchLocation: 'Cinema',
                })
            )
        })
    })
})