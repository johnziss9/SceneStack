import { render, screen, waitFor } from '@/test-utils'
import { GroupList } from '@/components/GroupList'
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

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
    console.error = jest.fn()
})
afterAll(() => {
    console.error = originalError
})

describe('GroupList', () => {
    const mockGroups: GroupBasicInfo[] = [
        {
            id: 1,
            name: 'Friday Movie Night',
            memberCount: 5,
        },
        {
            id: 2,
            name: 'Horror Fans',
            memberCount: 3,
        },
        {
            id: 3,
            name: 'Classic Cinema',
            memberCount: 1,
        },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('displays loading state initially', () => {
        ; (groupApi.getUserGroups as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<GroupList />)

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays groups', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Horror Fans')).toBeInTheDocument()
            expect(screen.getByText('Classic Cinema')).toBeInTheDocument()
        })

        expect(groupApi.getUserGroups).toHaveBeenCalledTimes(1)
    })

    it('displays error message on fetch failure', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupList />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load groups. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('shows retry button on error', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('retries fetching groups when retry button is clicked', async () => {
        const user = userEvent.setup()

            // First call fails
            ; (groupApi.getUserGroups as jest.Mock).mockRejectedValueOnce(
                new Error('API Error')
            )

        render(<GroupList />)

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to load groups. Please try again.')).toBeInTheDocument()
        })

            // Second call succeeds
            ; (groupApi.getUserGroups as jest.Mock).mockResolvedValueOnce(mockGroups)

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show groups after retry
        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        expect(groupApi.getUserGroups).toHaveBeenCalledTimes(2)
    })

    it('displays empty state when no groups', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('No groups yet')).toBeInTheDocument()
            expect(
                screen.getByText('Create a group to share your movie watches with friends')
            ).toBeInTheDocument()
        })
    })

    it('shows create group link in empty state', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue([])

        render(<GroupList />)

        await waitFor(() => {
            const createLinks = screen.getAllByRole('link', { name: /create group/i })
            expect(createLinks.length).toBeGreaterThan(0)
            expect(createLinks[0]).toHaveAttribute('href', '/groups/create')
        })
    })

    it('displays create group button when groups exist', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const createLink = screen.getByRole('link', { name: /create group/i })
        expect(createLink).toBeInTheDocument()
        expect(createLink).toHaveAttribute('href', '/groups/create')
    })

    it('displays member count for each group', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('5 members')).toBeInTheDocument()
            expect(screen.getByText('3 members')).toBeInTheDocument()
        })
    })

    it('displays singular "member" for group with one member', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('1 member')).toBeInTheDocument()
        })
    })

    it('displays plural "members" for groups with multiple members', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('5 members')).toBeInTheDocument()
            expect(screen.getByText('3 members')).toBeInTheDocument()
        })
    })

    it('renders groups as clickable links', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const groupLinks = screen.getAllByRole('link').filter(link =>
            link.getAttribute('href')?.startsWith('/groups/') &&
            link.getAttribute('href') !== '/groups/create'
        )

        expect(groupLinks.length).toBe(3)
        expect(groupLinks[0]).toHaveAttribute('href', '/groups/1')
        expect(groupLinks[1]).toHaveAttribute('href', '/groups/2')
        expect(groupLinks[2]).toHaveAttribute('href', '/groups/3')
    })

    it('displays groups in a grid layout', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        const { container } = render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Check for grid classes
        const grid = container.querySelector('.grid')
        expect(grid).toBeInTheDocument()
        expect(grid).toHaveClass('grid-cols-1')
    })

    it('renders correct number of group cards', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Should render 3 group cards (excluding create button)
        const groupLinks = screen.getAllByRole('link').filter(link =>
            link.getAttribute('href')?.startsWith('/groups/') &&
            link.getAttribute('href') !== '/groups/create'
        )
        expect(groupLinks).toHaveLength(3)
    })

    it('calls getUserGroups on component mount', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(groupApi.getUserGroups).toHaveBeenCalledTimes(1)
        })
    })

    it('handles single group correctly', async () => {
        const singleGroup: GroupBasicInfo[] = [mockGroups[0]]

            ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(singleGroup)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        // Should only render one group card
        const groupLinks = screen.getAllByRole('link').filter(link =>
            link.getAttribute('href')?.startsWith('/groups/') &&
            link.getAttribute('href') !== '/groups/create'
        )
        expect(groupLinks).toHaveLength(1)
    })

    it('handles many groups correctly', async () => {
        const manyGroups: GroupBasicInfo[] = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Group ${i + 1}`,
            memberCount: i + 1,
        }))

            ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(manyGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Group 1')).toBeInTheDocument()
        })

        // Should render all 10 group cards
        const groupLinks = screen.getAllByRole('link').filter(link =>
            link.getAttribute('href')?.startsWith('/groups/') &&
            link.getAttribute('href') !== '/groups/create'
        )
        expect(groupLinks).toHaveLength(10)
    })

    it('displays group names correctly', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
            expect(screen.getByText('Horror Fans')).toBeInTheDocument()
            expect(screen.getByText('Classic Cinema')).toBeInTheDocument()
        })
    })

    it('handles group with zero members', async () => {
        const groupWithZeroMembers: GroupBasicInfo[] = [
            {
                id: 1,
                name: 'Empty Group',
                memberCount: 0,
            },
        ]

            ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(groupWithZeroMembers)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Empty Group')).toBeInTheDocument()
            expect(screen.getByText('0 members')).toBeInTheDocument()
        })
    })

    it('applies hover styles to group cards', async () => {
        ; (groupApi.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

        render(<GroupList />)

        await waitFor(() => {
            expect(screen.getByText('Friday Movie Night')).toBeInTheDocument()
        })

        const groupLinks = screen.getAllByRole('link').filter(link =>
            link.getAttribute('href')?.startsWith('/groups/') &&
            link.getAttribute('href') !== '/groups/create'
        )

        // Check that hover styles are present
        expect(groupLinks[0]).toHaveClass('hover:border-primary')
    })
})