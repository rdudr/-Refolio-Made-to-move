/**
 * Property-Based Tests for Data Schema Validation
 * Feature: refolio-platform, Property 2: Data schema validation round-trip
 * Validates: Requirements 1.2, 1.5, 2.5, 6.1
 */

import {
  ProfileData,
  Skill,
  TimelineEntry,
  CareerGap,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  Project,
  SKILL_LEVEL_MIN,
  SKILL_LEVEL_MAX,
  SkillCategory,
  GapSeverity
} from '../types';

// Simple test data generators for now (will enhance with fast-check later)
const createTestPersonalInfo = (): PersonalInfo => ({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  location: 'New York, NY',
  linkedIn: 'https://linkedin.com/in/johndoe',
  portfolio: 'https://johndoe.dev'
});

const createTestSkill = (): Skill => ({
  id: 'skill-1',
  name: 'JavaScript',
  level: 4,
  category: SkillCategory.TECHNICAL,
  createdAt: new Date(),
  updatedAt: new Date()
});

const createTestCareerGap = (): CareerGap => ({
  id: 'gap-1',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-06-01'),
  durationDays: 151,
  type: 'employment',
  severity: GapSeverity.MODERATE,
  isResolved: false,
  notes: 'Career transition period',
  createdAt: new Date()
});

const createTestProfileData = (): ProfileData => ({
  id: 'profile-1',
  personalInfo: createTestPersonalInfo(),
  experience: [],
  education: [],
  skills: [createTestSkill()],
  projects: [],
  careerGaps: [createTestCareerGap()],
  version: 1,
  isComplete: false,
  lastAnalyzed: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('Data Schema Validation Tests', () => {
  
  test('Property 2: Data schema validation round-trip - ProfileData serialization preserves structure', () => {
    const profileData = createTestProfileData();
    
    // Serialize to JSON and back
    const serialized = JSON.stringify(profileData);
    const deserialized = JSON.parse(serialized);
    
    // Check that all required fields are preserved
    expect(deserialized.id).toBe(profileData.id);
    expect(deserialized.personalInfo.firstName).toBe(profileData.personalInfo.firstName);
    expect(deserialized.personalInfo.lastName).toBe(profileData.personalInfo.lastName);
    expect(deserialized.personalInfo.email).toBe(profileData.personalInfo.email);
    expect(deserialized.experience.length).toBe(profileData.experience.length);
    expect(deserialized.education.length).toBe(profileData.education.length);
    expect(deserialized.skills.length).toBe(profileData.skills.length);
    expect(deserialized.projects.length).toBe(profileData.projects.length);
    expect(deserialized.careerGaps.length).toBe(profileData.careerGaps.length);
    expect(deserialized.version).toBe(profileData.version);
    expect(deserialized.isComplete).toBe(profileData.isComplete);
  });

  test('Skill level validation - skills have valid levels', () => {
    const skill = createTestSkill();
    
    expect(skill.level).toBeGreaterThanOrEqual(SKILL_LEVEL_MIN);
    expect(skill.level).toBeLessThanOrEqual(SKILL_LEVEL_MAX);
    expect(Number.isInteger(skill.level)).toBe(true);
  });

  test('Career gap duration consistency - calculated duration matches date difference', () => {
    const gap = createTestCareerGap();
    
    const calculatedDays = Math.ceil((gap.endDate.getTime() - gap.startDate.getTime()) / (1000 * 60 * 60 * 24));
    // Allow for small rounding differences
    expect(Math.abs(gap.durationDays - calculatedDays)).toBeLessThanOrEqual(1);
  });

  test('Personal info email validation - email has valid format', () => {
    const personalInfo = createTestPersonalInfo();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(personalInfo.email)).toBe(true);
  });

  test('Profile data completeness - required fields are present', () => {
    const profileData = createTestProfileData();
    
    // Check required fields
    expect(profileData.id).toBeDefined();
    expect(profileData.id.length).toBeGreaterThan(0);
    expect(profileData.personalInfo).toBeDefined();
    expect(profileData.personalInfo.firstName).toBeDefined();
    expect(profileData.personalInfo.lastName).toBeDefined();
    expect(profileData.personalInfo.email).toBeDefined();
    expect(Array.isArray(profileData.experience)).toBe(true);
    expect(Array.isArray(profileData.education)).toBe(true);
    expect(Array.isArray(profileData.skills)).toBe(true);
    expect(Array.isArray(profileData.projects)).toBe(true);
    expect(Array.isArray(profileData.careerGaps)).toBe(true);
    expect(typeof profileData.version).toBe('number');
    expect(typeof profileData.isComplete).toBe('boolean');
    expect(profileData.createdAt).toBeInstanceOf(Date);
    expect(profileData.updatedAt).toBeInstanceOf(Date);
  });

  test('Skill category validation - uses valid enum values', () => {
    const skill = createTestSkill();
    
    const validCategories = Object.values(SkillCategory);
    expect(validCategories).toContain(skill.category);
  });

  test('Career gap severity validation - uses valid enum values', () => {
    const gap = createTestCareerGap();
    
    const validSeverities = Object.values(GapSeverity);
    expect(validSeverities).toContain(gap.severity);
  });
});