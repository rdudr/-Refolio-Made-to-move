import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScannerPage from './ScannerPage';

// Mock UI components
jest.mock('../ui/PrismBackground', () => () => <div data-testid="prism-background">PrismBackground</div>);
jest.mock('../ui/SplashCursor', () => () => <div data-testid="splash-cursor">SplashCursor</div>);
jest.mock('../ui/GlassmorphicContainer', () => ({ children, className }: { children: React.ReactNode, className: string }) => (
    <div data-testid="glass-container" className={className}>{children}</div>
));
jest.mock('../ui/FileUpload', () => ({ onError }: { onError: (msg: string) => void }) => (
    <div data-testid="file-upload">
        <button onClick={() => onError('Test Error')}>Trigger Error</button>
        FileUpload
    </div>
));

describe('ScannerPage Component', () => {
    const mockNavigate = jest.fn();

    test('renders without crashing', () => {
        render(<ScannerPage onNavigate={mockNavigate} />);
        expect(screen.getByText('Resume Scanner')).toBeInTheDocument();
        expect(screen.getByText(/Upload your resume/i)).toBeInTheDocument();
    });

    test('renders background and cursor effects', () => {
        render(<ScannerPage onNavigate={mockNavigate} />);
        expect(screen.getByTestId('prism-background')).toBeInTheDocument();
        expect(screen.getByTestId('splash-cursor')).toBeInTheDocument();
    });

    test('renders FileUpload component', () => {
        render(<ScannerPage onNavigate={mockNavigate} />);
        expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    test('displays error message when FileUpload triggers error', () => {
        render(<ScannerPage onNavigate={mockNavigate} />);
        const errorButton = screen.getByText('Trigger Error');
        fireEvent.click(errorButton);
        expect(screen.getByText('Test Error')).toBeInTheDocument();
    });
});
