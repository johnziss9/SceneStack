import { render, screen, waitFor } from '@/test-utils'
import { BulkMakePrivateDialog } from '@/components/BulkMakePrivateDialog'
import userEvent from '@testing-library/user-event'

describe('BulkMakePrivateDialog', () => {
    const mockOnOpenChange = jest.fn()
    const mockOnConfirm = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('does not render when open is false', () => {
        render(
            <BulkMakePrivateDialog
                open={false}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.queryByText('Make Movies Private')).not.toBeInTheDocument()
    })

    it('renders when open is true', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText('Make Movies Private')).toBeInTheDocument()
    })

    it('displays correct count with plural form', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText(/You are about to make 5 movies private/i)).toBeInTheDocument()
    })

    it('displays correct count with singular form', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={1}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText(/You are about to make 1 movie private/i)).toBeInTheDocument()
    })

    it('displays all warning messages', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText('This will:')).toBeInTheDocument()
        expect(screen.getByText('Mark all selected movies as private')).toBeInTheDocument()
        expect(screen.getByText('Remove them from all group sharing')).toBeInTheDocument()
        expect(screen.getByText('Hide them from group feeds')).toBeInTheDocument()
    })

    it('displays reassurance message', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(
            screen.getByText('You can always share these movies with groups again later.')
        ).toBeInTheDocument()
    })

    it('displays cancel button', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('displays confirm button', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText('Make Private')).toBeInTheDocument()
    })

    it('calls onOpenChange with false when cancel button is clicked', async () => {
        const user = userEvent.setup()

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('calls onConfirm when confirm button is clicked', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(1)
        })
    })

    it('closes dialog after successful confirmation', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockResolvedValue(undefined)

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
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
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(confirmButton).toBeDisabled()
            expect(screen.getByText('Cancel')).toBeDisabled()
        })

        // Cleanup
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
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
        await user.click(confirmButton)

        await waitFor(() => {
            // Check for the Loader2 icon by checking if the button contains an svg with animate-spin class
            const button = screen.getByText('Make Private')
            const svg = button.querySelector('svg.animate-spin')
            expect(svg).toBeInTheDocument()
        })

        // Cleanup
        resolveConfirm!()
    })

    it('keeps dialog open when onConfirm fails', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockRejectedValue(new Error('API Error'))

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(1)
        })

        // Wait for the finally block to complete (buttons re-enabled)
        await waitFor(() => {
            expect(confirmButton).not.toBeDisabled()
            expect(screen.getByText('Cancel')).not.toBeDisabled()
        })

        // Dialog should still be visible (onOpenChange not called with false due to error)
        expect(screen.getByText('Make Movies Private')).toBeInTheDocument()

        // onOpenChange should not have been called because of the error
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('re-enables buttons after error', async () => {
        const user = userEvent.setup()
        mockOnConfirm.mockRejectedValue(new Error('API Error'))

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(1)
        })

        // Buttons should be re-enabled after error
        await waitFor(() => {
            expect(confirmButton).not.toBeDisabled()
            expect(screen.getByText('Cancel')).not.toBeDisabled()
        })
    })

    it('handles zero selected count', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={0}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText(/You are about to make 0 movies private/i)).toBeInTheDocument()
    })

    it('handles large selected count', () => {
        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={100}
                onConfirm={mockOnConfirm}
            />
        )

        expect(screen.getByText(/You are about to make 100 movies private/i)).toBeInTheDocument()
    })

    it('can be clicked multiple times after re-enabling', async () => {
        const user = userEvent.setup()
        mockOnConfirm
            .mockRejectedValueOnce(new Error('API Error'))
            .mockResolvedValueOnce(undefined)

        render(
            <BulkMakePrivateDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                selectedCount={5}
                onConfirm={mockOnConfirm}
            />
        )

        const confirmButton = screen.getByText('Make Private')

        // First click - fails
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(1)
        })

        await waitFor(() => {
            expect(confirmButton).not.toBeDisabled()
        })

        // Second click - succeeds
        await user.click(confirmButton)

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledTimes(2)
            expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        })
    })
})
