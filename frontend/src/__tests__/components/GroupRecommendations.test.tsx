import { render, screen, waitFor } from '@/test-utils'
import { GroupRecommendations } from '@/components/GroupRecommendations'
import { groupApi } from '@/lib/api'
import userEvent from '@testing-library/user-event'
import type { GroupRecommendationStats } from '@/types'

// Mock the groupApi
jest.mock('@/lib/api', () => ({
    groupApi: {
        getRecommendationStats: jest.fn(),
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

describe('GroupRecommendations', () => {
    const mockStats: GroupRecommendationStats = {
        totalWatches: 50,
        uniqueMovies: 30,
        uniqueViewers: 5,
        mostWatchedGenre: 'Action',
        recommendations: [
            {
                id: 1,
                title: 'Inception',
                release_date: '2010-07-16',
                poster_path: '/path1.jpg',
                overview: 'A thief who steals corporate secrets...',
                vote_average: 8.8,
            },
            {
                id: 2,
                title: 'The Dark Knight',
                release_date: '2008-07-18',
                poster_path: '/path2.jpg',
                overview: 'Batman faces the Joker...',
                vote_average: 9.0,
            },
            {
                id: 3,
                title: 'Interstellar',
                release_date: '2014-11-07',
                poster_path: null,
                overview: null,
                vote_average: 8.6,
            },
        ],
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('displays loading state initially', () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockImplementation(
            () => new Promise(() => { }) // Never resolves
        )

        const { container } = render(<GroupRecommendations groupId={1} />)

        expect(screen.getByText('Group Stats')).toBeInTheDocument()
        expect(screen.getByText('Recommended Movies')).toBeInTheDocument()

        // Check for skeleton loading elements
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('fetches and displays recommendation stats', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Group Stats')).toBeInTheDocument()
            expect(screen.getByText('50')).toBeInTheDocument() // totalWatches
            expect(screen.getByText('30')).toBeInTheDocument() // uniqueMovies
            expect(screen.getByText('5')).toBeInTheDocument() // uniqueViewers
        })

        expect(groupApi.getRecommendationStats).toHaveBeenCalledWith(1)
    })

    it('displays error message on fetch failure', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(
                screen.getByText('Failed to load recommendations. Please try again.')
            ).toBeInTheDocument()
        })
    })

    it('shows retry button on error', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockRejectedValue(
            new Error('API Error')
        )

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
        })
    })

    it('retries fetching recommendations when retry button is clicked', async () => {
        const user = userEvent.setup()

            // First call fails
            ; (groupApi.getRecommendationStats as jest.Mock).mockRejectedValueOnce(
                new Error('API Error')
            )

        render(<GroupRecommendations groupId={1} />)

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText('Failed to load recommendations. Please try again.')).toBeInTheDocument()
        })

            // Second call succeeds
            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValueOnce(mockStats)

        const retryButton = screen.getByRole('button', { name: /try again/i })
        await user.click(retryButton)

        // Should show stats after retry
        await waitFor(() => {
            expect(screen.getByText('50')).toBeInTheDocument()
        })

        expect(groupApi.getRecommendationStats).toHaveBeenCalledTimes(2)
    })

    it('displays empty state when no watches', async () => {
        const emptyStats: GroupRecommendationStats = {
            totalWatches: 0,
            uniqueMovies: 0,
            uniqueViewers: 0,
            mostWatchedGenre: null,
            recommendations: [],
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(emptyStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('No recommendations yet')).toBeInTheDocument()
            expect(
                screen.getByText(/Start watching movies and sharing them with your group/i)
            ).toBeInTheDocument()
        })
    })

    it('displays all stat labels', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Total Watches')).toBeInTheDocument()
            expect(screen.getByText('Unique Movies')).toBeInTheDocument()
            expect(screen.getByText('Active Viewers')).toBeInTheDocument()
            expect(screen.getByText('Top Genre')).toBeInTheDocument()
        })
    })

    it('displays total watches stat', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('50')).toBeInTheDocument()
        })
    })

    it('displays unique movies stat', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('30')).toBeInTheDocument()
        })
    })

    it('displays unique viewers stat', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument()
        })
    })

    it('displays top genre when available', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Action')).toBeInTheDocument()
        })
    })

    it('does not display top genre when null', async () => {
        const statsWithoutGenre: GroupRecommendationStats = {
            ...mockStats,
            mostWatchedGenre: null,
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(statsWithoutGenre)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Total Watches')).toBeInTheDocument()
        })

        expect(screen.queryByText('Top Genre')).not.toBeInTheDocument()
    })

    it('displays recommended movies', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument()
            expect(screen.getByText('The Dark Knight')).toBeInTheDocument()
            expect(screen.getByText('Interstellar')).toBeInTheDocument()
        })
    })

    it('displays movie release years', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('2010')).toBeInTheDocument()
            expect(screen.getByText('2008')).toBeInTheDocument()
            expect(screen.getByText('2014')).toBeInTheDocument()
        })
    })

    it('displays movie ratings', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('8.8')).toBeInTheDocument()
            expect(screen.getByText('9.0')).toBeInTheDocument()
            expect(screen.getByText('8.6')).toBeInTheDocument()
        })
    })

    it('displays movie overviews when available', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText(/A thief who steals corporate secrets/i)).toBeInTheDocument()
            expect(screen.getByText(/Batman faces the Joker/i)).toBeInTheDocument()
        })
    })

    it('displays movie posters when available', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            const images = screen.getAllByRole('img')
            expect(images.length).toBeGreaterThan(0)
            expect(images[0]).toHaveAttribute('src', expect.stringContaining('/path1.jpg'))
        })
    })

    it('displays placeholder when poster is not available', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('No poster')).toBeInTheDocument()
        })
    })

    it('displays "N/A" for movies without ratings', async () => {
        const statsWithoutRating: GroupRecommendationStats = {
            ...mockStats,
            recommendations: [
                {
                    id: 4,
                    title: 'Unknown Movie',
                    release_date: '2020-01-01',
                    poster_path: null,
                    overview: 'A movie...',
                    vote_average: null,
                },
            ],
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(statsWithoutRating)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('N/A')).toBeInTheDocument()
        })
    })

    it('displays empty recommendations message when all movies watched', async () => {
        const statsWithNoRecommendations: GroupRecommendationStats = {
            totalWatches: 50,
            uniqueMovies: 30,
            uniqueViewers: 5,
            mostWatchedGenre: 'Action',
            recommendations: [],
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(statsWithNoRecommendations)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(
                screen.getByText('All popular movies have been watched by the group!')
            ).toBeInTheDocument()
        })

        // Should still show stats
        expect(screen.getByText('50')).toBeInTheDocument()
        expect(screen.getByText('30')).toBeInTheDocument()
    })

    it('renders correct number of recommendation cards', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument()
        })

        // Should render 3 movie cards
        expect(screen.getByText('Inception')).toBeInTheDocument()
        expect(screen.getByText('The Dark Knight')).toBeInTheDocument()
        expect(screen.getByText('Interstellar')).toBeInTheDocument()
    })

    it('displays recommendation cards in a grid layout', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        const { container } = render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument()
        })

        // Check for grid classes
        const grids = container.querySelectorAll('.grid')
        expect(grids.length).toBeGreaterThan(0)
    })

    it('refetches recommendations when groupId changes', async () => {
        ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(mockStats)

        const { rerender } = render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument()
        })

        expect(groupApi.getRecommendationStats).toHaveBeenCalledWith(1)

        // Change groupId
        rerender(<GroupRecommendations groupId={2} />)

        await waitFor(() => {
            expect(groupApi.getRecommendationStats).toHaveBeenCalledWith(2)
        })
    })

    it('handles movie without release date', async () => {
        const statsWithoutDate: GroupRecommendationStats = {
            ...mockStats,
            recommendations: [
                {
                    id: 5,
                    title: 'Mystery Movie',
                    release_date: null,
                    poster_path: null,
                    overview: 'A mysterious movie...',
                    vote_average: 7.5,
                },
            ],
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(statsWithoutDate)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('Mystery Movie')).toBeInTheDocument()
        })

        // Should still show rating
        expect(screen.getByText('7.5')).toBeInTheDocument()
    })

    it('formats rating to one decimal place', async () => {
        const statsWithPreciseRating: GroupRecommendationStats = {
            ...mockStats,
            recommendations: [
                {
                    id: 6,
                    title: 'Precise Movie',
                    release_date: '2020-01-01',
                    poster_path: null,
                    overview: 'A movie...',
                    vote_average: 8.456789,
                },
            ],
        }

            ; (groupApi.getRecommendationStats as jest.Mock).mockResolvedValue(statsWithPreciseRating)

        render(<GroupRecommendations groupId={1} />)

        await waitFor(() => {
            expect(screen.getByText('8.5')).toBeInTheDocument()
        })
    })
})