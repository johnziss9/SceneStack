// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5127'

// Mock fetch globally for tests that need it
global.fetch = jest.fn()

// Suppress specific console warnings from shadcn/ui components
const originalWarn = console.warn
beforeAll(() => {
    console.warn = (...args) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Missing `Description`')
        ) {
            return
        }
        originalWarn(...args)
    }
})
afterAll(() => {
    console.warn = originalWarn
})

// Reset mocks after each test
afterEach(() => {
    jest.clearAllMocks()
})