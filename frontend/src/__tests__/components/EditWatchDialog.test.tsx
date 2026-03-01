import { render, screen, waitFor } from '@/test-utils'
import EditWatchDialog from '@/components/EditWatchDialog'
import { watchApi } from '@/lib'
import { groupApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import userEvent from '@testing-library/user-event'
import type { Watch, GroupBasicInfo } from '@/types'

// Mock the watchApi
jest.mock('@/lib', () => ({
    watchApi: {
        updateWatch: jest.fn(),
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

describe('EditWatchDialog', () => {
    const mockGroups: GroupBasicInfo[] = [
        { id: 1, name: 'Friday Movie Night', memberCount: 5 },
        { id: 2, name: 'Classic Cinema', memberCount: 3 },
    ]

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
        isPrivate: true,
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

    it('pre-fills form with watch data', async () => {
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

        // Rating is now a slider - check the ARIA value
        await waitFor(() => {
            const slider = screen.getByRole('slider')
            expect(slider).toHaveAttribute('aria-valuenow', '9')
        })

        const watchedWithInput = screen.getByLabelText(/watched with/i) as HTMLInputElement
        expect(watchedWithInput.value).toBe('Friends')

        const notesInput = screen.getByLabelText(/notes/i) as HTMLTextAreaElement
        expect(notesInput.value).toBe('Great movie!')

        // Rewatch is a button, not a checkbox - verify it's not selected by checking for absence of check icon or active state
        const rewatchButton = screen.getByRole('button', { name: /this is a rewatch/i })
        expect(rewatchButton).toBeInTheDocument()
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

        // Custom location input appears when location is "Other"
        const customLocationInput = screen.getByPlaceholderText(/enter location/i) as HTMLInputElement
        expect(customLocationInput.value).toBe("Friend's house")
    })

    it('handles watch without optional fields', async () => {
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

        // Rating slider shows default value when undefined (5)
        await waitFor(() => {
            const slider = screen.getByRole('slider')
            expect(slider).toHaveAttribute('aria-valuenow', '5')
        })

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

        // Wait for slider to be ready
        await waitFor(() => {
            expect(screen.getByRole('slider')).toBeInTheDocument()
        })

        // Change rating using slider - use keyboard interaction
        const slider = screen.getByRole('slider')
        slider.focus()
        await user.keyboard('{End}') // Move to maximum value (10)

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

        // Rewatch is a button, not a checkbox
        const rewatchButton = screen.getByRole('button', { name: /this is a rewatch/i })
        await user.click(rewatchButton)

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

        // Submit with existing rating (9) to verify it's submitted as a number
        const submitButton = await screen.findByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    rating: 9, // Should be number, not string
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

        // Wait for groups to load (in secondary modal)
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /specific groups/i })).toBeInTheDocument()
        })

        // Clear optional text fields (rating slider can't be cleared to undefined)
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
                    notes: undefined,
                    watchedWith: undefined,
                })
            )
        })
    })

    // Privacy & Sharing Tests
    it('fetches user groups when dialog opens', async () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
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
        const user = userEvent.setup()
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Click "Specific Groups" button to open secondary modal
        const specificGroupsButton = await screen.findByRole('button', { name: /specific groups/i })
        await user.click(specificGroupsButton)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Classic Cinema')).toBeInTheDocument()
        })
    })

    it('pre-fills privacy mode based on watch data', async () => {
        const privateWatch: Watch = {
            ...mockWatch,
            isPrivate: true,
        }

        render(
            <EditWatchDialog
                watch={privateWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Privacy is now a button-based selection, "Private" button should be selected
        await waitFor(() => {
            const privateButton = screen.getByRole('button', { name: /private.*only you can see this/i })
            expect(privateButton).toHaveClass('border-primary')
        })
    })

    it('pre-fills group selections when watch is shared with specific groups', async () => {
        const user = userEvent.setup()
        const sharedWatch: Watch = {
            ...mockWatch,
            isPrivate: false,
            groupIds: [1], // Shared with Friday Movie Night
        }

        render(
            <EditWatchDialog
                watch={sharedWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // "Specific Groups" card should be selected
        await waitFor(() => {
            const specificGroupsCard = screen.getByRole('button', { name: /specific groups/i })
            expect(specificGroupsCard).toHaveClass('border-primary')
        })

        // Click "Specific Groups" button to open secondary modal and verify selection
        const specificGroupsButton = await screen.findByRole('button', { name: /specific groups/i })
        await user.click(specificGroupsButton)

        await waitFor(() => {
            const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
            expect(groupCheckbox).toBeChecked()
        })
    })

    it('pre-selects "All my groups" when watch is shared with all groups', async () => {
        const sharedWatch: Watch = {
            ...mockWatch,
            isPrivate: false,
            groupIds: [1, 2], // Shared with all groups
        }

        render(
            <EditWatchDialog
                watch={sharedWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // "All My Groups" card should be selected in the main dialog
        await waitFor(() => {
            const allMyGroupsCard = screen.getByRole('button', { name: /all my groups/i })
            expect(allMyGroupsCard).toHaveClass('border-primary')
        })
    })

    it('updates privacy to private', async () => {
        const user = userEvent.setup()
        const publicWatch: Watch = {
            ...mockWatch,
            isPrivate: false,
            groupIds: [1],
        }
        ;(watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={publicWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Wait for privacy buttons to be available and click "Private" button
        const privateButton = await screen.findByRole('button', { name: /private.*only you can see this/i })
        await user.click(privateButton)

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    isPrivate: true,
                })
            )
        })
    })

    it('updates sharing from private to specific groups', async () => {
        const user = userEvent.setup()
        ;(watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Click "Specific Groups" card button
        const specificGroupsButton = await screen.findByRole('button', { name: /specific groups/i })
        await user.click(specificGroupsButton)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Select a group
        const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(groupCheckbox)

        // Close secondary modal (click confirm button)
        const confirmButton = screen.getByRole('button', { name: /confirm/i })
        await user.click(confirmButton)

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    isPrivate: false,
                    groupIds: [1],
                })
            )
        })
    })

    it('updates sharing to all groups', async () => {
        const user = userEvent.setup()
        ;(watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Click "All My Groups" card button directly (no need to open secondary modal)
        const allMyGroupsButton = await screen.findByRole('button', { name: /all my groups/i })
        await user.click(allMyGroupsButton)

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    isPrivate: false,
                    groupIds: [1, 2], // All group IDs
                })
            )
        })
    })


    // Form Validation Tests
    // Note: Rating slider enforces min/max constraints, so validation errors for out-of-range ratings are not possible
    it('rating slider prevents values below 1', async () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Rating slider has min=1, max=10 constraints built-in via ARIA attributes
        await waitFor(() => {
            const slider = screen.getByRole('slider')
            expect(slider).toHaveAttribute('aria-valuemin', '1')
            expect(slider).toHaveAttribute('aria-valuemax', '10')
        })
    })

    it('rating slider prevents values above 10', async () => {
        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Rating slider has min=1, max=10 constraints built-in via ARIA attributes
        await waitFor(() => {
            const slider = screen.getByRole('slider')
            expect(slider).toHaveAttribute('aria-valuemin', '1')
            expect(slider).toHaveAttribute('aria-valuemax', '10')
        })

        expect(watchApi.updateWatch).not.toHaveBeenCalled()
    })

    it('shows validation error when "Other" location selected without custom text', async () => {
        const user = userEvent.setup()

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Wait for groups button to be available
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /specific groups/i })).toBeInTheDocument()
        })

        // Select "Other" location
        const locationTrigger = screen.getByRole('combobox')
        await user.click(locationTrigger)
        const otherOption = screen.getByRole('option', { name: 'Other' })
        await user.click(otherOption)

        // Clear custom location if any
        const customLocationInput = screen.getByPlaceholderText(/enter location/i)
        await user.clear(customLocationInput)

        // Try to submit
        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/Please specify the location/i)).toBeInTheDocument()
        })

        expect(watchApi.updateWatch).not.toHaveBeenCalled()
    })

    it('updates with custom location when "Other" is selected', async () => {
        const user = userEvent.setup()
        ;(watchApi.updateWatch as jest.Mock).mockResolvedValue(mockWatch)

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        // Wait for groups button to be available
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /specific groups/i })).toBeInTheDocument()
        })

        // Select "Other" location
        const locationTrigger = screen.getByRole('combobox')
        await user.click(locationTrigger)
        const otherOption = screen.getByRole('option', { name: 'Other' })
        await user.click(otherOption)

        // Enter custom location
        const customLocationInput = screen.getByPlaceholderText(/enter location/i)
        await user.type(customLocationInput, "Drive-in Theater")

        const submitButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(watchApi.updateWatch).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    watchLocation: "Drive-in Theater",
                })
            )
        })
    })

    it('displays message when user has no groups', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(
            <EditWatchDialog
                watch={mockWatch}
                open={true}
                onOpenChange={mockOnOpenChange}
                onSuccess={mockOnSuccess}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/You're not a member of any groups yet/i)).toBeInTheDocument()
        })
    })
})