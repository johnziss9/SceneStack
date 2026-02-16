import { render, screen, waitFor } from '@/test-utils'
import { PrivacySettings } from '@/components/PrivacySettings'
import { privacyApi } from '@/lib/api'
import userEvent from '@testing-library/user-event'
import type { UserPrivacySettings } from '@/types'

// Mock the privacyApi
jest.mock('@/lib/api', () => ({
    privacyApi: {
        getPrivacySettings: jest.fn(),
        updatePrivacySettings: jest.fn(),
    },
}))

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
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

describe('PrivacySettings', () => {
    const mockSettings: UserPrivacySettings = {
        shareWatches: true,
        shareRatings: true,
        shareNotes: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('displays loading state initially', () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<PrivacySettings />)

        expect(screen.getByText('Privacy Settings')).toBeInTheDocument()
        expect(screen.getByText('Control what you share with your groups')).toBeInTheDocument()

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays privacy settings', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Watch History')).toBeInTheDocument()
            expect(screen.getByText('Share Ratings')).toBeInTheDocument()
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        expect(privacyApi.getPrivacySettings).toHaveBeenCalledTimes(1)
    })

    it('displays correct initial toggle states', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            const shareWatchesSwitch = screen.getByRole('switch', { name: /share watch history/i })
            const shareRatingsSwitch = screen.getByRole('switch', { name: /share ratings/i })
            const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })

            expect(shareWatchesSwitch).toBeChecked()
            expect(shareRatingsSwitch).toBeChecked()
            expect(shareNotesSwitch).not.toBeChecked()
        })
    })

    it('displays error message on fetch failure', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load privacy settings. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('shows retry button on error', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('retries fetching settings when retry button is clicked', async () => {
        const user = userEvent.setup()

            // First call fails
            ; (privacyApi.getPrivacySettings as jest.Mock).mockRejectedValueOnce(
                new Error('API Error')
            )

        render(<PrivacySettings />)

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to load privacy settings. Please try again.')).toBeInTheDocument()
        })

            // Second call succeeds
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValueOnce(mockSettings)

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show settings after retry
        await waitFor(() => {
            expect(screen.getByText('Share Watch History')).toBeInTheDocument()
        })

        expect(privacyApi.getPrivacySettings).toHaveBeenCalledTimes(2)
    })

    it('does not show save/reset buttons initially', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Watch History')).toBeInTheDocument()
        })

        expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })

    it('shows save/reset buttons after toggling a switch', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Watch History')).toBeInTheDocument()
        })

        // Toggle a switch
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        // Save/Reset buttons should appear
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('toggles shareWatches switch', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Watch History')).toBeInTheDocument()
        })

        const shareWatchesSwitch = screen.getByRole('switch', { name: /share watch history/i })
        expect(shareWatchesSwitch).toBeChecked()

        await user.click(shareWatchesSwitch)

        expect(shareWatchesSwitch).not.toBeChecked()
    })

    it('toggles shareRatings switch', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Ratings')).toBeInTheDocument()
        })

        const shareRatingsSwitch = screen.getByRole('switch', { name: /share ratings/i })
        expect(shareRatingsSwitch).toBeChecked()

        await user.click(shareRatingsSwitch)

        expect(shareRatingsSwitch).not.toBeChecked()
    })

    it('toggles shareNotes switch', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        expect(shareNotesSwitch).not.toBeChecked()

        await user.click(shareNotesSwitch)

        expect(shareNotesSwitch).toBeChecked()
    })

    it('saves updated settings successfully', async () => {
        const user = userEvent.setup()
        const updatedSettings: UserPrivacySettings = {
            shareWatches: true,
            shareRatings: true,
            shareNotes: true, // Changed from false
        }

            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockResolvedValue(updatedSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle shareNotes
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        // Click save
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        await waitFor(() => {
            expect(privacyApi.updatePrivacySettings).toHaveBeenCalledWith({
                shareWatches: true,
                shareRatings: true,
                shareNotes: true,
            })
        })
    })

    it('hides save/reset buttons after successful save', async () => {
        const user = userEvent.setup()
        const updatedSettings: UserPrivacySettings = {
            shareWatches: true,
            shareRatings: true,
            shareNotes: true,
        }

            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockResolvedValue(updatedSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle and save
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        // Buttons should disappear after save
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
        })
    })

    it('displays error on save failure', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockRejectedValue(
                new Error('API Error')
            )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle and save
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        await waitFor(() => {
            expect(privacyApi.updatePrivacySettings).toHaveBeenCalled()
        })

        // Save/Reset buttons should still be visible after error
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('shows loading state while saving', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle and save
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        // Should show loading state
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument()
        })
    })

    it('disables switches while saving', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle and save
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        // All switches should be disabled
        await waitFor(() => {
            const shareWatchesSwitch = screen.getByRole('switch', { name: /share watch history/i })
            const shareRatingsSwitch = screen.getByRole('switch', { name: /share ratings/i })
            const shareNotesSwitch2 = screen.getByRole('switch', { name: /share notes/i })

            expect(shareWatchesSwitch).toBeDisabled()
            expect(shareRatingsSwitch).toBeDisabled()
            expect(shareNotesSwitch2).toBeDisabled()
        })
    })

    it('disables save and reset buttons while saving', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100))
            )

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle and save
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        const resetButton = screen.getByRole('button', { name: /reset/i })

        await user.click(saveButton)

        await waitFor(() => {
            expect(saveButton).toBeDisabled()
            expect(resetButton).toBeDisabled()
        })
    })

    it('resets changes when reset button is clicked', async () => {
        const user = userEvent.setup()
            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle shareNotes to true
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })
        await user.click(shareNotesSwitch)
        expect(shareNotesSwitch).toBeChecked()

        // Click reset
        const resetButton = screen.getByRole('button', { name: /reset/i })
        await user.click(resetButton)

        // Should fetch settings again and reset state
        await waitFor(() => {
            expect(privacyApi.getPrivacySettings).toHaveBeenCalledTimes(2)
        })

        // Save/Reset buttons should disappear
        expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })

    it('handles multiple toggle changes before saving', async () => {
        const user = userEvent.setup()
        const updatedSettings: UserPrivacySettings = {
            shareWatches: false,
            shareRatings: false,
            shareNotes: true,
        }

            ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)
            ; (privacyApi.updatePrivacySettings as jest.Mock).mockResolvedValue(updatedSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText('Share Notes')).toBeInTheDocument()
        })

        // Toggle all three switches
        const shareWatchesSwitch = screen.getByRole('switch', { name: /share watch history/i })
        const shareRatingsSwitch = screen.getByRole('switch', { name: /share ratings/i })
        const shareNotesSwitch = screen.getByRole('switch', { name: /share notes/i })

        await user.click(shareWatchesSwitch)
        await user.click(shareRatingsSwitch)
        await user.click(shareNotesSwitch)

        // Click save
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        await waitFor(() => {
            expect(privacyApi.updatePrivacySettings).toHaveBeenCalledWith({
                shareWatches: false,
                shareRatings: false,
                shareNotes: true,
            })
        })
    })

    it('displays explanatory text for each setting', async () => {
        ; (privacyApi.getPrivacySettings as jest.Mock).mockResolvedValue(mockSettings)

        render(<PrivacySettings />)

        await waitFor(() => {
            expect(screen.getByText("Allow group members to see what movies you've watched")).toBeInTheDocument()
            expect(screen.getByText("Allow group members to see your movie ratings")).toBeInTheDocument()
            expect(screen.getByText("Allow group members to see your personal notes about movies")).toBeInTheDocument()
        })
    })
})