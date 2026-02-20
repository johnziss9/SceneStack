import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Custom render function that can be extended with providers if needed
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { ...options })
}

// Override the default render with our custom render
export { customRender as render }
