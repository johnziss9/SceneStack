import { render, screen, waitFor } from '@/test-utils'
import { BulkShareWithGroupsDialog } from '@/components/BulkShareWithGroupsDialog'
import { groupApi } from '@/lib/api'
import userEvent from '@testing-library/user-event'
import type { GroupBasicInfo } from '@/types'

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getUserGroups: jest.fn(),
    },
}))

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
    },
}))

describe('BulkShareWithGroupsDialog', () => {
    const mockOnOpenChange = jest.fn()
    const mockOnConfirm = jest.fn()

    const mockGroups: GroupBasicInfo[] = [
        { id: 1, name: 'Friday Movie Night', memberCount: 5 },
        { id: 2, name: 'Classic Cinema', memberCount: 3 },
        { id: 3, name: 'Horror Fans', memberCount: 8 },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
    })

    it('does not render when open is false', () => {
        render(
            <BulkShareWithGroupsDialog
                open={false}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.queryByText('Share with Groups')).not.toBeInTheDocument()
    })

    it('renders when open is true', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Share with Groups')).toBeInTheDocument()
        })
    })

    it('displays correct count with plural form', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/Share 5 movies with your groups/i)).toBeInTheDocument()
        })
    })

    it('displays correct count with singular form', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={1}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/Share 1 movie with your groups/i)).toBeInTheDocument()
        })
    })

    it('fetches user groups when dialog opens', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(groupApi.getUserGroups).toHaveBeenCalledTimes(1)
        })
    })

    it('displays loading state while fetching groups', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        )

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            const loader = document.querySelector('.animate-spin')
            expect(loader).toBeInTheDocument()
        })
    })

    it('displays all user groups after loading', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Classic Cinema')).toBeInTheDocument()
            expect(screen.getByText('Horror Fans')).toBeInTheDocument()
        })
    })

    it('displays member count for each group', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/5 members/i)).toBeInTheDocument()
            expect(screen.getByText(/3 members/i)).toBeInTheDocument()
            expect(screen.getByText(/8 members/i)).toBeInTheDocument()
        })
    })

    it('displays empty state when no groups available', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(
                screen.getByText(/You are not a member of any groups yet/i)
            ).toBeInTheDocument()
        })
    })

    it('displays operation mode radio buttons', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Add to existing groups')).toBeInTheDocument()
            expect(screen.getByText('Replace all sharing')).toBeInTheDocument()
        })
    })

    it('defaults to "add" operation mode', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            const addRadio = screen.getByRole('radio', { name: /Add to existing groups/i })
            expect(addRadio).toBeChecked()
        })
    })

    it('allows switching to "replace" operation mode', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const replaceRadio = screen.getByRole('radio', { name: /Replace all sharing/i })
        await user.click(replaceRadio)

        expect(replaceRadio).toBeChecked()
    })

    it('displays "All my groups" checkbox', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/All my groups/i)).toBeInTheDocument()
        })
    })

    it('displays total group count for "All my groups" option', async () => {
        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/\(3 groups\)/i)).toBeInTheDocument()
        })
    })

    it('allows selecting individual groups', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        expect(checkbox).toBeChecked()
    })

    it('allows selecting multiple groups', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox1 = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        const checkbox2 = screen.getByRole('checkbox', { name: /Classic Cinema/i })

        await user.click(checkbox1)
        await user.click(checkbox2)

        expect(checkbox1).toBeChecked()
        expect(checkbox2).toBeChecked()
    })

    it('allows deselecting groups', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })

        await user.click(checkbox)
        expect(checkbox).toBeChecked()

        await user.click(checkbox)
        expect(checkbox).not.toBeChecked()
    })

    it('disables individual groups when "All my groups" is checked', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const allGroupsCheckbox = screen.getByRole('checkbox', { name: /All my groups/i })
        await user.click(allGroupsCheckbox)

        const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        expect(groupCheckbox).toBeDisabled()
    })

    it('disables "All my groups" when individual groups are selected', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const groupCheckbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(groupCheckbox)

        const allGroupsCheckbox = screen.getByRole('checkbox', { name: /All my groups/i })
        expect(allGroupsCheckbox).toBeDisabled()
    })

    it('shows validation error when trying to confirm without selection', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(
                screen.getByText(/Please select at least one group/i)
            ).toBeInTheDocument()
        })

        expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('clears validation error when group is selected', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // First trigger validation error
        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(
                screen.getByText(/Please select at least one group/i)
            ).toBeInTheDocument()
        })

        // Then select a group
        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        // Error should be cleared
        expect(
            screen.queryByText(/Please select at least one group/i)
        ).not.toBeInTheDocument()
    })

    it('calls onConfirm with selected group IDs when add mode', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Select groups
        const checkbox1 = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        const checkbox2 = screen.getByRole('checkbox', { name: /Classic Cinema/i })
        await user.click(checkbox1)
        await user.click(checkbox2)

        // Confirm
        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith([1, 2], 'add')
        })
    })

    it('calls onConfirm with all group IDs when "All my groups" is selected', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Check "All my groups"
        const allGroupsCheckbox = screen.getByRole('checkbox', { name: /All my groups/i })
        await user.click(allGroupsCheckbox)

        // Confirm
        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith([1, 2, 3], 'add')
        })
    })

    it('calls onConfirm with replace mode when selected', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Switch to replace mode
        const replaceRadio = screen.getByRole('radio', { name: /Replace all sharing/i })
        await user.click(replaceRadio)

        // Select a group
        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        // Confirm
        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith([1], 'replace')
        })
    })

    it('shows warning alert when replace mode is selected with groups', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Switch to replace mode
        const replaceRadio = screen.getByRole('radio', { name: /Replace all sharing/i })
        await user.click(replaceRadio)

        // Select a group
        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        // Warning should appear
        await waitFor(() => {
            expect(
                screen.getByText(/This will remove these movies from any other groups/i)
            ).toBeInTheDocument()
        })
    })

    it('closes dialog after successful confirmation', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        })
    })

    it('disables buttons during submission', async () => {
        const user = userEvent.setup()
        let resolveConfirm: () => void
        const confirmPromise = new Promise<void>((resolve) => {
            resolveConfirm = resolve
        })
        mockOnConfirm.mockReturnValue(confirmPromise)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(confirmButton).toBeDisabled()
            expect(screen.getByText('Cancel')).toBeDisabled()
        })

        resolveConfirm!()
    })

    it('shows loading spinner during submission', async () => {
        const user = userEvent.setup()
        let resolveConfirm: () => void
        const confirmPromise = new Promise<void>((resolve) => {
            resolveConfirm = resolve
        })
        mockOnConfirm.mockReturnValue(confirmPromise)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            const button = screen.getByText('Update Sharing')
            const svg = button.querySelector('svg.animate-spin')
            expect(svg).toBeInTheDocument()
        })

        resolveConfirm!()
    })

    it('keeps dialog open when onConfirm fails', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockRejectedValue(new Error('API Error'))

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)

        const confirmButton = screen.getByText('Update Sharing')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(1)
        })

        // Wait for the finally block to complete (buttons re-enabled)
        await waitFor(() => {
            expect(confirmButton).not.toBeDisabled()
            expect(screen.getByText('Cancel')).not.toBeDisabled()
        })

        // Dialog should still be visible
        expect(screen.getByText('Share with Groups')).toBeInTheDocument()

        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('calls onOpenChange with false when cancel button is clicked', async () => {
        const user = userEvent.setup()

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('resets state when dialog is reopened', async () => {
        const user = userEvent.setup()
        const { rerender } = render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Select a group
        const checkbox = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        await user.click(checkbox)
        expect(checkbox).toBeChecked()

        // Close dialog
        rerender(
            <BulkShareWithGroupsDialog
                open={false}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        // Reopen dialog
        rerender(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Selection should be reset
        const checkboxAfterReopen = screen.getByRole('checkbox', { name: /Friday Movie Night/i })
        expect(checkboxAfterReopen).not.toBeChecked()
    })

    it('disables confirm button when no groups available', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(
                screen.getByText(/You are not a member of any groups yet/i)
            ).toBeInTheDocument()
        })

        const confirmButton = screen.getByText('Update Sharing')
        expect(confirmButton).toBeDisabled()
    })

    it('disables confirm button while loading groups', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        )

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            const loader = document.querySelector('.animate-spin')
            expect(loader).toBeInTheDocument()
        })

        const confirmButton = screen.getByText('Update Sharing')
        expect(confirmButton).toBeDisabled()
    })

    it('handles singular group count in "All my groups" label', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/\(1 group\)/i)).toBeInTheDocument()
        })
    })

    it('handles singular member count for groups', async () => {
        const singleMemberGroup: GroupBasicInfo[] = [
            { id: 1, name: 'Solo Viewer', memberCount: 1 }
        ]
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(singleMemberGroup)

        render(
            <BulkShareWithGroupsDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(/1 member/i)).toBeInTheDocument()
        })
    })
})
