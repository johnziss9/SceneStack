import { render, screen } from '@/test-utils'
import { RatingsHistogram } from '@/components/stats/RatingsHistogram'
import type { RatingDistributionItem } from '@/types/stats'

// Recharts uses ResizeObserver and SVG which don't work well in jsdom
jest.mock('recharts', () => {
    const React = require('react')
    return {
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
        BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
        Bar: () => <div data-testid="bar" />,
        XAxis: () => null,
        YAxis: () => null,
        CartesianGrid: () => null,
        Tooltip: () => null,
        Cell: () => null,
    }
})

const allZeroData: RatingDistributionItem[] = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: 0,
}))

const dataWithRatings: RatingDistributionItem[] = allZeroData.map((d) =>
    d.rating === 8 ? { ...d, count: 3 } : d.rating === 9 ? { ...d, count: 5 } : d
)

describe('RatingsHistogram', () => {
    it('renders the card title', () => {
        render(<RatingsHistogram data={dataWithRatings} averageRating={8.7} />)

        expect(screen.getByText('Ratings Distribution')).toBeInTheDocument()
    })

    it('shows average rating in title when provided', () => {
        render(<RatingsHistogram data={dataWithRatings} averageRating={8.7} />)

        expect(screen.getByText(/avg 8.7/i)).toBeInTheDocument()
    })

    it('does not show average when null', () => {
        render(<RatingsHistogram data={dataWithRatings} averageRating={null} />)

        expect(screen.queryByText(/avg/i)).not.toBeInTheDocument()
    })

    it('shows no ratings message when all counts are zero', () => {
        render(<RatingsHistogram data={allZeroData} averageRating={null} />)

        expect(screen.getByText('No ratings yet')).toBeInTheDocument()
    })

    it('renders chart when ratings exist', () => {
        render(<RatingsHistogram data={dataWithRatings} averageRating={8.7} />)

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('does not render chart when no ratings', () => {
        render(<RatingsHistogram data={allZeroData} averageRating={null} />)

        expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    })
})
