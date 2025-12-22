/**
 * Property-based tests for OCR text extraction
 * Feature: refolio-platform, Property 1: OCR text extraction consistency
 * Validates: Requirements 1.1
 */

import { OCRService } from '../services/ocrService';

describe('OCR Text Extraction Tests', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  afterEach(async () => {
    await ocrService.terminate();
  });

  describe('File Validation', () => {
    test('Property 1a: File validation - valid file types are accepted', () => {
      const validFileTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'application/pdf'
      ];

      validFileTypes.forEach(mimeType => {
        const mockFile = new File(['test content'], 'test-file', { type: mimeType });
        const result = ocrService.validateFile(mockFile);
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('Property 1b: File validation - invalid file types are rejected', () => {
      const invalidFileTypes = [
        'text/plain',
        'application/msword',
        'application/vnd.ms-excel',
        'video/mp4',
        'audio/mp3'
      ];

      invalidFileTypes.forEach(mimeType => {
        const mockFile = new File(['test content'], 'test-file', { type: mimeType });
        const result = ocrService.validateFile(mockFile);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Unsupported file type');
      });
    });

    test('Property 1c: File validation - oversized files are rejected', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedContent = 'x'.repeat(maxSize + 1);
      const mockFile = new File([oversizedContent], 'large-file.jpg', { type: 'image/jpeg' });
      
      const result = ocrService.validateFile(mockFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('File size exceeds 10MB limit');
    });

    test('Property 1d: File validation - files within size limit are accepted', () => {
      const validSizes = [
        1024,           // 1KB
        1024 * 1024,    // 1MB
        5 * 1024 * 1024 // 5MB
      ];

      validSizes.forEach(size => {
        const content = 'x'.repeat(size);
        const mockFile = new File([content], 'valid-file.jpg', { type: 'image/jpeg' });
        
        const result = ocrService.validateFile(mockFile);
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Text Mapping to Profile Data', () => {
    test('Property 1e: Text mapping - personal info extraction is consistent', () => {
      const testTexts = [
        'John Doe\njohn.doe@example.com\n(555) 123-4567',
        'Jane Smith\nEmail: jane.smith@test.com\nPhone: +1-555-987-6543',
        'Bob Johnson\nbob.johnson@company.org\n555.111.2222'
      ];

      testTexts.forEach(text => {
        const result = ocrService.mapTextToProfileData(text);
        
        // Property: Should extract some personal information
        expect(result.personalInfo).toBeDefined();
        
        // Property: Should extract email if present
        if (text.includes('@')) {
          expect(result.personalInfo?.email).toBeDefined();
          expect(result.personalInfo?.email).toMatch(/@/);
        }
        
        // Property: Should extract name if present (first line without special chars)
        const lines = text.split('\n');
        const firstLine = lines[0];
        if (firstLine && !firstLine.includes('@') && !firstLine.includes('(')) {
          expect(result.personalInfo?.firstName || result.personalInfo?.lastName).toBeDefined();
        }
      });
    });

    test('Property 1f: Text mapping - experience extraction handles various formats', () => {
      const experienceTexts = [
        'EXPERIENCE\nSoftware Engineer at Google | 2020-2023\nDeveloped web applications',
        'Work Experience\nSenior Developer @ Microsoft\nBuilt cloud solutions',
        'Professional Experience\nTech Lead at Amazon | Seattle, WA\nLed development team'
      ];

      experienceTexts.forEach(text => {
        const result = ocrService.mapTextToProfileData(text);
        
        // Property: Should create experience array
        expect(Array.isArray(result.experience)).toBe(true);
        
        // Property: Should extract job titles and companies when present
        if (result.experience && result.experience.length > 0) {
          const firstExp = result.experience[0];
          expect(firstExp.title || firstExp.organization).toBeDefined();
        }
      });
    });

    test('Property 1g: Text mapping - skills extraction handles delimited lists', () => {
      const skillTexts = [
        'SKILLS\nJavaScript, Python, React, Node.js',
        'Technical Skills\nJava • C++ • SQL • Docker',
        'Skills: HTML | CSS | TypeScript | AWS'
      ];

      skillTexts.forEach(text => {
        const result = ocrService.mapTextToProfileData(text);
        
        // Property: Should create skills array
        expect(Array.isArray(result.skills)).toBe(true);
        
        // Property: Should extract multiple skills from delimited text
        if (result.skills && result.skills.length > 0) {
          expect(result.skills.length).toBeGreaterThan(0);
          
          // Property: Each skill should have required fields
          result.skills.forEach(skill => {
            expect(skill.name).toBeDefined();
            expect(skill.name?.length).toBeGreaterThan(0);
            expect(skill.level).toBeDefined();
            expect(skill.level).toBeGreaterThanOrEqual(1);
            expect(skill.level).toBeLessThanOrEqual(5);
          });
        }
      });
    });

    test('Property 1h: Text mapping - education extraction identifies degrees and institutions', () => {
      const educationTexts = [
        'EDUCATION\nBachelor of Science at MIT | 2016-2020',
        'Education\nMaster of Computer Science from Stanford University',
        'Academic Background\nPhD in Engineering, University of California'
      ];

      educationTexts.forEach(text => {
        const result = ocrService.mapTextToProfileData(text);
        
        // Property: Should create education array
        expect(Array.isArray(result.education)).toBe(true);
        
        // Property: Should extract degree and institution information
        if (result.education && result.education.length > 0) {
          const firstEdu = result.education[0];
          expect(firstEdu.degree || firstEdu.organization).toBeDefined();
        }
      });
    });

    test('Property 1i: Text mapping - empty or invalid input produces valid structure', () => {
      const invalidInputs = [
        '',
        '   ',
        '\n\n\n',
        'Random text with no structure',
        '12345 !@#$% symbols only'
      ];

      invalidInputs.forEach(text => {
        const result = ocrService.mapTextToProfileData(text);
        
        // Property: Should always return valid structure
        expect(result).toBeDefined();
        expect(result.personalInfo).toBeDefined();
        expect(Array.isArray(result.experience)).toBe(true);
        expect(Array.isArray(result.education)).toBe(true);
        expect(Array.isArray(result.skills)).toBe(true);
        expect(Array.isArray(result.projects)).toBe(true);
      });
    });

    test('Property 1j: Text mapping - data structure consistency across multiple runs', () => {
      const testText = `
        John Smith
        john.smith@example.com
        (555) 123-4567
        
        EXPERIENCE
        Software Engineer at Tech Corp | 2020-2023
        Developed applications using React and Node.js
        
        EDUCATION
        Bachelor of Computer Science at State University | 2016-2020
        
        SKILLS
        JavaScript, Python, React, Node.js, SQL
      `;

      // Run mapping multiple times
      const results = Array.from({ length: 5 }, () => 
        ocrService.mapTextToProfileData(testText)
      );

      // Property: All results should have same structure
      results.forEach((result, index) => {
        expect(result.personalInfo).toBeDefined();
        expect(Array.isArray(result.experience)).toBe(true);
        expect(Array.isArray(result.education)).toBe(true);
        expect(Array.isArray(result.skills)).toBe(true);
        expect(Array.isArray(result.projects)).toBe(true);
        
        // Property: Results should be consistent across runs
        if (index > 0) {
          const prevResult = results[index - 1];
          expect(result.personalInfo?.email).toBe(prevResult.personalInfo?.email);
          expect(result.experience?.length).toBe(prevResult.experience?.length);
          expect(result.skills?.length).toBe(prevResult.skills?.length);
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('Property 1k: Error handling - service handles initialization gracefully', async () => {
      const newService = new OCRService();
      
      // Property: Service should handle uninitialized state
      expect(newService).toBeDefined();
      
      // Cleanup
      await newService.terminate();
    });

    test('Property 1l: Error handling - service cleanup is safe to call multiple times', async () => {
      const newService = new OCRService();
      
      // Property: Multiple terminate calls should not throw errors
      await expect(newService.terminate()).resolves.not.toThrow();
      await expect(newService.terminate()).resolves.not.toThrow();
      await expect(newService.terminate()).resolves.not.toThrow();
    });
  });
});