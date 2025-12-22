// Core data types for Refolio platform

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number; // 1-5 (validated range)
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEntry {
  id: string;
  startDate: Date;
  endDate: Date | null; // null indicates current/ongoing
  title: string;
  organization: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceEntry extends TimelineEntry {
  description?: string;
  achievements?: string[];
}

export interface EducationEntry extends TimelineEntry {
  degree: string;
  fieldOfStudy?: string;
  gpa?: number;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CareerGap {
  id: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  type: 'employment' | 'education';
  severity: 'minor' | 'moderate' | 'major'; // Based on duration
  isResolved: boolean;
  notes?: string;
  createdAt: Date;
}

export interface ProfileData {
  id: string;
  personalInfo: PersonalInfo;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: Skill[];
  projects: Project[];
  careerGaps: CareerGap[]; // Detected gaps
  version: number; // For data versioning
  isComplete: boolean; // Profile completion status
  lastAnalyzed?: Date; // Last gap analysis
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedResumeData {
  personalInfo?: Partial<PersonalInfo>;
  experience?: Partial<ExperienceEntry>[];
  education?: Partial<EducationEntry>[];
  skills?: Partial<Skill>[];
  projects?: Partial<Project>[];
}

// UI Component Props
export interface GlassmorphicProps {
  blur?: number;
  opacity?: number;
  borderRadius?: number;
  children: React.ReactNode;
}

export type RenderMode = 'web' | 'pdf';

// Validation constants
export const SKILL_LEVEL_MIN = 1;
export const SKILL_LEVEL_MAX = 5;
export const CAREER_GAP_THRESHOLD_DAYS = 90;

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Skill categories enum
export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  CERTIFICATION = 'certification',
  TOOL = 'tool',
  FRAMEWORK = 'framework'
}

// Career gap severity based on duration
export enum GapSeverity {
  MINOR = 'minor',     // 90-180 days
  MODERATE = 'moderate', // 180-365 days  
  MAJOR = 'major'      // 365+ days
}

// Data validation functions type
export type ValidatorFunction<T> = (data: T) => ValidationResult;