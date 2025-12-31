import { api, ApiError } from '@/lib/api-client'

describe('api-client', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
    })

    describe('ApiError', () => {
        it('should create an ApiError with status and message', () => {
            const error = new ApiError(404, 'Not found')

            expect(error).toBeInstanceOf(Error)
            expect(error.name).toBe('ApiError')
            expect(error.status).toBe(404)
            expect(error.message).toBe('Not found')
        })
    })

    describe('api.get', () => {
        it('should make a GET request and return parsed JSON', async () => {
            const mockData = { id: 1, name: 'Test' }
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockData,
            })

            const result = await api.get('/api/test')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5127/api/test',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            expect(result).toEqual(mockData)
        })

        it('should throw ApiError on non-ok response', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
                text: async () => 'Not found',
            })

            await expect(api.get('/api/test')).rejects.toThrow(ApiError)
            await expect(api.get('/api/test')).rejects.toThrow('Not found')
        })

        it('should throw ApiError with status message if no error text', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => '',
            })

            await expect(api.get('/api/test')).rejects.toThrow('API error: 500')
        })
    })

    describe('api.post', () => {
        it('should make a POST request with data and return parsed JSON', async () => {
            const postData = { name: 'New Item' }
            const mockResponse = { id: 1, ...postData }

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => mockResponse,
            })

            const result = await api.post('/api/items', postData)

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5127/api/items',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(postData),
                }
            )
            expect(result).toEqual(mockResponse)
        })

        it('should make a POST request without body if no data provided', async () => {
            const mockResponse = { success: true }

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            })

            const result = await api.post('/api/action')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5127/api/action',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: undefined,
                }
            )
            expect(result).toEqual(mockResponse)
        })
    })

    describe('api.put', () => {
        it('should make a PUT request with data and return parsed JSON', async () => {
            const updateData = { name: 'Updated Item' }
            const mockResponse = { id: 1, ...updateData }

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            })

            const result = await api.put('/api/items/1', updateData)

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5127/api/items/1',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData),
                }
            )
            expect(result).toEqual(mockResponse)
        })
    })

    describe('api.delete', () => {
        it('should make a DELETE request and handle 204 No Content', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 204,
            })

            const result = await api.delete('/api/items/1')

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5127/api/items/1',
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            expect(result).toBeUndefined()
        })

        it('should make a DELETE request and return JSON if provided', async () => {
            const mockResponse = { deleted: true }

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            })

            const result = await api.delete('/api/items/1')

            expect(result).toEqual(mockResponse)
        })
    })
})