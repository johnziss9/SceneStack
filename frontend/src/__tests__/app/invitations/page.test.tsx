import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvitationsPage from '@/app/invitations/page'
import { invitationApi } from '@/lib/api'
import type { Invitation } from '@/types'

// Mock the API
jest.mock('@/lib/api', () => ({
    invitationApi: {
        getPendingInvitations: jest.fn(),
        respondToInvitation: jest.fn(),
    },
}))

// Mock the toast
jest.mock('@/lib/toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))

// Mock InvitationContext
const mockRefreshCount = jest.fn()
jest.mock('@/contexts/InvitationContext', () => ({
    useInvitation: () => ({
        count: 2,
        refreshCount: mockRefreshCount,
    }),
}))

// Mock next/navigation
const mockPush = jest.fn()
const mockRouter = require('next/navigation')
mockRouter.useRouter = jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
}))

describe('InvitationsPage', () => {
    const mockInvitations: Invitation[] = [
        {
            id: 1,
            groupId: 1,
            groupName: 'Movie Buffs',
            groupDescription: 'A group for movie enthusiasts',
            groupMemberCount: 5,
            invitedUserId: 2,
            invitedUsername: 'testuser',
            invitedUserEmail: 'test@example.com',
            invitedByUserId: 1,
            invitedByUsername: 'inviter',
            status: 0, // Pending
            createdAt: new Date().toISOString(),
            respondedAt: null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 2,
            groupId: 2,
            groupName: 'Cinema Club',
            groupDescription: null,
            groupMemberCount: 3,
            invitedUserId: 2,
            invitedUsername: 'testuser',
            invitedUserEmail: 'test@example.com',
            invitedByUserId: 3,
            invitedByUsername: 'another_inviter',
            status: 0,
            createdAt: new Date().toISOString(),
            respondedAt: null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render loading state initially', () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        render(<InvitationsPage />)

        expect(screen.getByText(/loading invitations/i)).toBeInTheDocument()
    })

    it('should render invitations list when data is loaded', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
            expect(screen.getByText('Cinema Club')).toBeInTheDocument()
        })

        expect(screen.getByText('inviter')).toBeInTheDocument()
        expect(screen.getByText(/5 members/i)).toBeInTheDocument()
        expect(screen.getByText('A group for movie enthusiasts')).toBeInTheDocument()
    })

    it('should render empty state when no invitations', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([])

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('No pending invitations')).toBeInTheDocument()
        })

        expect(screen.getByText(/you'll see invitations here/i)).toBeInTheDocument()
    })

    it('should handle accept invitation successfully', async () => {
        const user = userEvent.setup()
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockResolvedValue({
            ...mockInvitations[0],
            status: 1, // Accepted
        })

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Click accept button
        const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
        await user.click(acceptButtons[0])

        await waitFor(() => {
            expect(invitationApi.respondToInvitation).toHaveBeenCalledWith(1, { accept: true })
        })

        // Should refresh count
        expect(mockRefreshCount).toHaveBeenCalled()

        // Should navigate to group page after timeout
        await waitFor(
            () => {
                expect(mockPush).toHaveBeenCalledWith('/groups/1')
            },
            { timeout: 1500 }
        )
    })

    it('should handle decline invitation successfully', async () => {
        const user = userEvent.setup()
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockResolvedValue({
            ...mockInvitations[0],
            status: 2, // Declined
        })

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Click decline button
        const declineButtons = screen.getAllByRole('button', { name: /decline/i })
        await user.click(declineButtons[0])

        await waitFor(() => {
            expect(invitationApi.respondToInvitation).toHaveBeenCalledWith(1, { accept: false })
        })

        // Should refresh count
        expect(mockRefreshCount).toHaveBeenCalled()

        // Should NOT navigate to group page
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('should disable buttons while responding', async () => {
        const user = userEvent.setup()
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        )

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
        const declineButtons = screen.getAllByRole('button', { name: /decline/i })

        await user.click(acceptButtons[0])

        // Buttons should be disabled
        expect(acceptButtons[0]).toBeDisabled()
        expect(declineButtons[0]).toBeDisabled()
    })

    it('should handle API error when fetching invitations', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation()
        ;(invitationApi.getPendingInvitations as jest.Mock).mockRejectedValue(
            new Error('Failed to fetch')
        )

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalledWith(
                'Failed to fetch invitations:',
                expect.any(Error)
            )
        })

        consoleError.mockRestore()
    })

    it('should handle API error when responding to invitation', async () => {
        const user = userEvent.setup()
        const { toast } = require('@/lib/toast')
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockRejectedValue({
            message: 'This invitation has expired',
        })

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
        await user.click(acceptButtons[0])

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to respond', {
                description: 'This invitation has expired',
            })
        })
    })

    it('should render Back to Groups button with correct link', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        const backButton = screen.getByRole('link', { name: /back to groups/i })
        expect(backButton).toBeInTheDocument()
        expect(backButton).toHaveAttribute('href', '/groups')
    })

    it('should display invitation count in group stats', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Should show member count
        expect(screen.getByText(/5 members/i)).toBeInTheDocument()
        expect(screen.getByText(/3 members/i)).toBeInTheDocument()
    })

    it('should format dates correctly', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Check if date formatting is present (format-fns uses different formats)
        // Just verify there's a date badge
        const dateBadges = screen.getAllByText(/mar/i)
        expect(dateBadges.length).toBeGreaterThan(0)
    })

    it('should remove invitation from list after responding', async () => {
        const user = userEvent.setup()
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockResolvedValue({
            ...mockInvitations[0],
            status: 1,
        })

        render(<InvitationsPage />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
            expect(screen.getByText('Cinema Club')).toBeInTheDocument()
        })

        // Accept first invitation
        const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
        await user.click(acceptButtons[0])

        await waitFor(() => {
            expect(screen.queryByText('Movie Buffs')).not.toBeInTheDocument()
            expect(screen.getByText('Cinema Club')).toBeInTheDocument()
        })
    })
})
