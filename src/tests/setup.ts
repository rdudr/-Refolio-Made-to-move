// Test setup for property-based testing with fast-check
import * as fc from 'fast-check';

// Configure fast-check for consistent test runs
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests during development
});

// Export configured fast-check instance
export { fc };

// Test utilities and generators will be added here in subsequent tasks