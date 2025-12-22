/**
 * Integration test for automatic gap recalculation
 * Tests the complete workflow from timeline updates to gap detection
 */

import { ProfileData, ExperienceEntry, EducationEntry, CareerGap } from '../types';
import { movementAnalyzer } from '../services/movementAnalyzer';

describe('Gap Recalculation Integration', () => {
  const createMockProfile = (experience: ExperienceEntry[] = [], education: EducationEntry[] = []): ProfileData => ({
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
    careerGaps: [],
    version: 1,
    isComplete: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  });

  const createExperience = (id: string, startDate: string, endDate: string | null = null): ExperienceEntry => ({
    id,
    title: `Job ${id}`,
    organization: `Company ${id}`,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const createEducation = (id: string, startDate: string, endDate: string | null = null): EducationEntry => ({
    id,
    title: `Program ${id}`,
    organization: `University ${id}`,
    degree: `Degree ${id}`,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('Timeline with Career Gaps', () => {
    it('should detect gaps when experience entries have significant time between them', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', '2022-06-01'), // Job 1: Jan-Jun 2022
        createExperience('2', '2023-01-01', '2023-06-01')  // Job 2: Jan-Jun 2023 (6+ month gap)
      ]);

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(1);
      expect(gaps[0].durationDays).toBeGreaterThan(90);
      expect(gaps[0].type).toBe('employment');
      expect(gaps[0].severity).toBe('moderate'); // 6 months should be moderate (180-365 days = moderate)
    });

    it('should detect gaps between education and employment', () => {
      const profile = createMockProfile(
        [createExperience('1', '2023-06-01', null)], // Job starts June 2023
        [createEducation('1', '2022-01-01', '2022-12-01')] // Education ends Dec 2022
      );

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(1);
      expect(gaps[0].durationDays).toBeGreaterThan(90);
      expect(gaps[0].startDate).toEqual(new Date('2022-12-01'));
      expect(gaps[0].endDate).toEqual(new Date('2023-06-01'));
    });

    it('should not detect gaps when timeline is continuous', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', '2022-06-01'),
        createExperience('2', '2022-06-15', '2022-12-01'), // Only 2-week gap
        createExperience('3', '2022-12-15', null)          // Only 2-week gap
      ]);

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(0);
    });
  });

  describe('Gap Severity Classification', () => {
    it('should classify gaps correctly by duration', () => {
      const testCases = [
        { gap: 120, expected: 'minor' },    // 4 months
        { gap: 200, expected: 'moderate' }, // 6.5 months  
        { gap: 400, expected: 'major' }     // 13+ months
      ];

      testCases.forEach(({ gap, expected }) => {
        const profile = createMockProfile([
          createExperience('1', '2022-01-01', '2022-06-01'),
          createExperience('2', new Date(new Date('2022-06-01').getTime() + gap * 24 * 60 * 60 * 1000).toISOString().split('T')[0], null)
        ]);

        const gaps = movementAnalyzer.analyzeCompleteTimeline(
          profile.experience,
          profile.education
        );

        expect(gaps).toHaveLength(1);
        expect(gaps[0].severity).toBe(expected);
      });
    });
  });

  describe('Data Integrity During Analysis', () => {
    it('should maintain consistent gap IDs based on date ranges', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', '2022-06-01'),
        createExperience('2', '2023-01-01', null)
      ]);

      const gaps1 = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      const gaps2 = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps1).toHaveLength(1);
      expect(gaps2).toHaveLength(1);
      expect(gaps1[0].id).toBe(gaps2[0].id); // Should generate consistent IDs
    });

    it('should handle empty timeline gracefully', () => {
      const profile = createMockProfile([], []);

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(0);
    });

    it('should handle single entry timeline gracefully', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', null)
      ]);

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(0);
    });
  });

  describe('Mixed Timeline Analysis', () => {
    it('should analyze combined experience and education timeline correctly', () => {
      const profile = createMockProfile(
        [
          createExperience('1', '2020-01-01', '2020-12-01'), // Job 1
          createExperience('2', '2023-01-01', null)          // Job 2 (gap after education)
        ],
        [
          createEducation('1', '2021-06-01', '2022-06-01')   // Education in between
        ]
      );

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      // Should detect gap between Job 1 end (Dec 2020) and Education start (Jun 2021)
      // Should detect gap between Education end (Jun 2022) and Job 2 start (Jan 2023)
      expect(gaps).toHaveLength(2);
      
      // Verify the gaps are in chronological order
      const sortedGaps = gaps.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
      expect(sortedGaps[0].startDate).toEqual(new Date('2020-12-01'));
      expect(sortedGaps[0].endDate).toEqual(new Date('2021-06-01'));
      
      expect(sortedGaps[1].startDate).toEqual(new Date('2022-06-01'));
      expect(sortedGaps[1].endDate).toEqual(new Date('2023-01-01'));
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 3.1: Calculate date differences between consecutive entries', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', '2022-06-01'),
        createExperience('2', '2022-12-01', null) // 6-month gap
      ]);

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      expect(gaps).toHaveLength(1);
      // Verify date calculation: Dec 1 - Jun 1 = ~183 days
      expect(gaps[0].durationDays).toBeCloseTo(183, -1); // Within 10 days tolerance
    });

    it('should satisfy Requirement 3.2: Trigger alerts for gaps exceeding 90 days', () => {
      const testCases = [
        { gapDays: 89, shouldDetect: false },  // Just under threshold
        { gapDays: 91, shouldDetect: true },   // Just over threshold
        { gapDays: 180, shouldDetect: true }   // Well over threshold
      ];

      testCases.forEach(({ gapDays, shouldDetect }) => {
        const endDate = new Date('2022-06-01');
        const startDate = new Date(endDate.getTime() + gapDays * 24 * 60 * 60 * 1000);
        
        const profile = createMockProfile([
          createExperience('1', '2022-01-01', '2022-06-01'),
          createExperience('2', startDate.toISOString().split('T')[0], null)
        ]);

        const gaps = movementAnalyzer.analyzeCompleteTimeline(
          profile.experience,
          profile.education
        );

        if (shouldDetect) {
          expect(gaps).toHaveLength(1);
          expect(gaps[0].durationDays).toBeGreaterThan(90);
        } else {
          expect(gaps).toHaveLength(0);
        }
      });
    });

    it('should satisfy Requirement 3.4: Maintain data integrity during analysis', () => {
      const profile = createMockProfile([
        createExperience('1', '2022-01-01', '2022-06-01'),
        createExperience('2', '2023-01-01', null)
      ]);

      // Verify original data is not modified
      const originalExperience = JSON.parse(JSON.stringify(profile.experience));
      const originalEducation = JSON.parse(JSON.stringify(profile.education));

      const gaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      // Verify original data is not modified (dates are objects, so we need to compare differently)
      const originalExperienceIds = originalExperience.map((exp: any) => exp.id);
      const currentExperienceIds = profile.experience.map(exp => exp.id);
      
      expect(currentExperienceIds).toEqual(originalExperienceIds);
      expect(profile.experience.length).toBe(originalExperience.length);
      expect(profile.education.length).toBe(originalEducation.length);
      
      // But gaps should be detected
      expect(gaps).toHaveLength(1);
    });
  });
});