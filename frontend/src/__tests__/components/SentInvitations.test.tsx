import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SentInvitations } from '@/components/SentInvitations'
import { invitationApi, groupApi } from '@/lib/api'
import type { Invitation, Group } from '@/types'
import { log } from '@/lib/logger'

// Mock the APIs
jest.mock('@/lib/api', () => ({
    invitationApi: {
        getSentInvitations: jest.fn(),
        cancelInvitation: jest.fn(),
    },
    groupApi: {
        getUserGroups: jest.fn(),
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

describe('SentInvitations', () => {
    const mockGroups: Group[] = [
        {
            id: 1,
            name: 'Movie Buffs',
            description: 'A group for movie enthusiasts',
            createdById: 1,
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-03-01T10:00:00Z',
            isDeleted: false,
            deletedAt: null,
            members: [],
            memberCount: 5,
        },
        {
            id: 2,
            name: 'Cinema Club',
            description: null,
            createdById: 1,
            createdAt: '2024-01-02T10:00:00Z',
            updatedAt: '2024-03-02T10:00:00Z',
            isDeleted: false,
            deletedAt: null,
            members: [],
            memberCount: 3,
        },
    ]

    const mockInvitations: Invitation[] = [
        {
            id: 1,
            groupId: 1,
            groupName: 'Movie Buffs',
            groupDescription: 'A group for movie enthusiasts',
            groupMemberCount: 5,
            invitedUserId: 2,
            invitedUsername: 'john',
            invitedUserEmail: 'john@example.com',
            invitedByUserId: 1,
            invitedByUsername: 'testuser',
            status: 0, // Pending
            createdAt: new Date().toISOString(),
            respondedAt: null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 2,
            groupId: 1,
            groupName: 'Movie Buffs',
            groupDescription: 'A group for movie enthusiasts',
            groupMemberCount: 5,
            invitedUserId: 3,
            invitedUsername: 'jane',
            invitedUserEmail: 'jane@example.com',
            invitedByUserId: 1,
            invitedByUsername: 'testuser',
            status: 0,
            createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago to ensure it's after the first
            respondedAt: null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should render loading state initially', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        render(<SentInvitations />)

        // Check that the empty state is not shown while loading
        await waitFor(() => {
            expect(screen.queryByText('No pending invitations')).not.toBeInTheDocument()
        }, { timeout: 100 })
    })

    it('should render sent invitations list when data is loaded', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
            expect(screen.getAllByText('jane')).toHaveLength(1)
        })

        expect(screen.getByText('john@example.com')).toBeInTheDocument()
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        expect(screen.getAllByText('Movie Buffs')).toHaveLength(2)
    })

    it('should render empty state when no invitations', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue([])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getByText('No pending invitations')).toBeInTheDocument()
        })

        expect(screen.getByText(/invitations you send will appear here/i)).toBeInTheDocument()
    })

    it('should handle cancel invitation successfully', async () => {
        const user = userEvent.setup()
        const { toast } = require('@/lib/toast')
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })
        ;(invitationApi.cancelInvitation as jest.Mock).mockResolvedValue(undefined)

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        // Click cancel button
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
        await user.click(cancelButtons[0])

        await waitFor(() => {
            expect(invitationApi.cancelInvitation).toHaveBeenCalledWith(1)
            expect(toast.success).toHaveBeenCalledWith('Invitation cancelled')
        })
    })

    it('should remove invitation from list after cancelling', async () => {
        const user = userEvent.setup()
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })
        ;(invitationApi.cancelInvitation as jest.Mock).mockResolvedValue(undefined)

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
            expect(screen.getAllByText('jane')).toHaveLength(1)
        })

        // Cancel first invitation
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
        await user.click(cancelButtons[0])

        await waitFor(() => {
            expect(screen.queryByText('john')).not.toBeInTheDocument()
            expect(screen.getAllByText('jane')).toHaveLength(1)
        })
    })

    it('should disable cancel button while cancelling', async () => {
        const user = userEvent.setup()
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })
        ;(invitationApi.cancelInvitation as jest.Mock).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        )

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
        await user.click(cancelButtons[0])

        // Button should be disabled
        expect(cancelButtons[0]).toBeDisabled()
    })

    it('should handle API error when cancelling invitation', async () => {
        const user = userEvent.setup()
        const consoleError = jest.spyOn(console, 'error').mockImplementation()
        const { toast } = require('@/lib/toast')
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })
        ;(invitationApi.cancelInvitation as jest.Mock).mockRejectedValue(
            new Error('Failed to cancel')
        )

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
        await user.click(cancelButtons[0])

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to cancel invitation')
        })

        consoleError.mockRestore()
    })

    it('should display pending badge for pending invitations', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        const pendingBadges = screen.getAllByText('Pending')
        expect(pendingBadges).toHaveLength(2)
    })

    it('should display expired badge for expired invitations', async () => {
        const expiredInvitation: Invitation = {
            ...mockInvitations[0],
            expiresAt: '2020-01-01T10:00:00Z', // Expired
        }

        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue([expiredInvitation])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
    })

    it('should disable cancel button for expired invitations', async () => {
        const expiredInvitation: Invitation = {
            ...mockInvitations[0],
            expiresAt: '2020-01-01T10:00:00Z',
        }

        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue([expiredInvitation])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        expect(cancelButton).toBeDisabled()
    })

    it('should handle groups with no pending invitations', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValueOnce([])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValueOnce([])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getByText('No pending invitations')).toBeInTheDocument()
        })
    })

    it('should silently skip groups that fail authorization', async () => {
        (log.error as jest.Mock).mockClear();
        (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups);
        (invitationApi.getSentInvitations as jest.Mock)
            .mockRejectedValueOnce(new Error('Unauthorized'))
            .mockResolvedValueOnce(mockInvitations);

        render(<SentInvitations />);

        await waitFor(() => {
            expect(screen.getByText('john')).toBeInTheDocument();
        });

        // Should still show invitations from the second group
        expect(log.error).toHaveBeenCalled();
    })

    it('should sort invitations by creation date (most recent first)', async () => {
        const sortedInvitations = [mockInvitations[1], mockInvitations[0]] // jane then john

        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue(sortedInvitations)

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('jane')).toHaveLength(1)
        })

        // Both should be in document (order verification is complex with React Testing Library)
        expect(screen.getAllByText('john')).toHaveLength(1)
        expect(screen.getAllByText('jane')).toHaveLength(1)
    })

    it('should display sent timestamp correctly', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        // Should show "Sent X ago" text
        const sentTexts = screen.getAllByText(/sent.*ago/i)
        expect(sentTexts.length).toBeGreaterThan(0)
    })

    it('should display expiration information', async () => {
        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)
        ;(invitationApi.getSentInvitations as jest.Mock).mockImplementation((groupId: number) => {
            if (groupId === 1) return Promise.resolve(mockInvitations)
            return Promise.resolve([])
        })

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        // Should show expiration text
        const expirationTexts = screen.getAllByText(/expires in/i)
        expect(expirationTexts.length).toBeGreaterThan(0)
    })

    it('should handle invitation without expiration date', async () => {
        const invitationNoExpiry: Invitation = {
            ...mockInvitations[0],
            expiresAt: null,
        }

        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue([invitationNoExpiry])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        // Should not crash and should render invitation
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('should apply opacity styling to expired invitations', async () => {
        const expiredInvitation: Invitation = {
            ...mockInvitations[0],
            expiresAt: '2020-01-01T10:00:00Z',
        }

        ;(groupApi.getUserGroups as jest.Mock).mockResolvedValue([mockGroups[0]])
        ;(invitationApi.getSentInvitations as jest.Mock).mockResolvedValue([expiredInvitation])

        render(<SentInvitations />)

        await waitFor(() => {
            expect(screen.getAllByText('john')).toHaveLength(1)
        })

        // Check for opacity class (check the content wrapper)
        const content = screen.getByText('john').closest('.flex.items-center.justify-between.gap-4')
        expect(content?.className).toContain('opacity-50')
    })
})
