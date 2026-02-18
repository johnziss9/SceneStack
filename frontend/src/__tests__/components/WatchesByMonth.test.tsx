import { render, screen } from '@/test-utils'
import { WatchesByMonth } from '@/components/stats/WatchesByMonth'
import type { WatchesByMonthItem } from '@/types/stats'

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

const allZeroMonths: WatchesByMonthItem[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
    count: 0,
}))

const monthsWithActivity: WatchesByMonthItem[] = allZeroMonths.map((m) =>
    m.month === 3 ? { ...m, count: 5 } : m
)

describe('WatchesByMonth', () => {
    it('renders the current year in the title', () => {
        render(<WatchesByMonth data={allZeroMonths} />)

        const year = new Date().getFullYear().toString()
        expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
    })

    it('shows "no watches yet this year" when all months are zero', () => {
        render(<WatchesByMonth data={allZeroMonths} />)

        expect(screen.getByText(/no watches yet this year/i)).toBeInTheDocument()
    })

    it('does not show "no watches yet" message when there is activity', () => {
        render(<WatchesByMonth data={monthsWithActivity} />)

        expect(screen.queryByText(/no watches yet this year/i)).not.toBeInTheDocument()
    })

    it('always renders the bar chart', () => {
        render(<WatchesByMonth data={allZeroMonths} />)

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('renders chart with activity data', () => {
        render(<WatchesByMonth data={monthsWithActivity} />)

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
})
