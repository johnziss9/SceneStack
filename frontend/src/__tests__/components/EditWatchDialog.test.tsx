import { render, screen, waitFor } from '@/test-utils'
import EditWatchDialog from '@/components/EditWatchDialog'
import { watchApi } from '@/lib'
import userEvent from '@testing-library/user-event'
import type { Watch } from '@/types'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        updateWatch: jest.fn(),
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

describe('EditWatchDialog', () => {
    const mockWatch: Watch = {
        id: 1,
        userId: 1,
        movieId: 1,
        watchedDate: '2024-12-30T00:00:00Z',
        rating: 9,
        notes: 'Great movie!',
        watchLocation: 'Cinema',
        watchedWith: 'Friends',
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

    const mockOnOpenChange = jest.fn()
    const mockOnSuccess = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders dialog with movie title when open', () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(screen.getByText('Edit Watch: Fight Club')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={false}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(screen.queryByText('Edit Watch: Fight Club')).not.toBeInTheDocument()
    })

    it('pre-fills form with watch data', () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const dateInput = screen.getByLabelText(/date watched/i) as HTMLInputElement
        expect(dateInput.value).toBe('2024-12-30')

        const ratingInput = screen.getByLabelText(/rating/i) as HTMLInputElement
        expect(ratingInput.value).toBe('9')

        const watchedWithInput = screen.getByLabelText(/watched with/i) as HTMLInputElement
        expect(watchedWithInput.value).toBe('Friends')

        const notesInput = screen.getByLabelText(/notes/i) as HTMLTextAreaElement
        expect(notesInput.value).toBe('Great movie!')

        const rewatchCheckbox = screen.getByLabelText(/this is a rewatch/i) as HTMLInputElement
        expect(rewatchCheckbox.checked).toBe(false)
    })

    it('handles watch with custom location', () => {
        const watchWithCustomLocation: Watch = {
            ...mockWatch,
            watchLocation: "Friend's house",
        }

        render(
            <EditWatchDialog
                watch={watchWithCustomLocation}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Should show custom location input
        const customLocationInput = screen.getByLabelText(/custom location/i) as HTMLInputElement
        expect(customLocationInput.value).toBe("Friend's house")
    })

    it('handles watch without optional fields', () => {
        const minimalWatch: Watch = {
            ...mockWatch,
            rating: undefined,
            notes: undefined,
            watchLocation: undefined,
            watchedWith: undefined,
        }

        render(
            <EditWatchDialog
                watch={minimalWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const ratingInput = screen.getByLabelText(/rating/i) as HTMLInputElement
        expect(ratingInput.value).toBe('')

        const watchedWithInput = screen.getByLabelText(/watched with/i) as HTMLInputElement
        expect(watchedWithInput.value).toBe('')

        const notesInput = screen.getByLabelText(/notes/i) as HTMLTextAreaElement
        expect(notesInput.value).toBe('')
    })

    it('updates watch successfully', async () => {
        const user = userEvent.setup()
        const updatedWatch: Watch = {
            ...mockWatch,
            rating: 10,
            notes: 'Even better on rewatch!',
        }

            ; (watchApi.updateWatch as jest.Mock).mockResolvedValue(updatedWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Change rating
        const ratingInput = screen.getByLabelText(/rating/i)
        await user.clear(ratingInput)
        await user.type(ratingInput, '10')

        // Change notes
        const notesInput = screen.getByLabelText(/notes/i)
        await user.clear(notesInput)
        await user.type(notesInput, 'Even better on rewatch!')

        // Submit
        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    rating: 10,
                    notes: 'Even better on rewatch!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Friends',
                    isRewatch: false,
                })
            )
        })
    })

    it('updates rewatch status', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Check rewatch checkbox
        const rewatchCheckbox = screen.getByLabelText(/this is a rewatch/i)
        await user.click(rewatchCheckbox)

        // Submit
        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    isRewatch: true,
                })
            )
        })
    })

    it('closes dialog and calls onSuccess after successful update', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalled()
            expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        })
    })

    it('displays error message on API failure', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockRejectedValue(new Error('API Error'))

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Failed to update watch. Please try again.')).toBeInTheDocument()
        })

        // Should not close dialog or call onSuccess
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
        expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('shows loading state while submitting', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument()
        })
    })

    it('disables buttons while submitting', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const submitButton = screen.getByRole('button', { name: /save changes/i })
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
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)

        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('returns null when watch is null', () => {
        const { container } = render(
            <EditWatchDialog
                watch={null}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        expect(container.firstChild).toBeNull()
    })

    it('converts rating to number when submitting', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        const ratingInput = screen.getByLabelText(/rating/i)
        await user.clear(ratingInput)
        await user.type(ratingInput, '7')

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    rating: 7, // Should be number, not string
                })
            )
        })
    })

    it('sends undefined for empty optional fields', async () => {
        const user = userEvent.setup()
            ; (watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Clear all optional fields
        const ratingInput = screen.getByLabelText(/rating/i)
        await user.clear(ratingInput)

        const watchedWithInput = screen.getByLabelText(/watched with/i)
        await user.clear(watchedWithInput)

        const notesInput = screen.getByLabelText(/notes/i)
        await user.clear(notesInput)

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    rating: undefined,
                    notes: undefined,
                    watchedWith: undefined,
                })
            )
        })
    })
})