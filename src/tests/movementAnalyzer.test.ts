/**
 * Property-Based Tests for Career Gap Detection
 * Feature: refolio-platform, Property 4: Career gap detection accuracy
 * Validates: Requirements 3.1, 3.2
 */

import { MovementAnalyzer } from '../services/movementAnalyzer';
import { TimelineEntry, CareerGap, CAREER_GAP_THRESHOLD_DAYS } from '../types';

describe('MovementAnalyzer Property Tests', () => {
  let analyzer: MovementAnalyzer;

  beforeEach(() => {
    analyzer = new MovementAnalyzer();
  });

  // Helper function to generate random dates within a range
  const randomDate = (start: Date, end: Date): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  // Helper function to generate random timeline entries
  const generateTimelineEntry = (id: string, startDate: Date, endDate?: Date | null): TimelineEntry => ({
    id,
    startDate,
    endDate: endDate === undefined ? (Math.random() > 0.3 ? randomDate(startDate, new Date('2030-12-31')) : null) : endDate,
    title: `Position ${id}`,
    organization: `Company ${id}`,
    location: `City ${id}`,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Helper function to generate timeline with known gaps
  const generateTimelineWithGap = (gapDays: number): TimelineEntry[] => {
    const startDate1 = new Date('2023-01-01');
    const endDate1 = new Date('2023-06-01');
    const startDate2 = new Date(endDate1.getTime() + gapDays * 24 * 60 * 60 * 1000);
    
    return [
      generateTimelineEntry('1', startDate1, endDate1),
      generateTimelineEntry('2', startDate2, null)
    ];
  };

  test('Property 4: Career gap detection accuracy - gaps exceeding 90 days are detected', () => {
    // Run property test with multiple iterations
    for (let i = 0; i < 100; i++) {
      // Generate random gap duration above threshold
      const gapDays = CAREER_GAP_THRESHOLD_DAYS + 1 + Math.floor(Math.random() * 365);
      const timeline = generateTimelineWithGap(gapDays);
      
      const gaps = analyzer.detectGaps(timeline);
      
      // Property: Should detect exactly one gap
      expect(gaps.length).toBe(1);
      
      const gap = gaps[0];
      
      // Property: Gap duration should exceed threshold
      expect(gap.durationDays).toBeGreaterThan(CAREER_GAP_THRESHOLD_DAYS);
      
      // Property: Gap should have valid structure
      expect(gap.startDate).toBeInstanceOf(Date);
      expect(gap.endDate).toBeInstanceOf(Date);
      expect(gap.endDate.getTime()).toBeGreaterThan(gap.startDate.getTime());
      expect(gap.type).toMatch(/^(employment|education)$/);
      expect(gap.severity).toMatch(/^(minor|moderate|major)$/);
      expect(typeof gap.isResolved).toBe('boolean');
      expect(gap.id).toBeDefined();
      expect(gap.createdAt).toBeInstanceOf(Date);
      
      // Property: Calculated duration should match expected duration (within 1 day tolerance)
      expect(Math.abs(gap.durationDays - gapDays)).toBeLessThanOrEqual(1);
    }
  });

  test('Property 4: No gaps detected when timeline entries are continuous', () => {
    // Run property test with multiple iterations
    for (let i = 0; i < 100; i++) {
      // Generate random gap duration below threshold
      const gapDays = Math.floor(Math.random() * CAREER_GAP_THRESHOLD_DAYS);
      const timeline = generateTimelineWithGap(gapDays);
      
      const gaps = analyzer.detectGaps(timeline);
      
      // Property: Should detect no gaps since all are under threshold
      expect(gaps.length).toBe(0);
    }
  });

  test('Property 4: Empty or single-entry timeline produces no gaps', () => {
    // Test empty timeline
    const emptyGaps = analyzer.detectGaps([]);
    expect(emptyGaps.length).toBe(0);
    
    // Test single entry timeline (run multiple times with different entries)
    for (let i = 0; i < 50; i++) {
      const singleEntry = generateTimelineEntry('single', randomDate(new Date('2020-01-01'), new Date('2025-01-01')));
      const singleGaps = analyzer.detectGaps([singleEntry]);
      expect(singleGaps.length).toBe(0);
    }
  });

  test('Property 4: Gap duration calculation is accurate', () => {
    // Run property test with multiple iterations
    for (let i = 0; i < 100; i++) {
      // Generate a gap that's guaranteed to be above threshold
      const gapDays = CAREER_GAP_THRESHOLD_DAYS + 1 + Math.floor(Math.random() * 365); // 91-456 days
      const startDate = new Date('2023-01-01');
      const endDate = new Date(startDate.getTime() + gapDays * 24 * 60 * 60 * 1000);
      
      // Create two timeline entries with a specific gap
      const entry1: TimelineEntry = {
        id: 'entry1',
        startDate: new Date('2022-01-01'),
        endDate: startDate,
        title: 'Job 1',
        organization: 'Company 1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const entry2: TimelineEntry = {
        id: 'entry2',
        startDate: endDate,
        endDate: null,
        title: 'Job 2',
        organization: 'Company 2',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const timeline = [entry1, entry2];
      const gaps = analyzer.detectGaps(timeline);

      // Should always detect exactly one gap since we ensured it's above threshold
      expect(gaps.length).toBe(1);
      expect(Math.abs(gaps[0].durationDays - gapDays)).toBeLessThanOrEqual(1);
    }
  });

  test('Property 4: Gap type classification is consistent', () => {
    // Test education-related keywords
    const educationKeywords = ['university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd', 'doctorate'];
    
    for (let i = 0; i < 50; i++) {
      const keyword = educationKeywords[Math.floor(Math.random() * educationKeywords.length)];
      const startDate = new Date('2023-01-01');
      const gapStart = new Date('2023-06-01');
      const gapEnd = new Date('2023-12-01'); // 183 days gap

      const entry1: TimelineEntry = {
        id: 'entry1',
        startDate,
        endDate: gapStart,
        title: `${keyword} Program`,
        organization: 'Test Organization',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const entry2: TimelineEntry = {
        id: 'entry2',
        startDate: gapEnd,
        endDate: null,
        title: 'Job Title',
        organization: 'Company',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const timeline = [entry1, entry2];
      const gaps = analyzer.detectGaps(timeline);

      expect(gaps.length).toBe(1);
      expect(gaps[0].type).toBe('education');
    }
    
    // Test employment classification (no education keywords)
    for (let i = 0; i < 50; i++) {
      const startDate = new Date('2023-01-01');
      const gapStart = new Date('2023-06-01');
      const gapEnd = new Date('2023-12-01'); // 183 days gap

      const entry1: TimelineEntry = {
        id: 'entry1',
        startDate,
        endDate: gapStart,
        title: 'Software Engineer',
        organization: 'Tech Company',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const entry2: TimelineEntry = {
        id: 'entry2',
        startDate: gapEnd,
        endDate: null,
        title: 'Senior Developer',
        organization: 'Another Company',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const timeline = [entry1, entry2];
      const gaps = analyzer.detectGaps(timeline);

      expect(gaps.length).toBe(1);
      expect(gaps[0].type).toBe('employment');
    }
  });

  test('Property 4: Multiple gaps are detected correctly', () => {
    // Run property test with multiple iterations
    for (let i = 0; i < 50; i++) {
      const numEntries = 3 + Math.floor(Math.random() * 3); // 3-5 entries
      const timeline: TimelineEntry[] = [];
      let currentDate = new Date('2020-01-01');
      
      for (let j = 0; j < numEntries; j++) {
        const entryDuration = 30 + Math.floor(Math.random() * 300); // 30-330 days
        const endDate = new Date(currentDate.getTime() + entryDuration * 24 * 60 * 60 * 1000);
        
        timeline.push(generateTimelineEntry(`entry${j}`, currentDate, endDate));
        
        // Add gap before next entry (if not last entry)
        if (j < numEntries - 1) {
          const gapDuration = 50 + Math.floor(Math.random() * 200); // 50-250 days
          currentDate = new Date(endDate.getTime() + gapDuration * 24 * 60 * 60 * 1000);
        }
      }
      
      const gaps = analyzer.detectGaps(timeline);
      
      // Count expected gaps (those > 90 days)
      let expectedGaps = 0;
      for (let j = 0; j < timeline.length - 1; j++) {
        const currentEnd = timeline[j].endDate!;
        const nextStart = timeline[j + 1].startDate;
        const gapDays = Math.floor((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
        if (gapDays > CAREER_GAP_THRESHOLD_DAYS) {
          expectedGaps++;
        }
      }
      
      // Property: Number of detected gaps should match expected gaps
      expect(gaps.length).toBe(expectedGaps);
      
      // Property: All detected gaps should exceed threshold
      gaps.forEach(gap => {
        expect(gap.durationDays).toBeGreaterThan(CAREER_GAP_THRESHOLD_DAYS);
      });
    }
  });

  test('Property 4: Severity classification is consistent with duration', () => {
    // Test different gap durations and verify severity classification
    const testCases = [
      { days: 100, expectedSeverity: 'minor' },
      { days: 150, expectedSeverity: 'minor' },
      { days: 200, expectedSeverity: 'moderate' },
      { days: 300, expectedSeverity: 'moderate' },
      { days: 400, expectedSeverity: 'major' },
      { days: 500, expectedSeverity: 'major' }
    ];
    
    testCases.forEach(({ days, expectedSeverity }) => {
      const timeline = generateTimelineWithGap(days);
      const gaps = analyzer.detectGaps(timeline);
      
      expect(gaps.length).toBe(1);
      expect(gaps[0].severity).toBe(expectedSeverity);
    });
  });
});