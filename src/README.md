# Refolio Source Structure

## Directory Organization

```
src/
├── components/          # React components
│   ├── pages/          # Page-level components
│   └── ui/             # Reusable UI components
├── config/             # Configuration files
├── services/           # Business logic and external integrations
├── tests/              # Test files and utilities
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Files

- `types/index.ts` - Core data models and interfaces
- `services/index.ts` - Service interfaces for OCR, PDF export, etc.
- `config/firebase.ts` - Firebase configuration
- `tests/setup.ts` - Property-based testing configuration

## Development

This project uses:
- React 19 with TypeScript
- Firebase for backend services
- Tesseract.js for OCR
- @react-pdf/renderer for PDF generation
- fast-check for property-based testing
- styled-components for glassmorphic UI

## Testing

Tests are configured to run with Jest and fast-check for property-based testing.
Each property test runs a minimum of 100 iterations as specified in the design document.