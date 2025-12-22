/**
 * Data validation utilities for Refolio platform
 * Implements validation functions for all data types
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
  ValidationResult,
  ValidationError,
  ValidatorFunction,
  SKILL_LEVEL_MIN,
  SKILL_LEVEL_MAX,
  CAREER_GAP_THRESHOLD_DAYS,
  SkillCategory,
  GapSeverity
} from '../types';

/**
 * Creates a validation error
 */
const createValidationError = (field: string, message: string, code: string): ValidationError => ({
  field,
  message,
  code
});

/**
 * Creates a successful validation result
 */
const createSuccessResult = (): ValidationResult => ({
  isValid: true,
  errors: []
});

/**
 * Creates a failed validation result
 */
const createFailureResult = (errors: ValidationError[]): ValidationResult => ({
  isValid: false,
  errors
});

/**
 * Validates email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates phone number format (basic validation)
 */
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Validates that a date is not in the future
 */
const isNotFutureDate = (date: Date): boolean => {
  return date.getTime() <= Date.now();
};

/**
 * Validates that start date is before end date
 */
const isValidDateRange = (startDate: Date, endDate: Date | null): boolean => {
  if (endDate === null) return true; // Ongoing entries are valid
  return startDate.getTime() <= endDate.getTime();
};

/**
 * Validates PersonalInfo
 */
