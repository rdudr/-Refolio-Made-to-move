/**
 * OCR Service for processing resume files using Tesseract.js
 * Handles file upload validation, text extraction, and error handling
 */

import { createWorker, Worker } from 'tesseract.js';
import { ParsedResumeData, PersonalInfo, ExperienceEntry, EducationEntry, Skill, Project } from '../types';

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await createWorker('eng', 1, {
        logger: m => {
          // Only log errors and important status updates
          if (m.status === 'recognizing text' || m.status.includes('error')) {
            console.log('OCR:', m);
          }
        }
      });
      
      // Configure the worker for better performance
      await this.worker.setParameters({
        tessedit_pageseg_mode: 1 as any, // Automatic page segmentation with OSD
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;:\'\"<>/\\`~ \n\t',
      });
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OCR worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate uploaded file before processing
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Unsupported file type. Please upload an image (JPEG, PNG, GIF, BMP, WebP) or PDF file.'
      };
    }

    return { isValid: true };
  }

  /**
   * Process resume file and extract text using OCR
   */
  async processResume(
    file: File,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Initialize worker if needed
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to initialize OCR'
        };
      }
    }

    if (!this.worker) {
      return { success: false, error: 'OCR worker not available' };
    }

    try {
      // Set up progress tracking
      if (onProgress) {
        onProgress({ status: 'Processing file...', progress: 0 });
      }

      // Try multiple approaches to handle the file with timeout
      let result;
      const timeout = 30000; // 30 second timeout
      
      const recognizeWithTimeout = async (input: any): Promise<any> => {
        return Promise.race([
          this.worker!.recognize(input),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OCR processing timeout')), timeout)
          )
        ]);
      };
      
      try {
        // First try: Use the file directly
        result = await recognizeWithTimeout(file);
      } catch (firstError) {
        console.warn('Direct file recognition failed, trying blob URL:', firstError);
        
        try {
          // Second try: Create a blob URL
          const fileUrl = URL.createObjectURL(file);
          
          try {
            result = await recognizeWithTimeout(fileUrl);
            URL.revokeObjectURL(fileUrl);
          } catch (blobError) {
            URL.revokeObjectURL(fileUrl);
            throw blobError;
          }
        } catch (secondError) {
          console.warn('Blob URL recognition failed, trying canvas conversion:', secondError);
          
          // Third try: Convert to canvas and then to data URL
          try {
            const canvas = await this.fileToCanvas(file);
            const dataUrl = canvas.toDataURL('image/png');
            result = await recognizeWithTimeout(dataUrl);
          } catch (canvasError) {
            throw new Error(`All OCR methods failed. Last error: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`);
          }
        }
      }

      if (onProgress) {
        onProgress({ status: 'Text extraction complete', progress: 100 });
      }

      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence
      };

    } catch (error) {
      return {
        success: false,
        error: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert file to canvas for OCR processing
   * This is a fallback method when direct file processing fails
   */
  private async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Clean up the object URL
        URL.revokeObjectURL(img.src);
        
        // Set canvas dimensions to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for canvas conversion'));
      };

      // Create object URL for the image
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    });
  }

  /**
   * Map extracted OCR text to structured ProfileData
   * Handles missing or malformed data gracefully
   */
  mapTextToProfileData(text: string): ParsedResumeData {
    if (!text || text.trim().length === 0) {
      return this.getEmptyParsedData();
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const result: ParsedResumeData = {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      projects: []
    };

    try {
      // Extract personal information
      result.personalInfo = this.extractPersonalInfo(lines);

      // Extract experience
      result.experience = this.extractExperience(lines);

      // Extract education
      result.education = this.extractEducation(lines);

      // Extract skills
      result.skills = this.extractSkills(lines);

      // Extract projects
      result.projects = this.extractProjects(lines);
    } catch (error) {
      // If any extraction fails, return partial data
      console.warn('Error during data mapping:', error);
    }

    return result;
  }

  /**
   * Get empty parsed data structure
   */
  private getEmptyParsedData(): ParsedResumeData {
    return {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
  }

  /**
   * Extract personal information from text lines
   * Handles various resume formats and missing data gracefully
   */
  private extractPersonalInfo(lines: string[]): Partial<PersonalInfo> {
    const personalInfo: Partial<PersonalInfo> = {};

    // Enhanced patterns for better extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const linkedInRegex = /(linkedin\.com\/in\/[A-Za-z0-9-]+|linkedin\.com\/pub\/[A-Za-z0-9-]+)/i;
    const websiteRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
    const locationRegex = /^(.+),\s*([A-Z]{2}|[A-Za-z\s]+)$/; // City, State format

    // Look through first 15 lines for personal info
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];

      try {
        // Extract email
        const emailMatch = line.match(emailRegex);
        if (emailMatch && !personalInfo.email) {
          personalInfo.email = emailMatch[0].toLowerCase();
        }

        // Extract phone
        const phoneMatch = line.match(phoneRegex);
        if (phoneMatch && !personalInfo.phone) {
          personalInfo.phone = phoneMatch[0];
        }

        // Extract LinkedIn
        const linkedInMatch = line.match(linkedInRegex);
        if (linkedInMatch && !personalInfo.linkedIn) {
          const url = linkedInMatch[0];
          personalInfo.linkedIn = url.startsWith('http') ? url : `https://${url}`;
        }

        // Extract portfolio/website (but not LinkedIn)
        const websiteMatch = line.match(websiteRegex);
        if (websiteMatch && !personalInfo.portfolio && !linkedInMatch) {
          personalInfo.portfolio = websiteMatch[0];
        }

        // Extract location (city, state format)
        const locationMatch = line.match(locationRegex);
        if (locationMatch && !personalInfo.location && !emailMatch && !phoneMatch) {
          personalInfo.location = line;
        }

        // Try to extract name (first few lines without special patterns)
        if (!personalInfo.firstName && !emailMatch && !phoneMatch && !websiteMatch &&
          line.length > 2 && line.length < 60 && !line.includes('|') && !line.includes('@')) {

          // Clean the line of common resume artifacts
          const cleanLine = line.replace(/[^\w\s]/g, ' ').trim();
          const nameParts = cleanLine.split(/\s+/).filter(part =>
            part.length > 1 &&
            !/^\d+$/.test(part) && // Not just numbers
            !part.toLowerCase().includes('resume') &&
            !part.toLowerCase().includes('cv')
          );

          if (nameParts.length >= 2 && nameParts.length <= 4) {
            personalInfo.firstName = nameParts[0];
            personalInfo.lastName = nameParts.slice(1).join(' ');
          }
        }
      } catch (error) {
        // Continue processing other lines if one fails
        console.warn(`Error processing line ${i}:`, error);
        continue;
      }
    }

    return personalInfo;
  }

  /**
   * Extract experience entries from text lines
   * Handles various resume formats and missing data gracefully
   */
  private extractExperience(lines: string[]): Partial<ExperienceEntry>[] {
    const experience: Partial<ExperienceEntry>[] = [];
    const experienceKeywords = [
      'experience', 'work', 'employment', 'career', 'professional',
      'work history', 'professional experience', 'work experience'
    ];

    let inExperienceSection = false;
    let currentEntry: Partial<ExperienceEntry> | null = null;
    let sectionEndKeywords = ['education', 'skills', 'projects', 'certifications'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      try {
        // Check if we're entering experience section
        if (!inExperienceSection && experienceKeywords.some(keyword => lowerLine.includes(keyword))) {
          inExperienceSection = true;
          continue;
        }

        // Check if we're leaving experience section
        if (inExperienceSection && sectionEndKeywords.some(keyword => lowerLine.includes(keyword))) {
          if (currentEntry) {
            experience.push(currentEntry);
            currentEntry = null;
          }
          break;
        }

        if (inExperienceSection && line.length > 3) {
          // Enhanced patterns for job entries
          const patterns = [
            /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*\|\s*(.+?))?(?:\s*\|\s*(.+?))?$/i, // Title at Company | Location | Dates
            /^(.+?)\s*[-–—]\s*(.+?)(?:\s*\|\s*(.+?))?(?:\s*\|\s*(.+?))?$/i,    // Title - Company | Location | Dates
            /^(.+?),\s*(.+?)(?:\s*\|\s*(.+?))?(?:\s*\|\s*(.+?))?$/i,           // Title, Company | Location | Dates
          ];

          let matched = false;
          for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
              // Save previous entry if exists
              if (currentEntry) {
                experience.push(currentEntry);
              }

              currentEntry = {
                id: `exp-${Date.now()}-${Math.random()}`,
                title: match[1]?.trim() || 'Unknown Position',
                organization: match[2]?.trim() || 'Unknown Company',
                location: match[3]?.trim(),
                description: '',
                achievements: [],
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // Try to parse dates from the 4th match group
              if (match[4]) {
                const dateInfo = this.parseDateRange(match[4]);
                if (dateInfo.startDate) currentEntry.startDate = dateInfo.startDate;
                if (dateInfo.endDate) currentEntry.endDate = dateInfo.endDate;
              }

              matched = true;
              break;
            }
          }

          // If no pattern matched but we have a current entry, add to description
          if (!matched && currentEntry && line.length > 10) {
            // Check if this looks like a bullet point or description
            if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ||
              line.toLowerCase().includes('responsible') || line.toLowerCase().includes('developed')) {

              const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
              if (cleanLine.length > 5) {
                if (currentEntry.description) {
                  currentEntry.description += `\n${cleanLine}`;
                } else {
                  currentEntry.description = cleanLine;
                }

                // Also add to achievements if it looks like an accomplishment
                if (cleanLine.toLowerCase().includes('achieved') ||
                  cleanLine.toLowerCase().includes('improved') ||
                  cleanLine.toLowerCase().includes('increased') ||
                  cleanLine.toLowerCase().includes('reduced')) {
                  currentEntry.achievements = currentEntry.achievements || [];
                  currentEntry.achievements.push(cleanLine);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error processing experience line ${i}:`, error);
        continue;
      }
    }

    // Don't forget the last entry
    if (currentEntry) {
      experience.push(currentEntry);
    }

    return experience;
  }

  /**
   * Parse date range from text (e.g., "2020-2023", "Jan 2020 - Present")
   */
  private parseDateRange(dateText: string): { startDate?: Date; endDate?: Date | null } {
    const result: { startDate?: Date; endDate?: Date | null } = {};

    try {
      const cleanText = dateText.trim().toLowerCase();

      // Handle "present", "current", "ongoing" cases
      if (cleanText.includes('present') || cleanText.includes('current') || cleanText.includes('ongoing')) {
        result.endDate = null; // null indicates current position
      }

      // Simple year range pattern (e.g., "2020-2023", "2020 - 2023")
      const yearRangeMatch = cleanText.match(/(\d{4})\s*[-–—]\s*(\d{4})/);
      if (yearRangeMatch) {
        result.startDate = new Date(parseInt(yearRangeMatch[1]), 0, 1);
        result.endDate = new Date(parseInt(yearRangeMatch[2]), 11, 31);
        return result;
      }

      // Year to present pattern (e.g., "2020 - Present")
      const yearToPresentMatch = cleanText.match(/(\d{4})\s*[-–—]\s*(present|current|ongoing)/);
      if (yearToPresentMatch) {
        result.startDate = new Date(parseInt(yearToPresentMatch[1]), 0, 1);
        result.endDate = null;
        return result;
      }

      // Single year (assume full year)
      const singleYearMatch = cleanText.match(/^(\d{4})$/);
      if (singleYearMatch) {
        result.startDate = new Date(parseInt(singleYearMatch[1]), 0, 1);
        result.endDate = new Date(parseInt(singleYearMatch[1]), 11, 31);
        return result;
      }

    } catch (error) {
      console.warn('Error parsing date range:', error);
    }

    return result;
  }

  /**
   * Extract education entries from text lines
   */
  private extractEducation(lines: string[]): Partial<EducationEntry>[] {
    const education: Partial<EducationEntry>[] = [];
    const educationKeywords = ['education', 'degree', 'university', 'college', 'school'];

    let inEducationSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
        inEducationSection = true;
        continue;
      }

      if (inEducationSection && (lowerLine.includes('experience') || lowerLine.includes('skills'))) {
        break;
      }

      if (inEducationSection && line.length > 5) {
        // Try to parse degree and institution
        const degreePattern = /^(.+?)\s+(?:at|from|,)\s+(.+?)(?:\s+\|\s+(.+?))?$/i;
        const match = line.match(degreePattern);

        if (match) {
          education.push({
            id: `edu-${Date.now()}-${Math.random()}`,
            degree: match[1].trim(),
            organization: match[2].trim(),
            title: match[1].trim(),
            location: match[3]?.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    return education;
  }

  /**
   * Extract skills from text lines
   * Handles various formats and attempts basic categorization
   */
  private extractSkills(lines: string[]): Partial<Skill>[] {
    const skills: Partial<Skill>[] = [];
    const skillKeywords = [
      'skills', 'technologies', 'tools', 'languages', 'frameworks',
      'technical skills', 'programming languages', 'software', 'platforms'
    ];

    let inSkillsSection = false;
    const sectionEndKeywords = ['experience', 'education', 'projects', 'certifications'];

    // Skill categorization patterns
    const skillCategories = {
      'technical': [
        'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
        'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql',
        'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'linux'
      ],
      'framework': [
        'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js', 'gatsby',
        'express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'rails'
      ],
      'tool': [
        'git', 'docker', 'kubernetes', 'jenkins', 'webpack', 'babel', 'eslint',
        'jira', 'confluence', 'slack', 'figma', 'sketch', 'photoshop'
      ],
      'language': [
        'english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean'
      ]
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      try {
        // Check if we're entering skills section
        if (!inSkillsSection && skillKeywords.some(keyword => lowerLine.includes(keyword))) {
          inSkillsSection = true;
          continue;
        }

        // Check if we're leaving skills section
        if (inSkillsSection && sectionEndKeywords.some(keyword => lowerLine.includes(keyword))) {
          break;
        }

        if (inSkillsSection && line.length > 2) {
          // Split by common delimiters and clean up
          const delimiters = /[,;|•·\n\t]/;
          const skillNames = line.split(delimiters)
            .map(s => s.trim())
            .filter(s => s.length > 1 && s.length < 50)
            .filter(s => !s.toLowerCase().includes('skills')) // Remove section headers
            .filter(s => !/^\d+$/.test(s)); // Remove standalone numbers

          skillNames.forEach(skillName => {
            if (skillName.length > 1) {
              // Determine skill category
              const lowerSkill = skillName.toLowerCase();
              let category = 'technical'; // default

              for (const [cat, keywords] of Object.entries(skillCategories)) {
                if (keywords.some(keyword => lowerSkill.includes(keyword))) {
                  category = cat;
                  break;
                }
              }

              // Determine skill level based on context clues
              let level = 3; // default intermediate level

              // Look for level indicators in the skill name or surrounding context
              if (lowerSkill.includes('expert') || lowerSkill.includes('advanced')) {
                level = 5;
              } else if (lowerSkill.includes('proficient') || lowerSkill.includes('experienced')) {
                level = 4;
              } else if (lowerSkill.includes('intermediate')) {
                level = 3;
              } else if (lowerSkill.includes('basic') || lowerSkill.includes('beginner')) {
                level = 2;
              } else if (lowerSkill.includes('familiar')) {
                level = 1;
              }

              // Clean the skill name of level indicators
              const cleanSkillName = skillName
                .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content
                .replace(/\s*(expert|advanced|proficient|experienced|intermediate|basic|beginner|familiar)\s*/gi, '')
                .trim();

              if (cleanSkillName.length > 0) {
                skills.push({
                  id: `skill-${Date.now()}-${Math.random()}`,
                  name: cleanSkillName,
                  level: level,
                  category: category,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn(`Error processing skills line ${i}:`, error);
        continue;
      }
    }

    // Remove duplicates based on skill name (case insensitive)
    const uniqueSkills = skills.filter((skill, index, self) =>
      index === self.findIndex(s =>
        s.name?.toLowerCase() === skill.name?.toLowerCase()
      )
    );

    return uniqueSkills;
  }

  /**
   * Extract projects from text lines
   */
  private extractProjects(lines: string[]): Partial<Project>[] {
    const projects: Partial<Project>[] = [];
    const projectKeywords = ['projects', 'portfolio', 'work samples'];

    let inProjectsSection = false;
    let currentProject: Partial<Project> | null = null;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (projectKeywords.some(keyword => lowerLine.includes(keyword))) {
        inProjectsSection = true;
        continue;
      }

      if (inProjectsSection && (lowerLine.includes('experience') || lowerLine.includes('education') || lowerLine.includes('skills'))) {
        if (currentProject) {
          projects.push(currentProject);
        }
        break;
      }

      if (inProjectsSection && line.length > 5) {
        // Check if this looks like a project title
        if (line.length < 100 && !line.includes('.') && !currentProject) {
          currentProject = {
            name: line,
            description: '',
            technologies: []
          };
        } else if (currentProject && line.length > 10) {
          currentProject.description = currentProject.description
            ? `${currentProject.description}\n${line}`
            : line;
        }
      }
    }

    if (currentProject) {
      projects.push(currentProject);
    }

    return projects;
  }

  /**
   * Clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService();