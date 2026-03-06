import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReceivedInvitations } from '@/components/ReceivedInvitations'
import { invitationApi } from '@/lib/api'
import type { Invitation } from '@/types'
import { log } from '@/lib/logger'

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

// Mock the logger
jest.mock('@/lib/logger', () => ({
    log: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
    setCorrelationId: jest.fn(),
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

describe('ReceivedInvitations', () => {
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

        render(<ReceivedInvitations />)

        expect(screen.getByText(/loading invitations/i)).toBeInTheDocument()
    })

    it('should render invitations list when data is loaded', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<ReceivedInvitations />)

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

        render(<ReceivedInvitations />)

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

        render(<ReceivedInvitations />)

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

        render(<ReceivedInvitations />)

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

        render(<ReceivedInvitations />)

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
        (log.error as jest.Mock).mockClear();
        (invitationApi.getPendingInvitations as jest.Mock).mockRejectedValue(
            new Error('Failed to fetch')
        );

        render(<ReceivedInvitations />);

        await waitFor(() => {
            expect(log.error).toHaveBeenCalledWith(
                'Failed to fetch invitations',
                expect.any(Error)
            );
        });
    })

    it('should handle API error when responding to invitation', async () => {
        const user = userEvent.setup()
        const { toast } = require('@/lib/toast')
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)
        ;(invitationApi.respondToInvitation as jest.Mock).mockRejectedValue({
            message: 'This invitation has expired',
        })

        render(<ReceivedInvitations />)

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

    it('should display invitation count in group stats', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<ReceivedInvitations />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Should show member count
        expect(screen.getByText(/5 members/i)).toBeInTheDocument()
        expect(screen.getByText(/3 members/i)).toBeInTheDocument()
    })

    it('should format dates correctly', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(mockInvitations)

        render(<ReceivedInvitations />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        // Check if date formatting is present (date-fns uses different formats)
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

        render(<ReceivedInvitations />)

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

    it('should render invitation without description', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([mockInvitations[1]])

        render(<ReceivedInvitations />)

        await waitFor(() => {
            expect(screen.getByText('Cinema Club')).toBeInTheDocument()
        })

        // Should not crash when description is null
        expect(screen.queryByText('A group for movie enthusiasts')).not.toBeInTheDocument()
    })

    it('should display both Accept and Decline buttons with correct styling', async () => {
        ;(invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([mockInvitations[0]])

        render(<ReceivedInvitations />)

        await waitFor(() => {
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument()
        })

        const acceptButton = screen.getByRole('button', { name: /accept/i })
        const declineButton = screen.getByRole('button', { name: /decline/i })

        expect(acceptButton).toBeInTheDocument()
        expect(declineButton).toBeInTheDocument()

        // Decline button should have baseline styling
        expect(declineButton.className).toContain('border')
        expect(declineButton.className).toContain('hover:!border-orange-500')
        expect(declineButton.className).toContain('hover:scale-[1.02]')
    })
})
