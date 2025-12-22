import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock UI components
jest.mock('../ui/PrismBackground', () => () => <div data-testid="prism-background">PrismBackground</div>);
jest.mock('../ui/SplashCursor', () => () => <div data-testid="splash-cursor">SplashCursor</div>);
jest.mock('../ui/GlassmorphicContainer', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../ui/GapNotificationContainer', () => ({ gaps }: { gaps: any[] }) => (
    <div data-testid="gap-notifications">Gaps: {gaps.length}</div>
));
jest.mock('../ui/CardSwap', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);

describe('Dashboard Component', () => {
    const mockNavigate = jest.fn();

    test('renders without crashing', () => {
        render(<Dashboard onNavigate={mockNavigate} />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    test('renders background and cursor effects', () => {
        render(<Dashboard onNavigate={mockNavigate} />);
        expect(screen.getByTestId('prism-background')).toBeInTheDocument();
        expect(screen.getByTestId('splash-cursor')).toBeInTheDocument();
    });

    test('renders gap notifications with mock data', () => {
        render(<Dashboard onNavigate={mockNavigate} />);
        expect(screen.getByTestId('gap-notifications')).toBeInTheDocument();
        expect(screen.getByText(/Gaps: 1/i)).toBeInTheDocument();
    });

    test('renders navigation tabs', () => {
        render(<Dashboard onNavigate={mockNavigate} />);
        expect(screen.getByText('Experience')).toBeInTheDocument();
        expect(screen.getByText('Education')).toBeInTheDocument();
        expect(screen.getByText('Skills')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    test('switches content when tabs are clicked', () => {
        render(<Dashboard onNavigate={mockNavigate} />);

        // Default is experience
        expect(screen.getByText('Experience Section Content')).toBeInTheDocument();

        // Switch to Education
        fireEvent.click(screen.getByText('Education'));
        expect(screen.getByText('Education Section Content')).toBeInTheDocument();

        // Switch to Skills
        fireEvent.click(screen.getByText('Skills'));
        expect(screen.getByText('Skills Section Content')).toBeInTheDocument();
    });
});
