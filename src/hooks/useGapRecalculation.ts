import { useCallback, useEffect, useRef } from 'react';
import { ProfileData, TimelineEntry, CareerGap } from '../types';
import { movementAnalyzer } from '../services/movementAnalyzer';

/**
 * Custom hook for automatic gap recalculation
 * Provides reactive updates when timeline data changes
 * Maintains data integrity during analysis
 */
export const useGapRecalculation = () => {
  // Track previous timeline data to detect changes
  const previousTimelineRef = useRef<TimelineEntry[]>([]);
  const isRecalculatingRef = useRef(false);

  /**
   * Recalculates career gaps for a given profile
   * Maintains data integrity by preserving resolved gaps and user notes
   */
  const recalculateGaps = useCallback((
    profile: ProfileData,
    onUpdate: (updates: Partial<ProfileData>) => void
  ): void => {
    // Prevent concurrent recalculations
    if (isRecalculatingRef.current) {
      return;
    }

    try {
      isRecalculatingRef.current = true;

      // Combine experience and education for comprehensive timeline analysis
      const combinedTimeline: TimelineEntry[] = [
        ...profile.experience,
        ...profile.education
      ];

      // Check if timeline data has actually changed
      const timelineChanged = hasTimelineChanged(
        previousTimelineRef.current,
        combinedTimeline
      );

      if (!timelineChanged) {
        return;
      }

      // Store current timeline for next comparison
      previousTimelineRef.current = [...combinedTimeline];

      // Detect new gaps using MovementAnalyzer
      const detectedGaps = movementAnalyzer.analyzeCompleteTimeline(
        profile.experience,
        profile.education
      );

      // Preserve existing gap data (resolved status, notes, etc.)
      const updatedGaps = mergeGapData(profile.careerGaps || [], detectedGaps);

      // Update profile with new gap information
      const updates: Partial<ProfileData> = {
        careerGaps: updatedGaps,
        lastAnalyzed: new Date(),
        updatedAt: new Date()
      };

      onUpdate(updates);

    } catch (error) {
      console.error('Error during gap recalculation:', error);
      // Don't throw - maintain data integrity by continuing with existing data
    } finally {
      isRecalculatingRef.current = false;
    }
  }, []);

  /**
   * Checks if timeline data has changed by comparing entries
   */
  const hasTimelineChanged = useCallback((
    previous: TimelineEntry[],
    current: TimelineEntry[]
  ): boolean => {
    if (previous.length !== current.length) {
      return true;
    }

    // Sort both arrays by start date for consistent comparison
    const sortedPrevious = [...previous].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    const sortedCurrent = [...current].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Compare each entry for changes
    return sortedPrevious.some((prevEntry, index) => {
      const currentEntry = sortedCurrent[index];
      return (
        prevEntry.id !== currentEntry.id ||
        prevEntry.startDate.getTime() !== currentEntry.startDate.getTime() ||
        (prevEntry.endDate?.getTime() || 0) !== (currentEntry.endDate?.getTime() || 0) ||
        prevEntry.title !== currentEntry.title ||
        prevEntry.organization !== currentEntry.organization
      );
    });
  }, []);

  /**
   * Merges existing gap data with newly detected gaps
   * Preserves user modifications (resolved status, notes) while updating gap information
   */
  const mergeGapData = useCallback((
    existingGaps: CareerGap[],
    detectedGaps: CareerGap[]
  ): CareerGap[] => {
    const mergedGaps: CareerGap[] = [];

    // Process each detected gap
    (detectedGaps || []).forEach(detectedGap => {
      // Find matching existing gap by date range
      const existingGap = existingGaps.find(existing => 
        Math.abs(existing.startDate.getTime() - detectedGap.startDate.getTime()) < 24 * 60 * 60 * 1000 && // Within 1 day
        Math.abs(existing.endDate.getTime() - detectedGap.endDate.getTime()) < 24 * 60 * 60 * 1000
      );

      if (existingGap) {
        // Preserve user data while updating calculated fields
        mergedGaps.push({
          ...detectedGap,
          id: existingGap.id, // Keep original ID
          isResolved: existingGap.isResolved, // Preserve resolution status
          notes: existingGap.notes, // Preserve user notes
          createdAt: existingGap.createdAt // Keep original creation date
        });
      } else {
        // New gap - use detected data as-is
        mergedGaps.push(detectedGap);
      }
    });

    // Add any resolved gaps that are no longer detected but should be preserved
    (existingGaps || []).forEach(existingGap => {
      if (existingGap.isResolved) {
        const stillExists = mergedGaps.some(merged => merged.id === existingGap.id);
        if (!stillExists) {
          // Keep resolved gaps even if they're no longer detected
          mergedGaps.push(existingGap);
        }
      }
    });

    return mergedGaps;
  }, []);

  /**
   * Sets up automatic recalculation when profile data changes
   */
  const setupAutoRecalculation = useCallback((
    profile: ProfileData | null,
    onUpdate: (updates: Partial<ProfileData>) => void
  ) => {
    if (!profile) {
      return;
    }

    // Trigger recalculation
    recalculateGaps(profile, onUpdate);
  }, [recalculateGaps]);

  return {
    recalculateGaps,
    setupAutoRecalculation,
    hasTimelineChanged,
    mergeGapData
  };
};