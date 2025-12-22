import { TimelineEntry, CareerGap, GapSeverity, CAREER_GAP_THRESHOLD_DAYS } from '../types';

/**
 * MovementAnalyzer Service
 * 
 * Analyzes career timeline data to detect gaps in employment or education.
 * Implements the Movement Logic for identifying periods exceeding 90 days
 * between consecutive timeline entries.
 */
export class MovementAnalyzer {
  /**
   * Detects career gaps in a timeline of entries
   * 
   * @param timeline Array of timeline entries (experience or education)
   * @returns Array of detected career gaps
   */
  detectGaps(timeline: TimelineEntry[]): CareerGap[] {
    if (!timeline || timeline.length === 0) {
      return [];
    }

    // Sort timeline entries by start date
    const sortedTimeline = [...timeline].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const gaps: CareerGap[] = [];
    
    for (let i = 0; i < sortedTimeline.length - 1; i++) {
      const currentEntry = sortedTimeline[i];
      const nextEntry = sortedTimeline[i + 1];
      
      // Use endDate if available, otherwise use startDate of next entry
      const currentEndDate = currentEntry.endDate || new Date();
      const nextStartDate = new Date(nextEntry.startDate);
      
      // Calculate gap in days
      const gapDurationMs = nextStartDate.getTime() - currentEndDate.getTime();
      const gapDurationDays = Math.floor(gapDurationMs / (1000 * 60 * 60 * 24));
      
      // Only create gap if it exceeds the threshold
      if (gapDurationDays > CAREER_GAP_THRESHOLD_DAYS) {
        const gap: CareerGap = {
          id: this.generateGapId(currentEndDate, nextStartDate),
          startDate: currentEndDate,
          endDate: nextStartDate,
          durationDays: gapDurationDays,
          type: this.determineGapType(currentEntry, nextEntry),
          severity: this.calculateSeverity(gapDurationDays),
          isResolved: false,
          createdAt: new Date()
        };
        
        gaps.push(gap);
      }
    }
    
    return gaps;
  }

  /**
   * Generates a unique ID for a career gap based on dates
   */
  private generateGapId(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `gap-${start}-to-${end}`;
  }

  /**
   * Determines the type of gap based on the surrounding entries
   */
  private determineGapType(currentEntry: TimelineEntry, nextEntry: TimelineEntry): 'employment' | 'education' {
    // Simple heuristic: if either entry mentions education-related terms, classify as education gap
    const educationKeywords = ['university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd', 'doctorate'];
    
    const currentIsEducation = educationKeywords.some(keyword => 
      currentEntry.title.toLowerCase().includes(keyword) || 
      currentEntry.organization.toLowerCase().includes(keyword)
    );
    
    const nextIsEducation = educationKeywords.some(keyword => 
      nextEntry.title.toLowerCase().includes(keyword) || 
      nextEntry.organization.toLowerCase().includes(keyword)
    );
    
    return (currentIsEducation || nextIsEducation) ? 'education' : 'employment';
  }

  /**
   * Calculates gap severity based on duration
   */
  private calculateSeverity(durationDays: number): 'minor' | 'moderate' | 'major' {
    if (durationDays <= 180) {
      return GapSeverity.MINOR;
    } else if (durationDays <= 365) {
      return GapSeverity.MODERATE;
    } else {
      return GapSeverity.MAJOR;
    }
  }

  /**
   * Analyzes a complete profile's timeline data
   * Combines experience and education entries for comprehensive gap detection
   */
  analyzeCompleteTimeline(experience: TimelineEntry[], education: TimelineEntry[]): CareerGap[] {
    const combinedTimeline = [...experience, ...education];
    return this.detectGaps(combinedTimeline);
  }

  /**
   * Recalculates gaps after timeline data changes
   * Maintains data integrity during analysis
   */
  recalculateGaps(
    previousGaps: CareerGap[], 
    updatedTimeline: TimelineEntry[]
  ): { gaps: CareerGap[], hasChanges: boolean } {
    const newGaps = this.detectGaps(updatedTimeline);
    
    // Check if gaps have changed
    const hasChanges = !this.areGapsEqual(previousGaps, newGaps);
    
    return {
      gaps: newGaps,
      hasChanges
    };
  }

  /**
   * Compares two gap arrays for equality
   */
  private areGapsEqual(gaps1: CareerGap[], gaps2: CareerGap[]): boolean {
    if (gaps1.length !== gaps2.length) {
      return false;
    }
    
    // Sort both arrays by start date for comparison
    const sorted1 = [...gaps1].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const sorted2 = [...gaps2].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    return sorted1.every((gap1, index) => {
      const gap2 = sorted2[index];
      return (
        gap1.startDate.getTime() === gap2.startDate.getTime() &&
        gap1.endDate.getTime() === gap2.endDate.getTime() &&
        gap1.durationDays === gap2.durationDays &&
        gap1.type === gap2.type
      );
    });
  }
}

// Export singleton instance
export const movementAnalyzer = new MovementAnalyzer();