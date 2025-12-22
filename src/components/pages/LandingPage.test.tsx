import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

// Mock the UI components to avoid canvas/animation issues in tests
jest.mock('../ui/SplashCursor', () => () => <div data-testid="splash-cursor">SplashCursor</div>);
jest.mock('../ui/PrismBackground', () => () => <div data-testid="prism-background">PrismBackground</div>);
jest.mock('../ui/GlassmorphicContainer', () => ({ children, className }: { children: React.ReactNode, className: string }) => (
    <div data-testid="glass-container" className={className}>{children}</div>
));

describe('LandingPage Component', () => {
    const mockNavigate = jest.fn();

    test('renders without crashing', () => {
        render(<LandingPage onNavigate={mockNavigate} />);
        expect(screen.getByText('Refolio')).toBeInTheDocument();
        expect(screen.getByText('Made to move')).toBeInTheDocument();
    });

    test('renders background and cursor effects', () => {
        render(<LandingPage onNavigate={mockNavigate} />);
        expect(screen.getByTestId('prism-background')).toBeInTheDocument();
        expect(screen.getByTestId('splash-cursor')).toBeInTheDocument();
    });

    test('renders navigation links', () => {
        render(<LandingPage onNavigate={mockNavigate} />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Upload Resume')).toBeInTheDocument();
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    test('renders navigation links as buttons', () => {
        render(<LandingPage onNavigate={mockNavigate} />);
        expect(screen.getByText('Dashboard').closest('button')).toBeInTheDocument();
        expect(screen.getByText('Upload Resume').closest('button')).toBeInTheDocument();
        expect(screen.getByText('Edit Profile').closest('button')).toBeInTheDocument();
    });
});
