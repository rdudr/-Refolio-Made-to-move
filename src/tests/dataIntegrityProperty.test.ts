/**
 * Property-Based Test for Data Integrity During Operations
 * **Feature: refolio-platform, Property 8: Data integrity during operations**
 * **Validates: Requirements 3.4, 6.3**
 */

import { ProfileData, ExperienceEntry, EducationEntry, CareerGap, Skill, Project } from '../types';
import { movementAnalyzer } from '../services/movementAnalyzer';
import { useGapRecalculation } from '../hooks/useGapRecalculation';
import { renderHook } from '@testing-library/react';

// Simple generators for property-based testing
const generateRandomDate = (start: Date = new Date('2020-01-01'), end: Date = new Date('2025-12-31')): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateExperienceEntry = (id?: string): ExperienceEntry => {
  const startDate = generateRandomDate();
  const endDate = Math.random() > 0.3 ? generateRandomDate(startDate) : null;
  
  return {
    id: id || `exp-${Math.random().toString(36).substring(2, 11)}`,
    title: `Job Title ${Math.random().toString(36).substring(2, 7)}`,
    organization: `Company ${Math.random().toString(36).substring(2, 7)}`,
    location: Math.random() > 0.5 ? `City ${Math.random().toString(36).substring(2, 5)}` : undefined,
    description: Math.random() > 0.5 ? `Description ${Math.random().toString(36).substring(2, 12)}` : undefined,
    achievements: Math.random() > 0.5 ? [`Achievement ${Math.random().toString(36).substring(2, 7)}`] : [],
    startDate,
    endDate,
    createdAt: generateRandomDate(),
    updatedAt: generateRandomDate()
  };
};

const generateEducationEntry = (id?: string): EducationEntry => {
  const startDate = generateRandomDate();
  const endDate = Math.random() > 0.2 ? generateRandomDate(startDate) : null;
  
  return {
    id: id || `edu-${Math.random().toString(36).substring(2, 11)}`,
    title: `Program ${Math.random().toString(36).substring(2, 7)}`,
    organization: `University ${Math.random().toString(36).substring(2, 7)}`,
    location: Math.random() > 0.5 ? `City ${Math.random().toString(36).substring(2, 5)}` : undefined,
    degree: `Degree ${Math.random().toString(36).substring(2, 7)}`,
    fieldOfStudy: Math.random() > 0.5 ? `Field ${Math.random().toString(36).substring(2, 7)}` : undefined,
    gpa: Math.random() > 0.5 ? Math.random() * 4 : undefined,
    startDate,
    endDate,
    createdAt: generateRandomDate(),
    updatedAt: generateRandomDate()
  };
};

const generateSkill = (id?: string): Skill => ({
  id: id || `skill-${Math.random().toString(36).substring(2, 11)}`,
  name: `Skill ${Math.random().toString(36).substring(2, 7)}`,
  level: Math.floor(Math.random() * 5) + 1,
  category: `Category ${Math.random().toString(36).substring(2, 7)}`,
  createdAt: generateRandomDate(),
  updatedAt: generateRandomDate()
});

const generateProject = (): Project => ({
  name: `Project ${Math.random().toString(36).substring(2, 7)}`,
  description: `Description ${Math.random().toString(36).substring(2, 12)}`,
  technologies: [`Tech ${Math.random().toString(36).substring(2, 5)}`],
  url: Math.random() > 0.5 ? `https://project${Math.random().toString(36).substring(2, 7)}.com` : undefined,
  startDate: Math.random() > 0.5 ? generateRandomDate() : undefined,
  endDate: Math.random() > 0.5 ? generateRandomDate() : undefined
});

const generateCareerGap = (id?: string): CareerGap => {
  const startDate = generateRandomDate();
  const endDate = generateRandomDate(startDate);
  const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    id: id || `gap-${Math.random().toString(36).substring(2, 11)}`,
    startDate,
    endDate,
    durationDays,
    type: Math.random() > 0.5 ? 'employment' : 'education',
    severity: durationDays > 365 ? 'major' : durationDays > 180 ? 'moderate' : 'minor',
    isResolved: Math.random() > 0.7,
    notes: Math.random() > 0.5 ? `Note ${Math.random().toString(36).substring(2, 12)}` : undefined,
    createdAt: generateRandomDate()
  };
};

