import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditorPage from './EditorPage';

// Mock UI components
jest.mock('../ui/PrismBackground', () => () => <div data-testid="prism-background">PrismBackground</div>);
jest.mock('../ui/SplashCursor', () => () => <div data-testid="splash-cursor">SplashCursor</div>);
jest.mock('../ui/GlassmorphicContainer', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../ui/SkillManager', () => ({ onSkillsChange }: { onSkillsChange: (skills: any[]) => void }) => (
    <div data-testid="skill-manager">
        SkillManager
        <button onClick={() => onSkillsChange([{ id: '1', name: 'React', level: 5 } as any])}>Update Skills</button>
    </div>
));

// Mock alert
window.alert = jest.fn();

describe('EditorPage Component', () => {
    const mockNavigate = jest.fn();

    test('renders without crashing', () => {
        render(<EditorPage onNavigate={mockNavigate} />);
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
        expect(screen.getByText('Skills & Expertise')).toBeInTheDocument();
    });

    test('renders input fields with initial data', () => {
        render(<EditorPage onNavigate={mockNavigate} />);
        expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Morgan')).toBeInTheDocument();
        expect(screen.getByDisplayValue('alex.morgan@example.com')).toBeInTheDocument();
    });

    test('updates personal info state on change', () => {
        render(<EditorPage onNavigate={mockNavigate} />);
        const firstNameInput = screen.getByDisplayValue('Alex');
        fireEvent.change(firstNameInput, { target: { value: 'John' } });
        expect(firstNameInput).toHaveValue('John');
    });

    test('renders SkillManager', () => {
        render(<EditorPage onNavigate={mockNavigate} />);
        expect(screen.getByTestId('skill-manager')).toBeInTheDocument();
    });

    test('handles save action', async () => {
        render(<EditorPage onNavigate={mockNavigate} />);
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);

        expect(saveButton).toBeDisabled();
        expect(screen.getByText('Saving...')).toBeInTheDocument();

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Profile saved successfully!');
        });

        expect(saveButton).not.toBeDisabled();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
});
