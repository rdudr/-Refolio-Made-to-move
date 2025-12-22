import React from 'react';
import { render, screen } from '@testing-library/react';
import ResumeView from './ResumeView';

// Mock UI components
jest.mock('../ui/PrismBackground', () => () => <div data-testid="prism-background">PrismBackground</div>);
jest.mock('../ui/SplashCursor', () => () => <div data-testid="splash-cursor">SplashCursor</div>);
jest.mock('../ui/GlassmorphicContainer', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../ui/PDFPreview', () => () => <div data-testid="pdf-preview">PDF Preview</div>);

describe('ResumeView Component', () => {
    const mockNavigate = jest.fn();

    test('renders without crashing', () => {
        render(<ResumeView onNavigate={mockNavigate} />);
        expect(screen.getByText('Resume Preview')).toBeInTheDocument();
    });

    test('renders background and cursor effects', () => {
        render(<ResumeView onNavigate={mockNavigate} />);
        expect(screen.getByTestId('prism-background')).toBeInTheDocument();
        expect(screen.getByTestId('splash-cursor')).toBeInTheDocument();
    });

    test('renders PDF Preview component', () => {
        render(<ResumeView onNavigate={mockNavigate} />);
        expect(screen.getByTestId('pdf-preview')).toBeInTheDocument();
    });

    test('renders export options section', () => {
        render(<ResumeView onNavigate={mockNavigate} />);
        expect(screen.getByText('Export Options')).toBeInTheDocument();
    });
});