const generateProfileData = (): ProfileData => ({
  id: `profile-${Math.random().toString(36).substring(2, 11)}`,
  personalInfo: {
    firstName: `First${Math.random().toString(36).substring(2, 7)}`,
    lastName: `Last${Math.random().toString(36).substring(2, 7)}`,
    email: `test${Math.random().toString(36).substring(2, 7)}@example.com`,
    phone: Math.random() > 0.5 ? `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}` : undefined,
    location: Math.random() > 0.5 ? `City ${Math.random().toString(36).substring(2, 5)}` : undefined,
    linkedIn: Math.random() > 0.5 ? `https://linkedin.com/in/user${Math.random().toString(36).substring(2, 7)}` : undefined,
    portfolio: Math.random() > 0.5 ? `https://portfolio${Math.random().toString(36).substring(2, 7)}.com` : undefined
  },
  experience: Array.from({ length: Math.floor(Math.random() * 5) }, () => generateExperienceEntry()),
  education: Array.from({ length: Math.floor(Math.random() * 3) }, () => generateEducationEntry()),
  skills: Array.from({ length: Math.floor(Math.random() * 5) }, () => generateSkill()),
  projects: Array.from({ length: Math.floor(Math.random() * 3) }, () => generateProject()),
  careerGaps: Array.from({ length: Math.floor(Math.random() * 3) }, () => generateCareerGap()),
  version: Math.floor(Math.random() * 10) + 1,
  isComplete: Math.random() > 0.5,
  lastAnalyzed: Math.random() > 0.5 ? generateRandomDate() : undefined,
  createdAt: generateRandomDate(),
  updatedAt: generateRandomDate()
});

