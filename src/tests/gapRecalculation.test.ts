import { renderHook, act } from '@testing-library/react';
import { useGapRecalculation } from '../hooks/useGapRecalculation';
import { ProfileData, ExperienceEntry, EducationEntry, CareerGap } from '../types';

// Mock the movement analyzer
jest.mock('../services/movementAnalyzer', () => ({
  movementAnalyzer: {
    analyzeCompleteTimeline: jest.fn()
  }
}));

import { movementAnalyzer } from '../services/movementAnalyzer';

describe('useGapRecalculation Hook', () => {
  const mockAnalyzeCompleteTimeline = movementAnalyzer.analyzeCompleteTimeline as jest.MockedFunction<typeof movementAnalyzer.analyzeCompleteTimeline>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockProfile = (experience: ExperienceEntry[] = [], education: EducationEntry[] = [], careerGaps: CareerGap[] = []): ProfileData => ({
    id: 'test-profile',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    experience,
    education,
    skills: [],
    projects: [],
    careerGaps,
    version: 1,
    isComplete: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  });

  const createMockExperience = (id: string, startDate: Date, endDate: Date | null = null): ExperienceEntry => ({
    id,
    title: `Job ${id}`,
    organization: `Company ${id}`,
    startDate,
    endDate,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const createMockGap = (id: string, startDate: Date, endDate: Date): CareerGap => ({
    id,
    startDate,
    endDate,
    durationDays: Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    type: 'employment',
    severity: 'moderate',
    isResolved: false,
    createdAt: new Date()
  });

  describe('hasTimelineChanged', () => {
    it('should detect when timeline entries are added', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const previous = [
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-06-01'))
      ];
      
      const current = [
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-06-01')),
        createMockExperience('2', new Date('2023-07-01'), new Date('2023-12-01'))
      ];

      const hasChanged = result.current.hasTimelineChanged(previous, current);
      expect(hasChanged).toBe(true);
    });

    it('should detect when timeline entries are modified', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const previous = [
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-06-01'))
      ];
      
      const current = [
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-07-01')) // Different end date
      ];

      const hasChanged = result.current.hasTimelineChanged(previous, current);
      expect(hasChanged).toBe(true);
    });

    it('should return false when timeline is unchanged', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const timeline = [
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-06-01'))
      ];

      const hasChanged = result.current.hasTimelineChanged(timeline, timeline);
      expect(hasChanged).toBe(false);
    });
  });

  describe('mergeGapData', () => {
    it('should preserve resolved status and notes from existing gaps', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const existingGaps = [
        {
          ...createMockGap('gap-1', new Date('2023-06-01'), new Date('2023-09-01')),
          isResolved: true,
          notes: 'Took time off for family'
        }
      ];

      const detectedGaps = [
        createMockGap('gap-new', new Date('2023-06-01'), new Date('2023-09-01'))
      ];

      const merged = result.current.mergeGapData(existingGaps, detectedGaps);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].isResolved).toBe(true);
      expect(merged[0].notes).toBe('Took time off for family');
      expect(merged[0].id).toBe('gap-1'); // Should preserve original ID
    });

    it('should add new gaps that were not previously detected', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const existingGaps: CareerGap[] = [];
      const detectedGaps = [
        createMockGap('gap-1', new Date('2023-06-01'), new Date('2023-09-01'))
      ];

      const merged = result.current.mergeGapData(existingGaps, detectedGaps);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('gap-1');
      expect(merged[0].isResolved).toBe(false);
    });

    it('should preserve resolved gaps even if no longer detected', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const existingGaps = [
        {
          ...createMockGap('gap-1', new Date('2023-06-01'), new Date('2023-09-01')),
          isResolved: true,
          notes: 'Explained gap'
        }
      ];

      const detectedGaps: CareerGap[] = []; // No gaps detected

      const merged = result.current.mergeGapData(existingGaps, detectedGaps);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].isResolved).toBe(true);
      expect(merged[0].notes).toBe('Explained gap');
    });
  });

  describe('recalculateGaps', () => {
    it('should trigger gap analysis and call onUpdate when timeline changes', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const mockGaps = [
        createMockGap('gap-1', new Date('2023-06-01'), new Date('2023-09-01'))
      ];
      
      mockAnalyzeCompleteTimeline.mockReturnValue(mockGaps);
      
      const profile = createMockProfile([
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-05-01'))
      ]);

      const onUpdate = jest.fn();

      act(() => {
        result.current.recalculateGaps(profile, onUpdate);
      });

      expect(mockAnalyzeCompleteTimeline).toHaveBeenCalledWith(
        profile.experience,
        profile.education
      );
      
      expect(onUpdate).toHaveBeenCalledWith({
        careerGaps: mockGaps,
        lastAnalyzed: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should not call onUpdate if timeline has not changed', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const profile = createMockProfile([
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-05-01'))
      ]);

      const onUpdate = jest.fn();

      // First call to establish baseline
      act(() => {
        result.current.recalculateGaps(profile, onUpdate);
      });

      // Clear the mock
      onUpdate.mockClear();

      // Second call with same data
      act(() => {
        result.current.recalculateGaps(profile, onUpdate);
      });

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      mockAnalyzeCompleteTimeline.mockImplementation(() => {
        throw new Error('Analysis failed');
      });
      
      const profile = createMockProfile([
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-05-01'))
      ]);

      const onUpdate = jest.fn();

      expect(() => {
        act(() => {
          result.current.recalculateGaps(profile, onUpdate);
        });
      }).not.toThrow();

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('setupAutoRecalculation', () => {
    it('should trigger recalculation when called with profile', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const mockGaps = [
        createMockGap('gap-1', new Date('2023-06-01'), new Date('2023-09-01'))
      ];
      
      mockAnalyzeCompleteTimeline.mockReturnValue(mockGaps);
      
      const profile = createMockProfile([
        createMockExperience('1', new Date('2023-01-01'), new Date('2023-05-01'))
      ]);

      const onUpdate = jest.fn();

      act(() => {
        result.current.setupAutoRecalculation(profile, onUpdate);
      });

      expect(mockAnalyzeCompleteTimeline).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should handle null profile gracefully', () => {
      const { result } = renderHook(() => useGapRecalculation());
      
      const onUpdate = jest.fn();

      expect(() => {
        act(() => {
          result.current.setupAutoRecalculation(null, onUpdate);
        });
      }).not.toThrow();

      expect(mockAnalyzeCompleteTimeline).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});