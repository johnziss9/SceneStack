import { render, screen } from '@/test-utils'
import { TopRewatched } from '@/components/stats/TopRewatched'
import type { TopRewatchedMovie } from '@/types/stats'

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, src }: { alt: string; src: string }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt} src={src} />
    ),
}))

const mockData: TopRewatchedMovie[] = [
    {
        movie: { id: 1, tmdbId: 550, title: 'Fight Club', year: 1999, posterPath: '/poster1.jpg' },
        watchCount: 5,
    },
    {
        movie: { id: 2, tmdbId: 603, title: 'The Matrix', year: 1999, posterPath: null },
        watchCount: 3,
    },
    {
        movie: { id: 3, tmdbId: 27205, title: 'Inception', year: 2010, posterPath: '/poster3.jpg' },
        watchCount: 2,
    },
]

describe('TopRewatched', () => {
    it('renders the card title', () => {
        render(<TopRewatched data={mockData} />)

        expect(screen.getByText('Most Rewatched')).toBeInTheDocument()
    })

    it('shows empty state when no data', () => {
        render(<TopRewatched data={[]} />)

        expect(screen.getByText('No rewatched films yet')).toBeInTheDocument()
    })

    it('still shows title in empty state', () => {
        render(<TopRewatched data={[]} />)

        expect(screen.getByText('Most Rewatched')).toBeInTheDocument()
    })

    it('renders all movie titles', () => {
        render(<TopRewatched data={mockData} />)

        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.getByText('The Matrix')).toBeInTheDocument()
        expect(screen.getByText('Inception')).toBeInTheDocument()
    })

    it('renders watch count badges with × prefix', () => {
        render(<TopRewatched data={mockData} />)

        expect(screen.getByText('×5')).toBeInTheDocument()
        expect(screen.getByText('×3')).toBeInTheDocument()
        expect(screen.getByText('×2')).toBeInTheDocument()
    })

    it('renders rank numbers', () => {
        render(<TopRewatched data={mockData} />)

        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders movie years', () => {
        render(<TopRewatched data={mockData} />)

        expect(screen.getAllByText('1999')).toHaveLength(2)
        expect(screen.getByText('2010')).toBeInTheDocument()
    })

    it('links each movie to its watched page', () => {
        render(<TopRewatched data={mockData} />)

        const links = screen.getAllByRole('link')
        expect(links[0]).toHaveAttribute('href', '/watched/1')
        expect(links[1]).toHaveAttribute('href', '/watched/2')
        expect(links[2]).toHaveAttribute('href', '/watched/3')
    })

    it('renders poster image when posterPath is provided', () => {
        render(<TopRewatched data={[mockData[0]]} />)

        const img = screen.getByAltText('Fight Club')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', expect.stringContaining('/poster1.jpg'))
    })

    it('renders fallback when posterPath is null', () => {
        render(<TopRewatched data={[mockData[1]]} />)

        // The Matrix has no poster — should show "?" fallback
        expect(screen.getByText('?')).toBeInTheDocument()
    })
})