describe('Property 8: Data integrity during operations', () => {
  /**
   * **Feature: refolio-platform, Property 8: Data integrity during operations**
   * **Validates: Requirements 3.4, 6.3**
   */
  
  describe('Movement Analyzer Data Integrity', () => {
    it('should not modify original timeline data during gap analysis', () => {
      // Run property-based test with multiple iterations
      for (let i = 0; i < 100; i++) {
        const experience = Array.from({ length: Math.floor(Math.random() * 5) }, () => generateExperienceEntry());
        const education = Array.from({ length: Math.floor(Math.random() * 3) }, () => generateEducationEntry());

        // Create deep copies of original data
        const originalExperience = JSON.parse(JSON.stringify(experience));
        const originalEducation = JSON.parse(JSON.stringify(education));

        // Perform gap analysis
        const gaps = movementAnalyzer.analyzeCompleteTimeline(experience, education);

        // Verify original data is unchanged
        expect(JSON.stringify(experience)).toBe(JSON.stringify(originalExperience));
        expect(JSON.stringify(education)).toBe(JSON.stringify(originalEducation));

        // Verify gaps is a valid array
        expect(Array.isArray(gaps)).toBe(true);
        
        // Verify each gap has required properties
        gaps.forEach((gap: CareerGap) => {
          expect(gap).toHaveProperty('id');
          expect(gap).toHaveProperty('startDate');
          expect(gap).toHaveProperty('endDate');
          expect(gap).toHaveProperty('durationDays');
          expect(gap).toHaveProperty('type');
          expect(gap).toHaveProperty('severity');
          expect(gap).toHaveProperty('isResolved');
          expect(gap).toHaveProperty('createdAt');
          
          // Verify data types
          expect(typeof gap.id).toBe('string');
          expect(gap.startDate).toBeInstanceOf(Date);
          expect(gap.endDate).toBeInstanceOf(Date);
          expect(typeof gap.durationDays).toBe('number');
          expect(['employment', 'education']).toContain(gap.type);
          expect(['minor', 'moderate', 'major']).toContain(gap.severity);
          expect(typeof gap.isResolved).toBe('boolean');
          expect(gap.createdAt).toBeInstanceOf(Date);
        });
      }
    });

    it('should produce consistent results for identical input', () => {
      // Run property-based test with multiple iterations
      for (let i = 0; i < 50; i++) {
        const experience = Array.from({ length: Math.floor(Math.random() * 5) }, () => generateExperienceEntry());
        const education = Array.from({ length: Math.floor(Math.random() * 3) }, () => generateEducationEntry());

        // Run analysis twice with identical data
        const gaps1 = movementAnalyzer.analyzeCompleteTimeline(experience, education);
        const gaps2 = movementAnalyzer.analyzeCompleteTimeline(experience, education);

        // Results should be identical
        expect(gaps1.length).toBe(gaps2.length);
        
        // Sort both arrays by start date for comparison
        const sorted1 = gaps1.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const sorted2 = gaps2.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        sorted1.forEach((gap1, index) => {
          const gap2 = sorted2[index];
          expect(gap1.id).toBe(gap2.id);
          expect(gap1.startDate.getTime()).toBe(gap2.startDate.getTime());
          expect(gap1.endDate.getTime()).toBe(gap2.endDate.getTime());
          expect(gap1.durationDays).toBe(gap2.durationDays);
          expect(gap1.type).toBe(gap2.type);
          expect(gap1.severity).toBe(gap2.severity);
        });
      }
    });
  });

  describe('Gap Recalculation Hook Data Integrity', () => {
    it('should preserve user data when merging gap information', () => {
      // Run property-based test with multiple iterations
      for (let i = 0; i < 50; i++) {
        const existingGaps = Array.from({ length: Math.floor(Math.random() * 3) }, () => generateCareerGap());
        const detectedGaps = Array.from({ length: Math.floor(Math.random() * 3) }, () => generateCareerGap());

        const { result } = renderHook(() => useGapRecalculation());

        // Mark some existing gaps as resolved with notes
        const existingWithUserData = existingGaps.map(gap => ({
          ...gap,
          isResolved: Math.random() > 0.5,
          notes: Math.random() > 0.5 ? 'User explanation' : undefined
        }));

        const merged = result.current.mergeGapData(existingWithUserData, detectedGaps);

        // Verify merged result is valid
        expect(Array.isArray(merged)).toBe(true);

        // Verify user data is preserved for matching gaps
        existingWithUserData.forEach(existingGap => {
          if (existingGap.isResolved) {
            // Resolved gaps should be preserved
            const preserved = merged.find(m => 
              Math.abs(m.startDate.getTime() - existingGap.startDate.getTime()) < 24 * 60 * 60 * 1000 &&
              Math.abs(m.endDate.getTime() - existingGap.endDate.getTime()) < 24 * 60 * 60 * 1000
            );
            
            if (preserved) {
              expect(preserved.isResolved).toBe(true);
              if (existingGap.notes) {
                expect(preserved.notes).toBe(existingGap.notes);
              }
            }
          }
        });

        // Verify all merged gaps have valid structure
        merged.forEach(gap => {
          expect(gap).toHaveProperty('id');
          expect(gap).toHaveProperty('startDate');
          expect(gap).toHaveProperty('endDate');
          expect(gap).toHaveProperty('durationDays');
          expect(gap).toHaveProperty('type');
          expect(gap).toHaveProperty('severity');
          expect(gap).toHaveProperty('isResolved');
          expect(gap).toHaveProperty('createdAt');
        });
      }
    });

    it('should detect timeline changes accurately without data corruption', () => {
      // Run property-based test with multiple iterations
      for (let i = 0; i < 50; i++) {
        const timeline1 = Array.from({ length: Math.floor(Math.random() * 5) }, () => generateExperienceEntry());
        const timeline2 = Array.from({ length: Math.floor(Math.random() * 3) }, () => generateEducationEntry());

        const { result } = renderHook(() => useGapRecalculation());

        // Create combined timelines
        const combined1 = [...timeline1, ...timeline2];
        const combined2 = [...timeline1, ...timeline2];

        // Test with identical timelines
        const hasChanged1 = result.current.hasTimelineChanged(combined1, combined2);
        expect(hasChanged1).toBe(false);

        // Verify original data is not modified
        const originalCombined1 = JSON.stringify(combined1);
        const originalCombined2 = JSON.stringify(combined2);
        
        // Call the function again
        result.current.hasTimelineChanged(combined1, combined2);
        
        // Data should remain unchanged
        expect(JSON.stringify(combined1)).toBe(originalCombined1);
        expect(JSON.stringify(combined2)).toBe(originalCombined2);
      }
    });
  });

  describe('Profile Data Structure Integrity', () => {
    it('should maintain valid profile structure during gap recalculation', () => {
      // Run property-based test with multiple iterations
      for (let i = 0; i < 50; i++) {
        const profile = generateProfileData();
        const { result } = renderHook(() => useGapRecalculation());

        // Create a mock update function that captures the updates
        let capturedUpdates: Partial<ProfileData> | null = null;
        const mockOnUpdate = (updates: Partial<ProfileData>) => {
          capturedUpdates = updates;
        };

        // Perform recalculation
        result.current.recalculateGaps(profile, mockOnUpdate);

        // Verify original profile structure is intact
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('personalInfo');
        expect(profile).toHaveProperty('experience');
        expect(profile).toHaveProperty('education');
        expect(profile).toHaveProperty('skills');
        expect(profile).toHaveProperty('projects');
        expect(profile).toHaveProperty('careerGaps');
        expect(profile).toHaveProperty('version');
        expect(profile).toHaveProperty('isComplete');
        expect(profile).toHaveProperty('createdAt');
        expect(profile).toHaveProperty('updatedAt');

        // Verify arrays remain arrays
        expect(Array.isArray(profile.experience)).toBe(true);
        expect(Array.isArray(profile.education)).toBe(true);
        expect(Array.isArray(profile.skills)).toBe(true);
        expect(Array.isArray(profile.projects)).toBe(true);
        expect(Array.isArray(profile.careerGaps)).toBe(true);

        // If updates were captured, verify they have valid structure
        if (capturedUpdates) {
          if ((capturedUpdates as any).careerGaps) {
            expect(Array.isArray((capturedUpdates as any).careerGaps)).toBe(true);
            (capturedUpdates as any).careerGaps.forEach((gap: any) => {
              expect(gap).toHaveProperty('id');
              expect(gap).toHaveProperty('startDate');
              expect(gap).toHaveProperty('endDate');
              expect(gap).toHaveProperty('durationDays');
              expect(gap).toHaveProperty('type');
              expect(gap).toHaveProperty('severity');
              expect(gap).toHaveProperty('isResolved');
              expect(gap).toHaveProperty('createdAt');
            });
          }
          
          if ((capturedUpdates as any).lastAnalyzed) {
            expect((capturedUpdates as any).lastAnalyzed).toBeInstanceOf(Date);
          }
          
          if ((capturedUpdates as any).updatedAt) {
            expect((capturedUpdates as any).updatedAt).toBeInstanceOf(Date);
          }
        }
      }
    });
  });
});