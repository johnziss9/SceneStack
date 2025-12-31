import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Custom render function that wraps components with providers if needed
function customRender(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { ...options })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override render method
export { customRender as render }