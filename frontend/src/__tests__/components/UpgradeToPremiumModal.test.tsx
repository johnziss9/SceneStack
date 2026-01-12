import { render, screen } from '@/test-utils'
import { UpgradeToPremiumModal } from '@/components/UpgradeToPremiumModal'
import userEvent from '@testing-library/user-event'

describe('UpgradeToPremiumModal', () => {
    const mockOnOpenChange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should not render when open is false', () => {
        render(
            <UpgradeToPremiumModal
                open={false}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument()
    })

    it('should display insights feature message', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.getByText(/AI Insights help you remember your personal journey/i)).toBeInTheDocument()
    })

    it('should display search feature message', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="search"
            />
        )

        expect(screen.getByText(/AI Search lets you find watches using natural language/i)).toBeInTheDocument()
    })

    it('should display premium features list', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.getByText('AI-Powered Personalised Insights')).toBeInTheDocument()
        expect(screen.getByText('Natural Language Search')).toBeInTheDocument()
        expect(screen.getByText('Advanced Statistics')).toBeInTheDocument()
        expect(screen.getByText('Unlimited Groups')).toBeInTheDocument()
    })

    it('should display pricing information', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.getByText('£5')).toBeInTheDocument()
        expect(screen.getByText('/month')).toBeInTheDocument()
        expect(screen.getByText('£50')).toBeInTheDocument()
        expect(screen.getByText('/year')).toBeInTheDocument()
        expect(screen.getByText(/Cancel anytime/i)).toBeInTheDocument()
    })

    it('should call onOpenChange(false) when "Maybe Later" is clicked', async () => {
        const user = userEvent.setup()
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        const maybeLaterButton = screen.getByRole('button', { name: /maybe later/i })
        await user.click(maybeLaterButton)

        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should have "Upgrade Now" button', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument()
    })

    it('should render dialog with proper structure', () => {
        render(
            <UpgradeToPremiumModal
                open={true}
                onOpenChange={mockOnOpenChange}
                feature="insights"
            />
        )

        // Check for title
        expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument()

        // Check for both buttons
        expect(screen.getByRole('button', { name: /maybe later/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument()
    })
})