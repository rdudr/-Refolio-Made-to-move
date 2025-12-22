/**
 * Tests for data validation utilities
 */

import {
  validatePersonalInfo,
  validateSkill,
  validateTimelineEntry,
  validateCareerGap,
  validateProfileData,
  calculateGapSeverity,
  calculateDurationDays
} from './validation';

import {
  PersonalInfo,
  Skill,
  TimelineEntry,
  CareerGap,
  ProfileData,
  SkillCategory,
  GapSeverity,
  SKILL_LEVEL_MIN,
  SKILL_LEVEL_MAX
} from '../types';

describe('Validation Utilities', () => {
  
  describe('validatePersonalInfo', () => {
    test('validates correct personal info', () => {
      const validPersonalInfo: PersonalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        location: 'New York, NY',
        linkedIn: 'https://linkedin.com/in/johndoe',
        portfolio: 'https://johndoe.dev'
      };

      const result = validatePersonalInfo(validPersonalInfo);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid email format', () => {
      const invalidPersonalInfo: PersonalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      };

      const result = validatePersonalInfo(invalidPersonalInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'email')).toBe(true);
    });

    test('rejects empty required fields', () => {
      const invalidPersonalInfo: PersonalInfo = {
        firstName: '',
        lastName: '',
        email: ''
      };

      const result = validatePersonalInfo(invalidPersonalInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('validateSkill', () => {
    test('validates correct skill', () => {
      const validSkill: Skill = {
        id: 'skill-1',
        name: 'JavaScript',
        level: 4,
        category: SkillCategory.TECHNICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateSkill(validSkill);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects skill level out of range', () => {
      const invalidSkill: Skill = {
        id: 'skill-1',
        name: 'JavaScript',
        level: 6, // Invalid level
        category: SkillCategory.TECHNICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateSkill(invalidSkill);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'level')).toBe(true);
    });

    test('rejects invalid skill category', () => {
      const invalidSkill: Skill = {
        id: 'skill-1',
        name: 'JavaScript',
        level: 4,
        category: 'invalid-category' as SkillCategory,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateSkill(invalidSkill);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.field === 'category')).toBe(true);
    });
  });

  describe('calculateGapSeverity', () => {
    test('calculates minor severity for short gaps', () => {
      expect(calculateGapSeverity(120)).toBe(GapSeverity.MINOR);
    });

    test('calculates moderate severity for medium gaps', () => {
      expect(calculateGapSeverity(200)).toBe(GapSeverity.MODERATE);
    });

    test('calculates major severity for long gaps', () => {
      expect(calculateGapSeverity(400)).toBe(GapSeverity.MAJOR);
    });
  });

  describe('calculateDurationDays', () => {
    test('calculates correct duration between dates', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const duration = calculateDurationDays(startDate, endDate);
      expect(duration).toBe(30);
    });

    test('handles same date correctly', () => {
      const date = new Date('2023-01-01');
      
      const duration = calculateDurationDays(date, date);
      expect(duration).toBe(0);
    });
  });
});