export const validatePersonalInfo: ValidatorFunction<PersonalInfo> = (personalInfo) => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!personalInfo.firstName || personalInfo.firstName.trim().length === 0) {
    errors.push(createValidationError('firstName', 'First name is required', 'REQUIRED_FIELD'));
  }

  if (!personalInfo.lastName || personalInfo.lastName.trim().length === 0) {
    errors.push(createValidationError('lastName', 'Last name is required', 'REQUIRED_FIELD'));
  }

  if (!personalInfo.email || personalInfo.email.trim().length === 0) {
    errors.push(createValidationError('email', 'Email is required', 'REQUIRED_FIELD'));
  } else if (!isValidEmail(personalInfo.email)) {
    errors.push(createValidationError('email', 'Invalid email format', 'INVALID_FORMAT'));
  }

  // Optional fields validation
  if (personalInfo.phone && !isValidPhone(personalInfo.phone)) {
    errors.push(createValidationError('phone', 'Invalid phone number format', 'INVALID_FORMAT'));
  }

  if (personalInfo.linkedIn && !isValidUrl(personalInfo.linkedIn)) {
    errors.push(createValidationError('linkedIn', 'Invalid LinkedIn URL format', 'INVALID_FORMAT'));
  }

  if (personalInfo.portfolio && !isValidUrl(personalInfo.portfolio)) {
    errors.push(createValidationError('portfolio', 'Invalid portfolio URL format', 'INVALID_FORMAT'));
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Validates PersonalInfo (allows partial data for forms)
 */
export const validatePersonalInfoPartial = (personalInfo: Partial<PersonalInfo>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields (only validate if present)
  if (personalInfo.firstName !== undefined && personalInfo.firstName.trim().length === 0) {
    errors.push(createValidationError('firstName', 'First name cannot be empty', 'REQUIRED_FIELD'));
  }

  if (personalInfo.lastName !== undefined && personalInfo.lastName.trim().length === 0) {
    errors.push(createValidationError('lastName', 'Last name cannot be empty', 'REQUIRED_FIELD'));
  }

  if (personalInfo.email !== undefined) {
    if (personalInfo.email.trim().length === 0) {
      errors.push(createValidationError('email', 'Email cannot be empty', 'REQUIRED_FIELD'));
    } else if (!isValidEmail(personalInfo.email)) {
      errors.push(createValidationError('email', 'Invalid email format', 'INVALID_FORMAT'));
    }
  }

  // Optional fields validation (only validate if present and not empty)
  if (personalInfo.phone && personalInfo.phone.trim().length > 0 && !isValidPhone(personalInfo.phone)) {
    errors.push(createValidationError('phone', 'Invalid phone number format', 'INVALID_FORMAT'));
  }

  if (personalInfo.linkedIn && personalInfo.linkedIn.trim().length > 0 && !isValidUrl(personalInfo.linkedIn)) {
    errors.push(createValidationError('linkedIn', 'Invalid LinkedIn URL format', 'INVALID_FORMAT'));
  }

  if (personalInfo.portfolio && personalInfo.portfolio.trim().length > 0 && !isValidUrl(personalInfo.portfolio)) {
    errors.push(createValidationError('portfolio', 'Invalid portfolio URL format', 'INVALID_FORMAT'));
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Validates Skill
 */
export const validateSkill: ValidatorFunction<Skill> = (skill) => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!skill.id || skill.id.trim().length === 0) {
    errors.push(createValidationError('id', 'Skill ID is required', 'REQUIRED_FIELD'));
  }

  if (!skill.name || skill.name.trim().length === 0) {
    errors.push(createValidationError('name', 'Skill name is required', 'REQUIRED_FIELD'));
  }

  if (!skill.category || skill.category.trim().length === 0) {
    errors.push(createValidationError('category', 'Skill category is required', 'REQUIRED_FIELD'));
  } else if (!Object.values(SkillCategory).includes(skill.category as SkillCategory)) {
    errors.push(createValidationError('category', 'Invalid skill category', 'INVALID_VALUE'));
  }

  // Skill level validation
  if (typeof skill.level !== 'number') {
    errors.push(createValidationError('level', 'Skill level must be a number', 'INVALID_TYPE'));
  } else if (!Number.isInteger(skill.level)) {
    errors.push(createValidationError('level', 'Skill level must be an integer', 'INVALID_VALUE'));
  } else if (skill.level < SKILL_LEVEL_MIN || skill.level > SKILL_LEVEL_MAX) {
    errors.push(createValidationError('level', `Skill level must be between ${SKILL_LEVEL_MIN} and ${SKILL_LEVEL_MAX}`, 'OUT_OF_RANGE'));
  }

  // Date validation
  if (!(skill.createdAt instanceof Date) || isNaN(skill.createdAt.getTime())) {
    errors.push(createValidationError('createdAt', 'Invalid created date', 'INVALID_DATE'));
  }

  if (!(skill.updatedAt instanceof Date) || isNaN(skill.updatedAt.getTime())) {
    errors.push(createValidationError('updatedAt', 'Invalid updated date', 'INVALID_DATE'));
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Validates TimelineEntry
 */
export const validateTimelineEntry: ValidatorFunction<TimelineEntry> = (entry) => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!entry.id || entry.id.trim().length === 0) {
    errors.push(createValidationError('id', 'Timeline entry ID is required', 'REQUIRED_FIELD'));
  }

  if (!entry.title || entry.title.trim().length === 0) {
    errors.push(createValidationError('title', 'Title is required', 'REQUIRED_FIELD'));
  }

  if (!entry.organization || entry.organization.trim().length === 0) {
    errors.push(createValidationError('organization', 'Organization is required', 'REQUIRED_FIELD'));
  }

  // Date validation
  if (!(entry.startDate instanceof Date) || isNaN(entry.startDate.getTime())) {
    errors.push(createValidationError('startDate', 'Invalid start date', 'INVALID_DATE'));
  } else if (!isNotFutureDate(entry.startDate)) {
    errors.push(createValidationError('startDate', 'Start date cannot be in the future', 'FUTURE_DATE'));
  }

  if (entry.endDate !== null) {
    if (!(entry.endDate instanceof Date) || isNaN(entry.endDate.getTime())) {
      errors.push(createValidationError('endDate', 'Invalid end date', 'INVALID_DATE'));
    } else if (!isNotFutureDate(entry.endDate)) {
      errors.push(createValidationError('endDate', 'End date cannot be in the future', 'FUTURE_DATE'));
    }
  }

  // Date range validation
  if (entry.startDate instanceof Date && !isValidDateRange(entry.startDate, entry.endDate)) {
    errors.push(createValidationError('dateRange', 'Start date must be before end date', 'INVALID_DATE_RANGE'));
  }

  // Timestamp validation
  if (!(entry.createdAt instanceof Date) || isNaN(entry.createdAt.getTime())) {
    errors.push(createValidationError('createdAt', 'Invalid created date', 'INVALID_DATE'));
  }

  if (!(entry.updatedAt instanceof Date) || isNaN(entry.updatedAt.getTime())) {
    errors.push(createValidationError('updatedAt', 'Invalid updated date', 'INVALID_DATE'));
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Validates CareerGap
 */
export const validateCareerGap: ValidatorFunction<CareerGap> = (gap) => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!gap.id || gap.id.trim().length === 0) {
    errors.push(createValidationError('id', 'Career gap ID is required', 'REQUIRED_FIELD'));
  }

  if (!gap.type || (gap.type !== 'employment' && gap.type !== 'education')) {
    errors.push(createValidationError('type', 'Gap type must be either "employment" or "education"', 'INVALID_VALUE'));
  }

  if (!gap.severity || !Object.values(GapSeverity).includes(gap.severity as GapSeverity)) {
    errors.push(createValidationError('severity', 'Invalid gap severity', 'INVALID_VALUE'));
  }

  // Date validation
  if (!(gap.startDate instanceof Date) || isNaN(gap.startDate.getTime())) {
    errors.push(createValidationError('startDate', 'Invalid start date', 'INVALID_DATE'));
  }

  if (!(gap.endDate instanceof Date) || isNaN(gap.endDate.getTime())) {
    errors.push(createValidationError('endDate', 'Invalid end date', 'INVALID_DATE'));
  }

  // Date range validation
  if (gap.startDate instanceof Date && gap.endDate instanceof Date) {
    if (!isValidDateRange(gap.startDate, gap.endDate)) {
      errors.push(createValidationError('dateRange', 'Start date must be before end date', 'INVALID_DATE_RANGE'));
    }

    // Duration validation
    const calculatedDays = Math.ceil((gap.endDate.getTime() - gap.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (Math.abs(gap.durationDays - calculatedDays) > 1) {
      errors.push(createValidationError('durationDays', 'Duration days does not match date range', 'INCONSISTENT_DATA'));
    }

    // Minimum gap threshold
    if (gap.durationDays < CAREER_GAP_THRESHOLD_DAYS) {
      errors.push(createValidationError('durationDays', `Gap must be at least ${CAREER_GAP_THRESHOLD_DAYS} days`, 'BELOW_THRESHOLD'));
    }
  }

  // Duration validation
  if (typeof gap.durationDays !== 'number' || gap.durationDays <= 0) {
    errors.push(createValidationError('durationDays', 'Duration must be a positive number', 'INVALID_VALUE'));
  }

  if (typeof gap.isResolved !== 'boolean') {
    errors.push(createValidationError('isResolved', 'isResolved must be a boolean', 'INVALID_TYPE'));
  }

  // Timestamp validation
  if (!(gap.createdAt instanceof Date) || isNaN(gap.createdAt.getTime())) {
    errors.push(createValidationError('createdAt', 'Invalid created date', 'INVALID_DATE'));
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Validates ProfileData
 */
export const validateProfileData: ValidatorFunction<ProfileData> = (profileData) => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!profileData.id || profileData.id.trim().length === 0) {
    errors.push(createValidationError('id', 'Profile ID is required', 'REQUIRED_FIELD'));
  }

  if (typeof profileData.version !== 'number' || profileData.version < 1) {
    errors.push(createValidationError('version', 'Version must be a positive number', 'INVALID_VALUE'));
  }

  if (typeof profileData.isComplete !== 'boolean') {
    errors.push(createValidationError('isComplete', 'isComplete must be a boolean', 'INVALID_TYPE'));
  }

  // Validate nested objects
  const personalInfoResult = validatePersonalInfo(profileData.personalInfo);
  if (!personalInfoResult.isValid) {
    errors.push(...personalInfoResult.errors.map(error => ({
      ...error,
      field: `personalInfo.${error.field}`
    })));
  }

  // Validate arrays
  if (!Array.isArray(profileData.experience)) {
    errors.push(createValidationError('experience', 'Experience must be an array', 'INVALID_TYPE'));
  }

  if (!Array.isArray(profileData.education)) {
    errors.push(createValidationError('education', 'Education must be an array', 'INVALID_TYPE'));
  }

  if (!Array.isArray(profileData.skills)) {
    errors.push(createValidationError('skills', 'Skills must be an array', 'INVALID_TYPE'));
  } else {
    profileData.skills.forEach((skill, index) => {
      const skillResult = validateSkill(skill);
      if (!skillResult.isValid) {
        errors.push(...skillResult.errors.map(error => ({
          ...error,
          field: `skills[${index}].${error.field}`
        })));
      }
    });
  }

  if (!Array.isArray(profileData.projects)) {
    errors.push(createValidationError('projects', 'Projects must be an array', 'INVALID_TYPE'));
  }

  if (!Array.isArray(profileData.careerGaps)) {
    errors.push(createValidationError('careerGaps', 'Career gaps must be an array', 'INVALID_TYPE'));
  } else {
    profileData.careerGaps.forEach((gap, index) => {
      const gapResult = validateCareerGap(gap);
      if (!gapResult.isValid) {
        errors.push(...gapResult.errors.map(error => ({
          ...error,
          field: `careerGaps[${index}].${error.field}`
        })));
      }
    });
  }

  // Timestamp validation
  if (!(profileData.createdAt instanceof Date) || isNaN(profileData.createdAt.getTime())) {
    errors.push(createValidationError('createdAt', 'Invalid created date', 'INVALID_DATE'));
  }

  if (!(profileData.updatedAt instanceof Date) || isNaN(profileData.updatedAt.getTime())) {
    errors.push(createValidationError('updatedAt', 'Invalid updated date', 'INVALID_DATE'));
  }

  if (profileData.lastAnalyzed !== undefined) {
    if (!(profileData.lastAnalyzed instanceof Date) || isNaN(profileData.lastAnalyzed.getTime())) {
      errors.push(createValidationError('lastAnalyzed', 'Invalid last analyzed date', 'INVALID_DATE'));
    }
  }

  return errors.length === 0 ? createSuccessResult() : createFailureResult(errors);
};

/**
 * Utility function to calculate gap severity based on duration
 */
export const calculateGapSeverity = (durationDays: number): GapSeverity => {
  if (durationDays >= 365) return GapSeverity.MAJOR;
  if (durationDays >= 180) return GapSeverity.MODERATE;
  return GapSeverity.MINOR;
};

/**
 * Utility function to calculate duration between two dates
 */
export const calculateDurationDays = (startDate: Date, endDate: Date): number => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};