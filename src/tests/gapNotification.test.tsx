import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GapNotification from '../components/ui/GapNotification';
import { CareerGap } from '../types';

// Mock gap data for testing
const mockGap: CareerGap = {
  id: 'test-gap-1',
  startDate: new Date('2022-01-01'),
  endDate: new Date('2022-06-01'),
  durationDays: 151,
  type: 'employment',
  severity: 'moderate',
  isResolved: false,
  createdAt: new Date('2023-01-01')
};

const mockGapWithNotes: CareerGap = {
  ...mockGap,
  id: 'test-gap-2',
  notes: 'Career transition period - pursuing additional certifications'
};

describe('GapNotification Component', () => {
  const mockOnDismiss = jest.fn();
  const mockOnResolve = jest.fn();
  const mockOnAddExplanation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders gap notification with correct information', () => {
    render(
      <GapNotification
        gap={mockGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    // Check if title is displayed
    expect(screen.getByText('Career Gap Detected')).toBeInTheDocument();
    
    // Check if period is displayed
    expect(screen.getByText('Jan 2022 - Jun 2022')).toBeInTheDocument();
    
    // Check if duration is displayed (151 days = ~5 months)
    expect(screen.getByText('5 months')).toBeInTheDocument();
    
    // Check if type is displayed
    expect(screen.getByText('Employment')).toBeInTheDocument();
  });

  test('displays notes when present', () => {
    render(
      <GapNotification
        gap={mockGapWithNotes}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    expect(screen.getByText('Career transition period - pursuing additional certifications')).toBeInTheDocument();
  });

  test('calls onDismiss when close button is clicked', () => {
    render(
      <GapNotification
        gap={mockGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('test-gap-1');
  });

  test('calls onResolve when resolve button is clicked', () => {
    render(
      <GapNotification
        gap={mockGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    const resolveButton = screen.getByText('Mark as Resolved');
    fireEvent.click(resolveButton);

    expect(mockOnResolve).toHaveBeenCalledWith('test-gap-1');
  });

  test('calls onAddExplanation when add explanation button is clicked', () => {
    render(
      <GapNotification
        gap={mockGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    const addExplanationButton = screen.getByText('Add Explanation');
    fireEvent.click(addExplanationButton);

    expect(mockOnAddExplanation).toHaveBeenCalledWith('test-gap-1');
  });

  test('applies correct severity class for different gap severities', () => {
    const minorGap: CareerGap = { ...mockGap, severity: 'minor' };
    const majorGap: CareerGap = { ...mockGap, severity: 'major' };

    const { rerender } = render(
      <GapNotification
        gap={minorGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    expect(document.querySelector('.gap-notification--minor')).toBeInTheDocument();

    rerender(
      <GapNotification
        gap={majorGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    expect(document.querySelector('.gap-notification--major')).toBeInTheDocument();
  });

  test('formats duration correctly for different time periods', () => {
    const shortGap: CareerGap = { ...mockGap, durationDays: 15 };
    const longGap: CareerGap = { ...mockGap, durationDays: 400 };

    const { rerender } = render(
      <GapNotification
        gap={shortGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    expect(screen.getByText('15 days')).toBeInTheDocument();

    rerender(
      <GapNotification
        gap={longGap}
        onDismiss={mockOnDismiss}
        onResolve={mockOnResolve}
        onAddExplanation={mockOnAddExplanation}
      />
    );

    expect(screen.getByText('1 year, 1 month')).toBeInTheDocument();
  });
});