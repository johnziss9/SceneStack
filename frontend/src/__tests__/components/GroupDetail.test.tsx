import { render, screen, waitFor } from '@/test-utils'
import { GroupDetail } from '@/components/GroupDetail'
import { groupApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import userEvent from '@testing-library/user-event'
import type { Group } from '@/types'
import { GroupRole } from '@/types'

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getGroup: jest.fn(),
        deleteGroup: jest.fn(),
        removeMember: jest.fn(),
    },
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext')

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
    console.error = jest.fn()
})
afterAll(() => {
    console.error = originalError
})

describe('GroupDetail', () => {
    const mockPush = jest.fn()

    const mockGroup: Group = {
        id: 1,
        name: 'Friday Movie Night',
        description: 'Weekly movie watching group',
        createdById: 1,
        createdBy: {
            userId: 1,
            username: 'johndoe',
            email: 'john@example.com',
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        members: [
            {
                userId: 1,
                username: 'johndoe',
                email: 'john@example.com',
                role: GroupRole.Creator,
                joinedAt: '2024-01-15T10:00:00Z',
            },
            {
                userId: 2,
                username: 'janedoe',
                email: 'jane@example.com',
                role: GroupRole.Admin,
                joinedAt: '2024-01-16T10:00:00Z',
            },
            {
                userId: 3,
                username: 'bobsmith',
                email: 'bob@example.com',
                role: GroupRole.Member,
                joinedAt: '2024-01-17T10:00:00Z',
            },
        ],
    }

    beforeEach(() => {
        jest.clearAllMocks()

        mockUseRouter.mockReturnValue({
            push: mockPush,
        } as any)

        // Mock authenticated user as creator
        mockUseAuth.mockReturnValue({
            user: { id: 1, username: 'johndoe', email: 'john@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })
    })

    it('displays loading state initially', () => {
        ; (groupApi.getGroup as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<GroupDetail groupId={1} />)

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays group details', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Weekly movie watching group')).toBeInTheDocument()
        })

        expect(groupApi.getGroup).toHaveBeenCalledWith(1)
    })

    it('displays error message on fetch failure', async () => {
        ; (groupApi.getGroup as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load group. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('displays creator information', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Created by:')).toBeInTheDocument()
            expect(screen.getAllByText('johndoe').length).toBeGreaterThan(0)
        })
    })

    it('displays creation date', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Created:')).toBeInTheDocument()
            expect(screen.getByText('15 Jan 2024')).toBeInTheDocument()
        })
    })

    it('displays all group members', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getAllByText('johndoe').length).toBeGreaterThan(0)
            expect(screen.getByText('janedoe')).toBeInTheDocument()
            expect(screen.getByText('bobsmith')).toBeInTheDocument()
        })
    })

    it('displays member count', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Members (3)')).toBeInTheDocument()
        })
    })

    it('displays role badges for each member', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Creator')).toBeInTheDocument()
            expect(screen.getByText('Admin')).toBeInTheDocument()
            expect(screen.getByText('Member')).toBeInTheDocument()
        })
    })

    it('displays member email addresses', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('john@example.com')).toBeInTheDocument()
            expect(screen.getByText('jane@example.com')).toBeInTheDocument()
            expect(screen.getByText('bob@example.com')).toBeInTheDocument()
        })
    })

    it('displays member join dates', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            const joinedTexts = screen.getAllByText(/Joined/i)
            expect(joinedTexts.length).toBeGreaterThan(0)
        })
    })

    it('shows edit button for creator', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Edit Group')).toBeInTheDocument()
        })
    })

    it('shows delete button for creator', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Delete')).toBeInTheDocument()
        })
    })

    it('shows edit button for admin', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 2, username: 'janedoe', email: 'jane@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Edit Group')).toBeInTheDocument()
        })
    })

    it('does not show delete button for admin', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 2, username: 'janedoe', email: 'jane@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('does not show edit or delete buttons for regular member', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 3, username: 'bobsmith', email: 'bob@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        expect(screen.queryByText('Edit Group')).not.toBeInTheDocument()
        expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('shows add member button for creator', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Add Member')).toBeInTheDocument()
        })
    })

    it('shows add member button for admin', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 2, username: 'janedoe', email: 'jane@example.com' },
            loading: false,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
        })

            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Add Member')).toBeInTheDocument()
        })
    })

    it('navigates to edit page when edit button is clicked', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const editButton = screen.getByText('Edit Group')
        await user.click(editButton)

        expect(mockPush).toHaveBeenCalledWith('/groups/1/edit')
    })

    it('navigates to add member page when add member button is clicked', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const addMemberButton = screen.getByText('Add Member')
        await user.click(addMemberButton)

        expect(mockPush).toHaveBeenCalledWith('/groups/1/add-member')
    })

    it('opens delete dialog when delete button is clicked', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete')
        await user.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete Group')).toBeInTheDocument()
            expect(screen.getByText('Are you sure you want to delete this group?')).toBeInTheDocument()
        })
    })

    it('deletes group and navigates to groups page on confirm', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)
            ; (groupApi.deleteGroup as jest.Mock).mockResolvedValue({})

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByText('Delete')
        await user.click(deleteButtons[0])

        await waitFor(() => {
            expect(screen.getByText('Delete Group')).toBeInTheDocument()
        })

        const allDeleteButtons = screen.getAllByText('Delete')
        const confirmButton = allDeleteButtons[allDeleteButtons.length - 1]
        await user.click(confirmButton)

        await waitFor(() => {
            expect(groupApi.deleteGroup).toHaveBeenCalledWith(1)
            expect(mockPush).toHaveBeenCalledWith('/groups')
        })
    })

    it('closes delete dialog on cancel', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const deleteButton = screen.getByText('Delete')
        await user.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete Group')).toBeInTheDocument()
        })

        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)

        await waitFor(() => {
            expect(screen.queryByText('Delete Group')).not.toBeInTheDocument()
        })
    })

    it('shows remove button for members (not creator)', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const removeButtons = screen.getAllByText('Remove')
        expect(removeButtons.length).toBe(2)
    })

    it('does not show remove button for creator', async () => {
        ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const removeButtons = screen.getAllByText('Remove')
        expect(removeButtons.length).toBe(2)
    })

    it('opens remove member dialog when remove button is clicked', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const removeButtons = screen.getAllByText('Remove')
        await user.click(removeButtons[0])

        await waitFor(() => {
            expect(screen.getByText('Remove Member')).toBeInTheDocument()
            expect(screen.getByText('Are you sure you want to remove this member from the group?')).toBeInTheDocument()
        })
    })

    it('removes member and refreshes group on confirm', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)
            ; (groupApi.removeMember as jest.Mock).mockResolvedValue({})

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const removeButtons = screen.getAllByText('Remove')
        await user.click(removeButtons[0])

        await waitFor(() => {
            expect(screen.getByText('Remove Member')).toBeInTheDocument()
        })

        const allRemoveButtons = screen.getAllByText('Remove')
        const confirmButton = allRemoveButtons[allRemoveButtons.length - 1]
        await user.click(confirmButton)

        await waitFor(() => {
            expect(groupApi.removeMember).toHaveBeenCalledWith(1, expect.any(Number))
            expect(groupApi.getGroup).toHaveBeenCalledTimes(2)
        })
    })

    it('navigates back to groups when back button is clicked', async () => {
        const user = userEvent.setup()
            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(mockGroup)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const backButton = screen.getByText('Back to Groups')
        await user.click(backButton)

        expect(mockPush).toHaveBeenCalledWith('/groups')
    })

    it('handles group without description', async () => {
        const groupWithoutDescription: Group = {
            ...mockGroup,
            description: undefined,
        }

            ; (groupApi.getGroup as jest.Mock).mockResolvedValue(groupWithoutDescription)

        render(<GroupDetail groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        expect(screen.queryByText('Weekly movie watching group')).not.toBeInTheDocument()
    })
})