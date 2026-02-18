import { render, screen } from '@/test-utils'
import { WatchesByYear } from '@/components/stats/WatchesByYear'
import type { WatchesByYearItem } from '@/types/stats'

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
    }
})

const mockData: WatchesByYearItem[] = [
    { year: 2023, count: 12 },
    { year: 2024, count: 30 },
    { year: 2025, count: 8 },
]

describe('WatchesByYear', () => {
    it('renders the card title', () => {
        render(<WatchesByYear data={mockData} />)

        expect(screen.getByText('Watches by Year')).toBeInTheDocument()
    })

    it('renders chart when data is provided', () => {
        render(<WatchesByYear data={mockData} />)

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('shows empty state when data array is empty', () => {
        render(<WatchesByYear data={[]} />)

        expect(screen.getByText('No watch history yet')).toBeInTheDocument()
    })

    it('does not show chart when data is empty', () => {
        render(<WatchesByYear data={[]} />)

        expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    })

    it('still shows title in empty state', () => {
        render(<WatchesByYear data={[]} />)

        expect(screen.getByText('Watches by Year')).toBeInTheDocument()
    })
})
