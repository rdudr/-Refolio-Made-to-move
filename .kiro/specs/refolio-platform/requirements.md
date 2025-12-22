# Requirements Document

## Introduction

Refolio is a high-end, glassmorphic Personal Branding Platform that generates an interactive portfolio and an industry-standard A4 resume simultaneously. The platform uses iPhone-inspired "Liquid Glass" design principles and focuses on keeping professionals "moving" by detecting career gaps and providing ATS-optimized resume exports.

## Glossary

- **Refolio_System**: The complete personal branding platform including web interface, data processing, and export capabilities
- **OCR_Module**: Optical Character Recognition component using Tesseract.js for resume scanning
- **Expertise_Dot_System**: Visual representation of skill levels using 1-5 dot indicators
- **Movement_Logic**: Career gap detection algorithm that identifies pauses in professional activity
- **ATS_Engine**: Applicant Tracking System optimization component for resume formatting
- **Glassmorphism**: UI design style featuring translucent elements with blur effects and subtle borders
- **Career_Gap**: Period exceeding 90 days between consecutive employment or education entries
- **SplashCursor**: Global interactive cursor effect component
- **PillNav**: Navigation component for dashboard section switching
- **CardSwap**: Content transition animation component

## Requirements

### Requirement 1

**User Story:** As a professional, I want to upload my existing resume and have it automatically parsed, so that I can quickly populate my profile data without manual entry.

#### Acceptance Criteria

1. WHEN a user uploads a resume file THEN the Refolio_System SHALL extract text content using the OCR_Module
2. WHEN text extraction completes THEN the Refolio_System SHALL map extracted data into a structured JSON schema
3. WHEN OCR processing encounters errors THEN the Refolio_System SHALL provide manual entry forms for data correction
4. WHEN data mapping completes THEN the Refolio_System SHALL populate user profile fields with extracted information
5. WHEN parsing user input THEN the Refolio_System SHALL validate it against the specified data schema

### Requirement 2

**User Story:** As a professional, I want to represent my skill levels visually with expertise dots, so that viewers can quickly assess my competency levels.

#### Acceptance Criteria

1. WHEN displaying skills in portfolio view THEN the Refolio_System SHALL render expertise levels using glowing neon blue dots
2. WHEN exporting to PDF format THEN the Refolio_System SHALL render expertise levels using solid black dots for ATS compatibility
3. WHEN a skill is assigned a level THEN the Refolio_System SHALL validate the level is between 1 and 5 inclusive
4. WHEN rendering dot indicators THEN the Refolio_System SHALL display filled dots equal to the skill level and empty dots for remaining positions
5. WHEN storing skill data THEN the Refolio_System SHALL encode expertise levels using JSON format

### Requirement 3

**User Story:** As a career-focused professional, I want to be alerted about gaps in my employment or education history, so that I can address potential concerns before applying to positions.

#### Acceptance Criteria

1. WHEN the Movement_Logic processes timeline data THEN the Refolio_System SHALL calculate date differences between consecutive entries
2. WHEN a Career_Gap exceeds 90 days THEN the Refolio_System SHALL trigger a critical notification alert
3. WHEN displaying gap notifications THEN the Refolio_System SHALL show pulsing red glass alerts with specific date ranges
4. WHEN gap detection completes THEN the Refolio_System SHALL maintain data integrity while identifying timeline issues
5. WHEN timeline data updates THEN the Refolio_System SHALL recalculate gap detection automatically

### Requirement 4

**User Story:** As a job applicant, I want to export an ATS-optimized resume in standard A4 format, so that my application can pass through automated screening systems.

#### Acceptance Criteria

1. WHEN exporting resume THEN the Refolio_System SHALL generate A4 format documents at 210mm x 297mm dimensions
2. WHEN formatting text content THEN the Refolio_System SHALL use standard sans-serif fonts at 10-11pt for body text
3. WHEN creating PDF output THEN the Refolio_System SHALL ensure text-selectable format using PDF rendering libraries
4. WHEN applying ATS optimization THEN the Refolio_System SHALL use standard section titles and minimal color usage
5. WHEN generating layout THEN the Refolio_System SHALL support both single-column and two-column formats

### Requirement 5

**User Story:** As a user, I want to navigate through a glassmorphic interface with smooth transitions, so that I have an engaging and premium user experience.

#### Acceptance Criteria

1. WHEN rendering UI elements THEN the Refolio_System SHALL apply glassmorphism styling with specified transparency and blur values
2. WHEN user interacts with cursor THEN the Refolio_System SHALL display SplashCursor effects globally across the interface
3. WHEN navigating dashboard sections THEN the Refolio_System SHALL use PillNav component for section switching
4. WHEN switching content sections THEN the Refolio_System SHALL animate transitions using CardSwap component
5. WHEN displaying background THEN the Refolio_System SHALL integrate Prism background effects throughout the interface

### Requirement 6

**User Story:** As a user, I want my data securely stored and accessible across sessions, so that I can build my profile over time without losing progress.

#### Acceptance Criteria

1. WHEN storing user data THEN the Refolio_System SHALL persist information using Firebase Firestore in JSON format
2. WHEN user authenticates THEN the Refolio_System SHALL manage sessions using Firebase Auth
3. WHEN data operations occur THEN the Refolio_System SHALL maintain data integrity during read and write operations
4. WHEN user accesses profile THEN the Refolio_System SHALL retrieve stored data and populate interface elements
5. WHEN system scales THEN the Refolio_System SHALL support migration to PostgreSQL-based storage solutions

### Requirement 7

**User Story:** As a user, I want to preview my resume before downloading, so that I can ensure the formatting meets my expectations.

#### Acceptance Criteria

1. WHEN accessing resume preview THEN the Refolio_System SHALL display A4-formatted content in browser viewport
2. WHEN preview renders THEN the Refolio_System SHALL show exact PDF output formatting and layout
3. WHEN user requests download THEN the Refolio_System SHALL generate PDF file with identical formatting to preview
4. WHEN preview updates THEN the Refolio_System SHALL reflect real-time changes from profile data modifications
5. WHEN displaying preview interface THEN the Refolio_System SHALL maintain glassmorphic styling consistent with platform design