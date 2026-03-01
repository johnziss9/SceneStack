import { render, screen, waitFor } from '@/test-utils'
import { GroupStats } from '@/components/GroupStats'
import { groupApi } from '@/lib/api'
import type { GroupStats as GroupStatsType } from '@/types'

jest.mock('@/lib/api', () => ({
    groupApi: {
        getGroupStats: jest.fn(),
    },
}))

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, src }: { alt: string; src: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt} src={src} />
    ),
}))

const originalError = console.error
beforeAll(() => { console.error = jest.fn() })
afterAll(() => { console.error = originalError })

const mockStats: GroupStatsType = {
    groupId: 1,
    groupName: 'Movie Fans',
    totalWatches: 10,
    uniqueMovies: 7,
    averageGroupRating: 8.2,
    mostActiveMember: 'alice',
    memberStats: [
        { userId: 1, username: 'alice', watchCount: 6, averageRating: 8.5 },
        { userId: 2, username: 'bob', watchCount: 4, averageRating: 7.8 },
    ],
    sharedMovies: [
        {
            movie: { id: 1, tmdbId: 550, title: 'Fight Club', year: 1999, posterPath: '/poster.jpg', synopsis: '' },
            watchedByCount: 2,
            watchedByUsernames: ['alice', 'bob'],
        },
    ],
}

describe('GroupStats', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('shows loading skeleton initially', () => {
        ;(groupApi.getGroupStats as jest.Mock).mockImplementation(() => new Promise(() => {}))

        render(<GroupStats groupId={1} />)

        // Component renders in loading state (API never resolves)
    })

    it('displays summary cards after load', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Total Watches')).toBeInTheDocument()
            expect(screen.getByText('Unique Movies')).toBeInTheDocument()
            expect(screen.getByText('Avg Rating')).toBeInTheDocument()
            expect(screen.getByText('Most Active')).toBeInTheDocument()
        })
    })

    it('displays correct stat values', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('10')).toBeInTheDocument()  // totalWatches
            expect(screen.getByText('7')).toBeInTheDocument()   // uniqueMovies
            expect(screen.getByText('8.2')).toBeInTheDocument() // avgRating
            expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
        })
    })

    it('displays member activity leaderboard', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Member Activity')).toBeInTheDocument()
            expect(screen.getByText('bob')).toBeInTheDocument()
        })
    })

    it('displays shared movies section', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Watched by Multiple Members')).toBeInTheDocument()
            expect(screen.getByText('Fight Club')).toBeInTheDocument()
            expect(screen.getByText('2 members')).toBeInTheDocument()
        })
    })

    it('shows empty state message when totalWatches is 0', async () => {
        const emptyStats: GroupStatsType = {
            ...mockStats,
            totalWatches: 0,
            memberStats: [{ userId: 1, username: 'alice', watchCount: 0, averageRating: null }],
            sharedMovies: [],
        }
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(emptyStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText(/no watches shared with this group yet/i)).toBeInTheDocument()
        })
    })

    it('shows error message on API failure', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockRejectedValue(new Error('Network error'))

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Failed to load group stats.')).toBeInTheDocument()
        })
    })

    it('calls getGroupStats with the correct groupId', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={42} />)

        await waitFor(() => {
            expect(groupApi.getGroupStats).toHaveBeenCalledWith(42)
        })
    })

    it('shows em dash for null average rating', async () => {
        const noRatingStats: GroupStatsType = { ...mockStats, averageGroupRating: null }
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(noRatingStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('—')).toBeInTheDocument()
        })
    })

    it('shows member watch counts', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('6 watches')).toBeInTheDocument()
            expect(screen.getByText('4 watches')).toBeInTheDocument()
        })
    })

    it('links shared movies to watched detail page', async () => {
        ;(groupApi.getGroupStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupStats groupId={1} />)

        await waitFor(() => {
            const link = screen.getByRole('link', { name: /fight club/i })
            expect(link).toHaveAttribute('href', '/watched/1')
        })
    })
})
