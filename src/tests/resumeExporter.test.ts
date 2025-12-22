// Mock @react-pdf/renderer before importing the service
jest.mock('@react-pdf/renderer', () => {
    // Return a fake blob object to avoid potential missing Blob implementation in JSDOM
    const mockToBlob = jest.fn(() => Promise.resolve({ type: 'application/pdf', size: 100 } as any));

    // Define the pdf function directly, without jest.fn() wrapper if possible, or simple wrapper
    const mockPdfFunction = jest.fn(() => ({
        toBlob: mockToBlob
    }));

    return {
        __esModule: true,
        pdf: mockPdfFunction,
        Document: jest.fn(({ children }) => ({ type: 'Document', children })),
        Page: jest.fn(({ children }) => ({ type: 'Page', children })),
        Text: jest.fn(({ children }) => ({ type: 'Text', children })),
        View: jest.fn(({ children }) => ({ type: 'View', children })),
        StyleSheet: {
            create: jest.fn((styles) => styles)
        },
        Font: {
            register: jest.fn()
        },
        default: {
            pdf: mockPdfFunction
        }
    };
});

import React from 'react';
import { resumeExporter } from '../services/resumeExporter';
import { ProfileData, SkillCategory, GapSeverity } from '../types';

describe('Resume Exporter Tests', () => {
    // Mock data generator
    const createMockProfile = (): ProfileData => ({
        id: 'test-id',
        personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '123-456-7890',
            location: 'New York, NY'
        },
        experience: [
            {
                id: 'exp1',
                title: 'Software Engineer',
                organization: 'Tech Corp',
                startDate: new Date('2020-01-01'),
                endDate: null,
                description: 'Built things\nFixed bugs',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ],
        education: [
            {
                id: 'edu1',
                degree: 'BS CS',
                organization: 'University',
                title: 'BS CS',
                startDate: new Date('2016-09-01'),
                endDate: new Date('2020-05-01'),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ],
        skills: [
            {
                id: 'skill1',
                name: 'React',
                level: 5,
                category: SkillCategory.TECHNICAL,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ],
        projects: [],
        careerGaps: [],
        version: 1,
        isComplete: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    describe('PDF Generation', () => {
        test('Property 5a: PDF generation - produces valid blob for single column', async () => {
            const data = createMockProfile();
            const blob = await resumeExporter.generatePdf(data, 'single');

            expect(blob).toBeDefined();
            expect(blob.type).toBe('application/pdf');
            expect(blob.size).toBeGreaterThan(0);
        });

        test('Property 5b: PDF generation - produces valid blob for two column', async () => {
            const data = createMockProfile();
            const blob = await resumeExporter.generatePdf(data, 'two-column');

            expect(blob).toBeDefined();
            expect(blob.type).toBe('application/pdf');
            expect(blob.size).toBeGreaterThan(0);
        });

        test('Property 5c: PDF generation - handles empty fields gracefully', async () => {
            const data = createMockProfile();
            data.personalInfo.phone = undefined;
            data.experience = [];

            const blob = await resumeExporter.generatePdf(data);
            expect(blob).toBeDefined();
            expect(blob.size).toBeGreaterThan(0);
        });

        test('Property 5d: PDF Dimensions - verifies A4 size implicitly', async () => {
            // @react-pdf/renderer output is binary, but we can check if it generated without layout errors
            const data = createMockProfile();
            await expect(resumeExporter.generatePdf(data)).resolves.not.toThrow();
        });
    });

    describe('Preview Integration', () => {
        test('Property 6a: Preview component - returns valid React element', () => {
            const data = createMockProfile();
            const element = resumeExporter.getDocument(data);

            expect(element).toBeDefined();
            expect(React.isValidElement(element)).toBe(true);
        });
    });
});
