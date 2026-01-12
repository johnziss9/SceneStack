import { render, screen } from '@/test-utils'
import { AiSearchResults } from '@/components/AiSearchResults'
import type { AiSearchResponse } from '@/types'

// Suppress console.error for window.location mock
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Mock window.location.search
delete (window as any).location
window.location = { search: '' } as any

// Restore console.error after tests
afterAll(() => {
    consoleErrorSpy.mockRestore()
})

describe('AiSearchResults', () => {
    const mockResults: AiSearchResponse = {
        results: [
            {
                id: 1,
                movieId: 1,
                watchedDate: '2024-06-15T00:00:00Z',
                rating: 9,
                notes: 'Great thriller!',
                watchLocation: 'Cinema',
                watchedWith: 'John',
                isRewatch: false,
                movie: {
                    id: 1,
                    tmdbId: 550,
                    title: 'Fight Club',
                    year: 1999,
                    posterPath: '/poster.jpg',
                    synopsis: 'A thriller',
                }
            },
            {
                id: 2,
                movieId: 2,
                watchedDate: '2024-07-20T00:00:00Z',
                rating: 8,
                notes: 'Action-packed!',
                watchLocation: 'Home',
                watchedWith: 'Sarah',
                isRewatch: false,
                movie: {
                    id: 2,
                    tmdbId: 551,
                    title: 'The Matrix',
                    year: 1999,
                    posterPath: '/matrix.jpg',
                    synopsis: 'An action movie',
                }
            }
        ],
        totalMatches: 2,
        tokensUsed: 150,
        cost: 0.002,
    }

    it('should show loading skeletons when isLoading is true', () => {
        render(<AiSearchResults results={null} isLoading={true} />)

        // Should show skeleton cards (10 of them)
        const skeletons = document.querySelectorAll('.aspect-\\[2\\/3\\]')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should show empty state when results is null', () => {
        render(<AiSearchResults results={null} isLoading={false} />)

        expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
        expect(screen.getByText(/Try a different search query/i)).toBeInTheDocument()
    })

    it('should show empty state when results array is empty', () => {
        const emptyResults: AiSearchResponse = {
            results: [],
            totalMatches: 0,
            tokensUsed: 50,
            cost: 0.001,
        }

        render(<AiSearchResults results={emptyResults} isLoading={false} />)

        expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
    })

    it('should display result count for single movie', () => {
        const singleResult: AiSearchResponse = {
            results: [mockResults.results[0]],
            totalMatches: 1,
            tokensUsed: 100,
            cost: 0.001,
        }

        render(<AiSearchResults results={singleResult} isLoading={false} />)

        expect(screen.getByText(/Found 1 movie/i)).toBeInTheDocument()
    })

    it('should display result count for multiple movies', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        expect(screen.getByText(/Found 2 movies/i)).toBeInTheDocument()
    })

    it('should render movie titles', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        expect(screen.getByText('Fight Club')).toBeInTheDocument()
        expect(screen.getByText('The Matrix')).toBeInTheDocument()
    })

    it('should display movie years', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        // Should show year (1999 appears twice)
        const years = screen.getAllByText('1999')
        expect(years).toHaveLength(2)
    })

    it('should display ratings', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        expect(screen.getByText('9')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('should display watch locations', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        expect(screen.getByText('Cinema')).toBeInTheDocument()
        expect(screen.getByText('Home')).toBeInTheDocument()
    })

    it('should display who user watched with', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        expect(screen.getByText('John')).toBeInTheDocument()
        expect(screen.getByText('Sarah')).toBeInTheDocument()
    })

    it('should render results in grid layout', () => {
        const { container } = render(<AiSearchResults results={mockResults} isLoading={false} />)

        const grid = container.querySelector('.grid')
        expect(grid).toBeInTheDocument()
    })

    it('should render clickable cards as links', () => {
        render(<AiSearchResults results={mockResults} isLoading={false} />)

        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2)
    })

    it('should deduplicate results by movie', () => {
        const duplicateResults: AiSearchResponse = {
            results: [
                mockResults.results[0],
                { ...mockResults.results[0], id: 3 }, // Same movie, different watch ID
                mockResults.results[1],
            ],
            totalMatches: 3,
            tokensUsed: 200,
            cost: 0.003,
        }

        render(<AiSearchResults results={duplicateResults} isLoading={false} />)

        // Should show "Found 2 movies" (deduplicated)
        expect(screen.getByText(/Found 2 movies/i)).toBeInTheDocument()
        // Should show "(3 total watches)" 
        expect(screen.getByText(/3 total watches/i)).toBeInTheDocument()
    })

    it('should show rewatch badge when applicable', () => {
        const rewatchResults: AiSearchResponse = {
            results: [
                { ...mockResults.results[0], isRewatch: true }
            ],
            totalMatches: 1,
            tokensUsed: 100,
            cost: 0.001,
        }

        render(<AiSearchResults results={rewatchResults} isLoading={false} />)

        expect(screen.getByText('Rewatch')).toBeInTheDocument()
    })
})