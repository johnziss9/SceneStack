// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5127'

// Mock fetch globally for tests that need it
global.fetch = jest.fn()

// Mock ResizeObserver (used by Radix UI components like Select)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Mock pointer capture methods (used by Radix UI Select)
if (typeof Element !== 'undefined') {
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || jest.fn()
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || jest.fn()
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || jest.fn()
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || jest.fn()
}

// Suppress specific console warnings from shadcn/ui components
const originalWarn = console.warn
const originalError = console.error
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

    // Suppress act() warnings from dialog cleanup in finally blocks
    // These are benign warnings from state cleanup after error handling
    console.error = (...args) => {
        const allMessages = args.join(' ')
        if (
            allMessages.includes('not wrapped in act') &&
            (allMessages.includes('BulkMakePrivateDialog') || allMessages.includes('BulkShareWithGroupsDialog'))
        ) {
            return
        }
        originalError(...args)
    }
})
afterAll(() => {
    console.warn = originalWarn
    console.error = originalError
})

// Reset mocks after each test
afterEach(() => {
    jest.clearAllMocks()
})