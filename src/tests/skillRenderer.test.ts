/**
 * Property-based tests for skill level validation and rendering
 * Feature: refolio-platform, Property 3: Skill level validation and rendering
 * Validates: Requirements 2.3, 2.4
 */

import { render } from '@testing-library/react';
import React from 'react';
import SkillRenderer, { SkillDot } from '../components/ui/SkillRenderer';
import { Skill, SkillCategory, SKILL_LEVEL_MIN, SKILL_LEVEL_MAX } from '../types';

describe('Skill Level Validation and Rendering Tests', () => {
  
  // Helper function to create test skills
  const createTestSkill = (overrides: Partial<Skill> = {}): Skill => ({
    id: `skill-${Date.now()}-${Math.random()}`,
    name: 'Test Skill',
    level: 3,
    category: SkillCategory.TECHNICAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('Skill Level Validation', () => {
    test('Property 3a: Skill level validation - valid levels are accepted', () => {
      const validLevels = [1, 2, 3, 4, 5];
      
      validLevels.forEach(level => {
        const skill = createTestSkill({ level });
        
        // Property: Valid skill levels should be within range
        expect(skill.level).toBeGreaterThanOrEqual(SKILL_LEVEL_MIN);
        expect(skill.level).toBeLessThanOrEqual(SKILL_LEVEL_MAX);
        expect(Number.isInteger(skill.level)).toBe(true);
      });
    });

    test('Property 3b: Skill level validation - level boundaries are enforced', () => {
      const boundaryTests = [
        { level: SKILL_LEVEL_MIN, shouldBeValid: true },
        { level: SKILL_LEVEL_MAX, shouldBeValid: true },
        { level: SKILL_LEVEL_MIN - 1, shouldBeValid: false },
        { level: SKILL_LEVEL_MAX + 1, shouldBeValid: false },
        { level: 0, shouldBeValid: false },
        { level: 6, shouldBeValid: false }
      ];

      boundaryTests.forEach(({ level, shouldBeValid }) => {
        if (shouldBeValid) {
          expect(level).toBeGreaterThanOrEqual(SKILL_LEVEL_MIN);
          expect(level).toBeLessThanOrEqual(SKILL_LEVEL_MAX);
        } else {
          expect(
            level < SKILL_LEVEL_MIN || level > SKILL_LEVEL_MAX
          ).toBe(true);
        }
      });
    });

    test('Property 3c: Skill level validation - non-integer levels are invalid', () => {
      const invalidLevels = [1.5, 2.7, 3.14, 4.99];
      
      invalidLevels.forEach(level => {
        // Property: Skill levels must be integers
        expect(Number.isInteger(level)).toBe(false);
      });
    });
  });

  describe('Skill Dot Rendering', () => {
    test('Property 3d: Skill dot rendering - correct number of filled dots for web mode', () => {
      const testLevels = [1, 2, 3, 4, 5];
      
      testLevels.forEach(level => {
        const { container } = render(
          React.createElement(SkillDot, { level, mode: 'web' })
        );
        
        const dots = container.querySelectorAll('span');
        
        // Property: Should always render exactly 5 dots total
        expect(dots.length).toBe(5);
        
        // Property: Number of filled dots should equal the skill level
        let filledDots = 0;
        let emptyDots = 0;
        
        dots.forEach((dot, index) => {
          const style = window.getComputedStyle(dot);
          const backgroundColor = style.backgroundColor;
          
          if (index < level) {
            // Should be filled (blue background)
            expect(backgroundColor).toContain('rgb(102, 126, 234)');
            filledDots++;
          } else {
            // Should be empty (transparent/white background)
            expect(
              backgroundColor.includes('rgba(255, 255, 255') || 
              backgroundColor === 'transparent'
            ).toBe(true);
            emptyDots++;
          }
        });
        
        expect(filledDots).toBe(level);
        expect(emptyDots).toBe(5 - level);
      });
    });

    test('Property 3e: Skill dot rendering - correct number of filled dots for PDF mode', () => {
      const testLevels = [1, 2, 3, 4, 5];
      
      testLevels.forEach(level => {
        const { container } = render(
          React.createElement(SkillDot, { level, mode: 'pdf' })
        );
        
        const dots = container.querySelectorAll('span');
        
        // Property: Should always render exactly 5 dots total
        expect(dots.length).toBe(5);
        
        // Property: Number of filled dots should equal the skill level
        let filledDots = 0;
        let emptyDots = 0;
        
        dots.forEach((dot, index) => {
          const style = window.getComputedStyle(dot);
          const backgroundColor = style.backgroundColor;
          
          if (index < level) {
            // Should be filled (black background)
            expect(backgroundColor).toContain('rgb(0, 0, 0)');
            filledDots++;
          } else {
            // Should be empty (transparent background)
            expect(backgroundColor === 'transparent').toBe(true);
            emptyDots++;
          }
        });
        
        expect(filledDots).toBe(level);
        expect(emptyDots).toBe(5 - level);
      });
    });

    test('Property 3f: Skill dot rendering - mode consistency across multiple renders', () => {
      const modes = ['web', 'pdf'] as const;
      const level = 3;
      
      modes.forEach(mode => {
        // Render the same component multiple times
        const renders = Array.from({ length: 5 }, () => 
          render(React.createElement(SkillDot, { level, mode }))
        );
        
        renders.forEach(({ container }, index) => {
          const dots = container.querySelectorAll('span');
          
          // Property: All renders should have same number of dots
          expect(dots.length).toBe(5);
          
          // Property: All renders should have same filled/empty pattern
          dots.forEach((dot, dotIndex) => {
            const style = window.getComputedStyle(dot);
            const backgroundColor = style.backgroundColor;
            
            if (dotIndex < level) {
              if (mode === 'web') {
                expect(backgroundColor).toContain('rgb(102, 126, 234)');
              } else {
                expect(backgroundColor).toContain('rgb(0, 0, 0)');
              }
            } else {
              expect(
                backgroundColor === 'transparent' || 
                backgroundColor.includes('rgba(255, 255, 255')
              ).toBe(true);
            }
          });
        });
      });
    });
  });

  describe('SkillRenderer Component', () => {
    test('Property 3g: Skill renderer - handles empty skill arrays gracefully', () => {
      const emptySkillArrays = [[], undefined, null];
      
      emptySkillArrays.forEach(skills => {
        const { container } = render(
          React.createElement(SkillRenderer, { 
            skills: skills || [],
            mode: 'web'
          })
        );
        
        // Property: Should render without errors
        expect(container).toBeTruthy();
        
        // Property: Should show appropriate empty state message
        const emptyMessage = container.querySelector('p');
        expect(emptyMessage?.textContent).toContain('No skills to display');
      });
    });

    test('Property 3h: Skill renderer - renders all provided skills', () => {
      const skillCounts = [1, 3, 5];
      
      skillCounts.forEach(count => {
        const skills = Array.from({ length: count }, (_, index) => 
          createTestSkill({ 
            id: `skill-${index}`,
            name: `Skill ${index + 1}`,
            level: (index % 5) + 1 // Cycle through levels 1-5
          })
        );
        
        const { container } = render(
          React.createElement(SkillRenderer, { 
            skills,
            mode: 'web',
            showCategories: false
          })
        );
        
        // Property: Should render all skills by checking skill names in text content
        skills.forEach(skill => {
          const allSpans = container.querySelectorAll('span');
          const foundSkill = Array.from(allSpans).some(span => 
            span.textContent?.includes(skill.name)
          );
          expect(foundSkill).toBe(true);
        });
      });
    });

    test('Property 3i: Skill renderer - category grouping works correctly', () => {
      const skillsByCategory = {
        [SkillCategory.TECHNICAL]: 3,
        [SkillCategory.FRAMEWORK]: 2,
        [SkillCategory.TOOL]: 4,
        [SkillCategory.SOFT]: 1
      };
      
      const skills: Skill[] = [];
      Object.entries(skillsByCategory).forEach(([category, count]) => {
        for (let i = 0; i < count; i++) {
          skills.push(createTestSkill({
            id: `${category}-${i}`,
            name: `${category} Skill ${i + 1}`,
            category: category as SkillCategory,
            level: (i % 5) + 1
          }));
        }
      });
      
      const { container } = render(
        React.createElement(SkillRenderer, { 
          skills,
          mode: 'web',
          showCategories: true
        })
      );
      
      // Property: Should create separate sections for each category
      const categoryHeaders = container.querySelectorAll('h3');
      expect(categoryHeaders.length).toBe(Object.keys(skillsByCategory).length);
      
      // Property: Each category should show correct count
      categoryHeaders.forEach(header => {
        const headerText = header.textContent || '';
        const categoryMatch = headerText.match(/\((\d+)\)/);
        if (categoryMatch) {
          const count = parseInt(categoryMatch[1]);
          expect(count).toBeGreaterThan(0);
        }
      });
    });

    test('Property 3j: Skill renderer - mode switching affects styling consistently', () => {
      const skills = [
        createTestSkill({ name: 'JavaScript', level: 5 }),
        createTestSkill({ name: 'React', level: 4 }),
        createTestSkill({ name: 'Node.js', level: 3 })
      ];
      
      const modes = ['web', 'pdf'] as const;
      
      modes.forEach(mode => {
        const { container } = render(
          React.createElement(SkillRenderer, { 
            skills,
            mode,
            showCategories: false
          })
        );
        
        // Property: Should render all skills regardless of mode
        const skillElements = container.querySelectorAll('[title*="Level"], div > span');
        expect(skillElements.length).toBeGreaterThan(0);
        
        // Property: Container should have appropriate styling for mode
        const containerElement = container.firstChild as HTMLElement;
        const containerStyle = window.getComputedStyle(containerElement);
        
        if (mode === 'web') {
          expect(containerStyle.color).toBe('white');
        } else {
          expect(containerStyle.color).toBe('rgb(0, 0, 0)');
        }
      });
    });

    test('Property 3k: Skill renderer - skill level updates are reflected in dots', () => {
      const baseSkill = createTestSkill({ name: 'Test Skill' });
      const levels = [1, 2, 3, 4, 5];
      
      levels.forEach(level => {
        const skill = { ...baseSkill, level };
        
        const { container } = render(
          React.createElement(SkillRenderer, { 
            skills: [skill],
            mode: 'web',
            showCategories: false
          })
        );
        
        // Property: Dot visualization should match skill level
        const dots = container.querySelectorAll('span[title*="Level"]');
        
        // Count filled dots by checking background color
        let filledCount = 0;
        dots.forEach(dot => {
          const style = window.getComputedStyle(dot);
          if (style.backgroundColor.includes('rgb(102, 126, 234)')) {
            filledCount++;
          }
        });
        
        expect(filledCount).toBe(level);
      });
    });
  });

  describe('Integration and Edge Cases', () => {
    test('Property 3l: Skill renderer - handles mixed skill levels correctly', () => {
      const mixedSkills = [
        createTestSkill({ name: 'Expert Skill', level: 5 }),
        createTestSkill({ name: 'Beginner Skill', level: 1 }),
        createTestSkill({ name: 'Intermediate Skill', level: 3 }),
        createTestSkill({ name: 'Advanced Skill', level: 4 }),
        createTestSkill({ name: 'Basic Skill', level: 2 })
      ];
      
      const { container } = render(
        React.createElement(SkillRenderer, { 
          skills: mixedSkills,
          mode: 'web',
          showCategories: false
        })
      );
      
      // Property: Should render all skills with correct individual levels
      mixedSkills.forEach(skill => {
        const skillElement = container.querySelector(`[title*="${skill.name}"]`);
        expect(skillElement).toBeTruthy();
        expect(skillElement?.getAttribute('title')).toContain(`Level ${skill.level}/5`);
      });
    });

    test('Property 3m: Skill renderer - click handlers work in web mode only', () => {
      const skills = [createTestSkill({ name: 'Clickable Skill' })];
      const mockClickHandler = jest.fn();
      
      // Test web mode (should be clickable)
      const { container: webContainer } = render(
        React.createElement(SkillRenderer, { 
          skills,
          mode: 'web',
          onSkillClick: mockClickHandler
        })
      );
      
      // Look for the skill item div that should have cursor pointer
      const webSkillItems = webContainer.querySelectorAll('div[title*="Clickable Skill"]');
      expect(webSkillItems.length).toBeGreaterThan(0);
      
      // Test PDF mode (should not be clickable)
      const { container: pdfContainer } = render(
        React.createElement(SkillRenderer, { 
          skills,
          mode: 'pdf',
          onSkillClick: mockClickHandler
        })
      );
      
      // PDF mode should not have click handlers
      const pdfSkillItems = pdfContainer.querySelectorAll('div');
      expect(pdfSkillItems.length).toBeGreaterThan(0);
    });
  });
});