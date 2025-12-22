/**
 * Property-based tests for glassmorphic styling consistency
 * Feature: refolio-platform, Property 7: Glassmorphic styling consistency
 * Validates: Requirements 5.1
 */

import { render } from '@testing-library/react';
import React from 'react';
import GlassmorphicContainer from '../components/ui/GlassmorphicContainer';

describe('Glassmorphic Styling Consistency', () => {
  // Test data generators for property-based testing approach
  const intensityLevels = ['low', 'medium', 'high'] as const;
  const testContents = ['Test content', 'Another test', 'Lorem ipsum dolor sit amet'];
  const testClassNames = ['', 'custom-class', 'multiple custom classes'];

  test('Property 7: Glassmorphic styling consistency - all glassmorphic components have required CSS properties', () => {
    // Test across multiple combinations to simulate property-based testing
    intensityLevels.forEach(intensity => {
      testContents.forEach(content => {
        testClassNames.forEach(className => {
          // Render the glassmorphic container with test data
          const { container } = render(
            React.createElement(GlassmorphicContainer, {
              intensity,
              className,
              children: content
            })
          );

          const glassmorphicElement = container.firstChild as HTMLElement;
          
          // Verify the element exists
          expect(glassmorphicElement).toBeTruthy();
          
          // Property: Intensity should affect the CSS class appropriately
          const classList = glassmorphicElement.classList;
          switch (intensity) {
            case 'low':
              expect(classList.contains('glass')).toBe(true);
              break;
            case 'medium':
              expect(classList.contains('glass-panel')).toBe(true);
              break;
            case 'high':
              expect(classList.contains('glass-high-contrast')).toBe(true);
              break;
          }

          // Property: Custom className should be preserved
          if (className.trim()) {
            className.split(' ').forEach(cls => {
              if (cls.trim()) {
                expect(classList.contains(cls.trim())).toBe(true);
              }
            });
          }

          // Property: Content should be rendered
          expect(glassmorphicElement.textContent).toBe(content);
        });
      });
    });
  });

  test('Property 7b: Glassmorphic styling consistency - CSS class application is deterministic', () => {
    intensityLevels.forEach(intensity => {
      // Render the same component twice with identical props
      const { container: container1 } = render(
        React.createElement(GlassmorphicContainer, {
          intensity,
          children: 'Test content'
        })
      );
      
      const { container: container2 } = render(
        React.createElement(GlassmorphicContainer, {
          intensity,
          children: 'Test content'
        })
      );

      const element1 = container1.firstChild as HTMLElement;
      const element2 = container2.firstChild as HTMLElement;
      
      // Property: Same intensity should always produce same CSS classes
      expect(element1.className).toBe(element2.className);
    });
  });

  test('Property 7c: Glassmorphic styling consistency - all components have glassmorphic properties', () => {
    // Create a test environment with CSS loaded
    const { container } = render(
      React.createElement(GlassmorphicContainer, {
        intensity: 'medium',
        children: 'Test content'
      })
    );

    const glassmorphicElement = container.firstChild as HTMLElement;
    
    // Property: Element should have glassmorphic class
    expect(glassmorphicElement.classList.contains('glass-panel')).toBe(true);
    
    // Property: Element should have padding applied
    expect(glassmorphicElement.style.padding).toBe('2rem');
    
    // Property: Element should be a div
    expect(glassmorphicElement.tagName.toLowerCase()).toBe('div');
  });

  test('Property 7d: Glassmorphic styling consistency - intensity mapping is consistent', () => {
    const intensityToClassMap = {
      'low': 'glass',
      'medium': 'glass-panel', 
      'high': 'glass-high-contrast'
    } as const;

    // Test that intensity mapping is always consistent
    Object.entries(intensityToClassMap).forEach(([intensity, expectedClass]) => {
      const { container } = render(
        React.createElement(GlassmorphicContainer, {
          intensity: intensity as keyof typeof intensityToClassMap,
          children: 'Test'
        })
      );

      const element = container.firstChild as HTMLElement;
      expect(element.classList.contains(expectedClass)).toBe(true);
    });
  });
});