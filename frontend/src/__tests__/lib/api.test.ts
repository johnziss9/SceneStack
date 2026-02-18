import { movieApi, watchApi } from '@/lib/api'
import { api } from '@/lib/api-client'
import type { TmdbSearchResponse, Watch, CreateWatchRequest, UpdateWatchRequest, GroupedWatch } from '@/types'

// Mock the api-client module
jest.mock('@/lib/api-client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
    ApiError: class ApiError extends Error {
        constructor(public status: number, message: string) {
            super(message)
            this.name = 'ApiError'
        }
    },
}))

describe('API Service Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('movieApi', () => {
        describe('searchMovies', () => {
            it('should search movies with query and default page', async () => {
                const mockResponse: TmdbSearchResponse = {
                    page: 1,
                    results: [
                        {
                            id: 550,
                            title: 'Fight Club',
                            release_date: '1999-10-15',
                            poster_path: '/path.jpg',
                            overview: 'A movie about...',
                            vote_average: 8.4,
                            vote_count: 1000,
                        },
                    ],
                    total_pages: 1,
                    total_results: 1,
                }

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await movieApi.searchMovies('Fight Club')

                expect(api.get).toHaveBeenCalledWith('/api/movies/search?query=Fight%20Club&page=1')
                expect(result).toEqual(mockResponse)
            })

            it('should search movies with query and custom page', async () => {
                const mockResponse: TmdbSearchResponse = {
                    page: 2,
                    results: [],
                    total_pages: 2,
                    total_results: 20,
                }

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await movieApi.searchMovies('Test', 2)

                expect(api.get).toHaveBeenCalledWith('/api/movies/search?query=Test&page=2')
                expect(result).toEqual(mockResponse)
            })

            it('should URL encode special characters in query', async () => {
                const mockResponse: TmdbSearchResponse = {
                    page: 1,
                    results: [],
                    total_pages: 0,
                    total_results: 0,
                }

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                await movieApi.searchMovies('movie & stuff')

                expect(api.get).toHaveBeenCalledWith('/api/movies/search?query=movie%20%26%20stuff&page=1')
            })
        })
    })

    describe('watchApi', () => {
        describe('createWatch', () => {
            it('should create a watch with all fields', async () => {
                const requestData: CreateWatchRequest = {
                    tmdbId: 550,
                    watchedDate: '2024-12-30',
                    rating: 9,
                    notes: 'Great movie!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Friends',
                    isRewatch: false,
                }

                const mockResponse: Watch = {
                    id: 1,
                    userId: 1,
                    movieId: 1,
                    watchedDate: '2024-12-30',
                    rating: 9,
                    notes: 'Great movie!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Friends',
                    isRewatch: false,
                    createdAt: '2024-12-30T10:00:00Z',
                    movie: {
                        id: 1,
                        tmdbId: 550,
                        title: 'Fight Club',
                        year: 1999,
                        posterPath: '/path.jpg',
                        synopsis: 'A movie about...',
                    },
                    user: {
                        id: 1,
                        username: 'testuser',
                        email: 'test@example.com',
                    },
                }

                    ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.createWatch(requestData)

                expect(api.post).toHaveBeenCalledWith('/api/watches', requestData)
                expect(result).toEqual(mockResponse)
            })
        })

        describe('getWatches', () => {
            it('should get all watches without userId filter', async () => {
                const mockResponse: Watch[] = []

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.getWatches()

                expect(api.get).toHaveBeenCalledWith('/api/watches')
                expect(result).toEqual(mockResponse)
            })
        })

        describe('getGroupedWatches', () => {
            it('should get grouped watches (userId from auth token)', async () => {
                const mockResponse: GroupedWatch[] = [
                    {
                        movieId: 1,
                        movie: {
                            id: 1,
                            tmdbId: 550,
                            title: 'Fight Club',
                            year: 1999,
                            posterPath: '/path.jpg',
                            synopsis: 'A movie about...',
                        },
                        watchCount: 2,
                        averageRating: 8.5,
                        latestRating: 9,
                        watches: [
                            {
                                id: 1,
                                movieId: 1,
                                watchedDate: '2024-12-30',
                                rating: 9,
                                notes: 'Great!',
                                watchLocation: 'Cinema',
                                watchedWith: 'Friends',
                                isRewatch: false,
                                movie: {
                                    id: 1,
                                    tmdbId: 550,
                                    title: 'Fight Club',
                                    year: 1999,
                                    posterPath: '/path.jpg',
                                    synopsis: 'A movie about...',
                                },
                            },
                            {
                                id: 2,
                                movieId: 1,
                                watchedDate: '2024-11-15',
                                rating: 8,
                                notes: 'Good',
                                watchLocation: 'Home',
                                watchedWith: null,
                                isRewatch: true,
                                movie: {
                                    id: 1,
                                    tmdbId: 550,
                                    title: 'Fight Club',
                                    year: 1999,
                                    posterPath: '/path.jpg',
                                    synopsis: 'A movie about...',
                                },
                            },
                        ],
                    },
                ]

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.getGroupedWatches()

                expect(api.get).toHaveBeenCalledWith('/api/watches/grouped?page=1&pageSize=20')
                expect(result).toEqual(mockResponse)
            })
        })

        describe('getWatchesByMovie', () => {
            it('should get all watches for a specific movie (userId from auth token)', async () => {
                const mockResponse: Watch[] = []

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.getWatchesByMovie(4)

                expect(api.get).toHaveBeenCalledWith('/api/watches/by-movie/4')
                expect(result).toEqual(mockResponse)
            })
        })

        describe('getWatch', () => {
            it('should get a single watch by id', async () => {
                const mockResponse: Watch = {
                    id: 1,
                    userId: 1,
                    movieId: 1,
                    watchedDate: '2024-12-30',
                    rating: 9,
                    notes: 'Great!',
                    watchLocation: 'Cinema',
                    watchedWith: 'Friends',
                    isRewatch: false,
                    createdAt: '2024-12-30T10:00:00Z',
                    movie: {
                        id: 1,
                        tmdbId: 550,
                        title: 'Fight Club',
                        year: 1999,
                        posterPath: '/path.jpg',
                        synopsis: 'A movie about...',
                    },
                    user: {
                        id: 1,
                        username: 'testuser',
                        email: 'test@example.com',
                    },
                }

                    ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.getWatch(1)

                expect(api.get).toHaveBeenCalledWith('/api/watches/1')
                expect(result).toEqual(mockResponse)
            })
        })

        describe('updateWatch', () => {
            it('should update a watch', async () => {
                const updateData: UpdateWatchRequest = {
                    watchedDate: '2024-12-31',
                    rating: 10,
                    notes: 'Even better on rewatch!',
                    watchLocation: 'Home',
                    watchedWith: 'Family',
                    isRewatch: true,
                }

                const mockResponse: Watch = {
                    id: 1,
                    userId: 1,
                    movieId: 1,
                    watchedDate: '2024-12-31',
                    rating: 10,
                    notes: 'Even better on rewatch!',
                    watchLocation: 'Home',
                    watchedWith: 'Family',
                    isRewatch: true,
                    createdAt: '2024-12-30T10:00:00Z',
                    movie: {
                        id: 1,
                        tmdbId: 550,
                        title: 'Fight Club',
                        year: 1999,
                        posterPath: '/path.jpg',
                        synopsis: 'A movie about...',
                    },
                    user: {
                        id: 1,
                        username: 'testuser',
                        email: 'test@example.com',
                    },
                }

                    ; (api.put as jest.Mock).mockResolvedValue(mockResponse)

                const result = await watchApi.updateWatch(1, updateData)

                expect(api.put).toHaveBeenCalledWith('/api/watches/1', updateData)
                expect(result).toEqual(mockResponse)
            })
        })

        describe('deleteWatch', () => {
            it('should delete a watch', async () => {
                ; (api.delete as jest.Mock).mockResolvedValue(undefined)

                const result = await watchApi.deleteWatch(1)

                expect(api.delete).toHaveBeenCalledWith('/api/watches/1')
                expect(result).toBeUndefined()
            })
        })
    })
})