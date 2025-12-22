# Design Document

## Overview

Refolio is a glassmorphic personal branding platform that combines interactive portfolio generation with ATS-optimized resume export. The system uses a React-based frontend with Firebase backend, featuring OCR-powered resume parsing, visual skill representation, career gap detection, and premium UI effects.

## Architecture

The system follows a client-server architecture with the following layers:

- **Presentation Layer**: React components with glassmorphic styling and interactive effects
- **Business Logic Layer**: Data processing, OCR integration, gap detection, and PDF generation
- **Data Layer**: Firebase Firestore for document storage and Firebase Auth for user management
- **External Services**: Tesseract.js for OCR, @react-pdf/renderer for PDF generation

## Components and Interfaces

### Core Components

**OCRProcessor**
- Interface: `processResume(file: File) => Promise<ParsedResumeData>`
- Handles Tesseract.js integration and text extraction
- Maps raw OCR output to structured JSON schema

**SkillRenderer** 
- Interface: `renderSkills(skills: Skill[], mode: 'web' | 'pdf') => ReactElement`
- Generates expertise dot visualizations
- Switches between glowing blue (web) and solid black (PDF) styles

**MovementAnalyzer**
- Interface: `detectGaps(timeline: TimelineEntry[]) => CareerGap[]`
- Calculates date differences between consecutive entries
- Identifies gaps exceeding 90-day threshold

**ResumeExporter**
- Interface: `generatePDF(profileData: ProfileData) => Promise<Blob>`
- Creates ATS-optimized A4 PDF documents
- Applies standard formatting and layout rules

**UIEffects**
- SplashCursor: Global cursor interaction layer
- PillNav: Dashboard navigation component
- CardSwap: Content transition animations
- GlassmorphicContainer: Reusable styling wrapper

### Data Models

**ProfileData**
```typescript
interface ProfileData {
  id: string;
  personalInfo: PersonalInfo;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: Skill[];
  projects: Project[];
  createdAt: Date;
  updatedAt: Date;
}

interface Skill {
  name: string;
  level: number; // 1-5
  category: string;
}

interface TimelineEntry {
  startDate: Date;
  endDate: Date | null;
  title: string;
  organization: string;
}

interface CareerGap {
  startDate: Date;
  endDate: Date;
  durationDays: number;
  type: 'employment' | 'education';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, I'll focus on the most critical properties that provide unique validation value:

**Property 1: OCR text extraction consistency**
*For any* valid resume file, the OCR module should extract some text content without throwing errors
**Validates: Requirements 1.1**

**Property 2: Data schema validation round-trip**
*For any* valid profile data, serializing then deserializing should produce equivalent data structure
**Validates: Requirements 1.2, 1.5, 2.5, 6.1**

**Property 3: Skill level validation and rendering**
*For any* skill with level 1-5, the system should render exactly that many filled dots and (5-level) empty dots
**Validates: Requirements 2.3, 2.4**

**Property 4: Career gap detection accuracy**
*For any* timeline with consecutive entries, if the gap between entries exceeds 90 days, the system should detect and flag it
**Validates: Requirements 3.1, 3.2**

**Property 5: PDF export format consistency**
*For any* profile data, the exported PDF should have A4 dimensions (210mm x 297mm) and use text-selectable format
**Validates: Requirements 4.1, 4.3**

**Property 6: Preview-export consistency**
*For any* profile data, the preview display should match the exported PDF formatting exactly
**Validates: Requirements 7.2, 7.3**

**Property 7: Glassmorphic styling consistency**
*For any* UI component marked as glassmorphic, it should have the specified transparency, blur, and border properties
**Validates: Requirements 5.1**

**Property 8: Data integrity during operations**
*For any* data operation (read/write/update), the original data structure should remain valid and uncorrupted
**Validates: Requirements 3.4, 6.3**

## Error Handling

The system implements comprehensive error handling across all layers:

**OCR Processing Errors**
- Invalid file formats trigger fallback to manual entry forms
- OCR failures provide graceful degradation with empty field population
- Network timeouts during processing show retry options

**Data Validation Errors**
- Schema validation failures highlight specific field errors
- Invalid skill levels (outside 1-5 range) show inline validation messages
- Date format errors in timeline entries provide correction suggestions

**PDF Generation Errors**
- Missing required fields prevent export with clear error messages
- Large data sets that exceed PDF limits show optimization suggestions
- Font loading failures fallback to system fonts with user notification

**UI Interaction Errors**
- Component rendering failures show fallback UI elements
- Animation errors gracefully degrade to static transitions
- Cursor effect failures don't impact core functionality

## Testing Strategy

The testing approach combines unit testing and property-based testing for comprehensive coverage:

**Unit Testing Framework**: Jest with React Testing Library
- Component rendering and interaction tests
- API integration tests with mocked services
- Error boundary and fallback behavior tests

**Property-Based Testing Framework**: fast-check
- Each property-based test runs minimum 100 iterations
- Smart generators create realistic test data within valid input spaces
- Properties validate universal behaviors across all valid inputs

**Testing Priorities**:
1. **Core Logic**: OCR processing, gap detection, PDF generation
2. **Data Integrity**: Serialization, validation, storage operations  
3. **UI Consistency**: Component rendering, styling, animations
4. **Integration Points**: Firebase operations, external library usage

**Test Data Generation**:
- Resume file generators with various formats and content
- Profile data generators with realistic career timelines
- Skill data generators with valid and edge-case levels
- Date range generators for gap detection testing

The dual testing approach ensures both specific examples work correctly (unit tests) and general properties hold across all inputs (property tests), providing confidence in system correctness and robustness.