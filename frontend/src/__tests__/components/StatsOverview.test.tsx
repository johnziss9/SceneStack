import { render, screen } from '@/test-utils'
import { StatsOverview } from '@/components/stats/StatsOverview'
import type { UserStats } from '@/types/stats'

const baseStats: UserStats = {
    totalMovies: 42,
    totalWatches: 55,
    averageRating: 7.8,
    totalRewatches: 13,
    ratingsDistribution: [],
    watchesByYear: [],
    watchesByMonth: [],
    watchesByDecade: [],
    watchesByLocation: [],
    topRewatched: [],
}

describe('StatsOverview', () => {
    it('renders all four stat cards', () => {
        render(<StatsOverview stats={baseStats} />)

        expect(screen.getByText('Movies Watched')).toBeInTheDocument()
        expect(screen.getByText('Total Watches')).toBeInTheDocument()
        expect(screen.getByText('Average Rating')).toBeInTheDocument()
        expect(screen.getByText('Rewatches')).toBeInTheDocument()
    })

    it('displays correct values', () => {
        render(<StatsOverview stats={baseStats} />)

        expect(screen.getByText('42')).toBeInTheDocument()
        expect(screen.getByText('55')).toBeInTheDocument()
        expect(screen.getByText('7.8')).toBeInTheDocument()
        expect(screen.getByText('13')).toBeInTheDocument()
    })

    it('shows em dash for null average rating', () => {
        render(<StatsOverview stats={{ ...baseStats, averageRating: null }} />)

        expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('formats average rating to one decimal place', () => {
        render(<StatsOverview stats={{ ...baseStats, averageRating: 8 }} />)

        expect(screen.getByText('8.0')).toBeInTheDocument()
    })

    it('renders card descriptions', () => {
        render(<StatsOverview stats={baseStats} />)

        expect(screen.getByText('unique titles')).toBeInTheDocument()
        expect(screen.getByText('including rewatches')).toBeInTheDocument()
        expect(screen.getByText('out of 10')).toBeInTheDocument()
        expect(screen.getByText('films watched again')).toBeInTheDocument()
    })

    it('renders zero values correctly', () => {
        render(<StatsOverview stats={{ ...baseStats, totalMovies: 0, totalWatches: 0, totalRewatches: 0 }} />)

        // Should render 0s (multiple elements may have '0')
        const zeros = screen.getAllByText('0')
        expect(zeros.length).toBeGreaterThanOrEqual(3)
    })
})
