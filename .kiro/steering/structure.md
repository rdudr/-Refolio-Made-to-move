# Project Structure & Organization

## Root Directory Layout

```
refolio-genui/
├── .kiro/                    # Kiro configuration and specs
│   ├── specs/               # Feature specifications
│   └── steering/            # AI assistant guidance rules
├── frontend/                # Next.js 16 application
├── backend/                 # Django 6.0 API server
└── docs/                    # Project documentation
```

## Frontend Structure (Next.js 16)

```
frontend/
├── app/                     # App Router pages and layouts
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Landing page with upload interface
│   ├── portfolio/          # Dynamic portfolio routes
│   └── api/                # API route handlers (if needed)
├── components/             # React components
│   ├── ui/                 # Shadcn UI base components
│   ├── portfolio/          # The 7 core portfolio components
│   │   ├── HeroPrism.tsx
│   │   ├── HeroTerminal.tsx
│   │   ├── ExpTimeline.tsx
│   │   ├── ExpMasonry.tsx
│   │   ├── SkillDots.tsx
│   │   ├── SkillRadar.tsx
│   │   └── BentoGrid.tsx
│   └── shared/             # Shared utility components
├── lib/                    # Utility functions and configurations
│   ├── component-registry.ts # Component mapping system
│   ├── theme-engine.ts     # Dynamic theme management
│   └── api-client.ts       # Backend API integration
├── styles/                 # Global styles and theme definitions
│   └── globals.css         # Tailwind + glassmorphic base styles
└── types/                  # TypeScript type definitions
    ├── portfolio.ts        # Portfolio and component types
    └── api.ts              # API response types
```

## Backend Structure (Django 6.0)

```
backend/
├── project/                # Django project configuration
│   ├── settings/           # Environment-specific settings
│   ├── urls.py            # URL routing
│   └── wsgi.py            # WSGI application
├── apps/                   # Django applications
│   ├── portfolio/          # Main portfolio generation app
│   │   ├── models.py      # Data models (Resume, ProcessingResult)
│   │   ├── views.py       # API endpoints (async views)
│   │   ├── serializers.py # DRF serializers
│   │   └── services/      # Business logic services
│   │       ├── ocr_service.py        # Google Cloud Vision integration
│   │       ├── ai_service.py         # Gemini Pro integration
│   │       └── analysis_service.py   # Resume analysis logic
│   └── common/             # Shared utilities
├── tests/                  # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── property/          # Property-based tests (Hypothesis)
└── requirements/           # Dependency management
    ├── base.txt           # Core dependencies
    ├── dev.txt            # Development dependencies
    └── prod.txt           # Production dependencies
```

## Key Architectural Patterns

### Component Registry Pattern
- AI tool calls map to React components via registry
- Enables dynamic component selection and rendering
- Located in `frontend/lib/component-registry.ts`

### Service Layer Architecture
- Business logic separated into service classes
- OCR, AI analysis, and resume processing as distinct services
- Located in `backend/apps/portfolio/services/`

### Theme Engine Pattern
- CSS variables enable runtime theme switching
- Glassmorphic base styles with dynamic color palettes
- Located in `frontend/lib/theme-engine.ts`

## File Naming Conventions

### Frontend (TypeScript/React)
- **Components**: PascalCase (e.g., `HeroPrism.tsx`)
- **Utilities**: kebab-case (e.g., `component-registry.ts`)
- **Types**: kebab-case (e.g., `portfolio.ts`)
- **Pages**: lowercase (e.g., `page.tsx`)

### Backend (Python/Django)
- **Models**: PascalCase classes in snake_case files (e.g., `models.py`)
- **Services**: snake_case (e.g., `ocr_service.py`)
- **Views**: snake_case (e.g., `views.py`)
- **Tests**: `test_` prefix (e.g., `test_ocr_service.py`)

## Configuration Files

### Frontend Configuration
- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS customization
- `tsconfig.json` - TypeScript configuration

### Backend Configuration
- `requirements/` - Python dependencies by environment
- `project/settings/` - Django settings by environment
- `pytest.ini` - Property-based testing configuration

## Testing Organization

### Property-Based Tests
- Use **Hypothesis** (Python) and **fast-check** (TypeScript)
- Minimum 100 iterations per property test
- Tag format: `**Feature: generative-ui-portfolio, Property {number}: {description}**`

### Test Categories
- **Unit Tests**: Component behavior, API contracts
- **Property Tests**: Universal correctness properties
- **Integration Tests**: End-to-end pipeline testing
- **Visual Tests**: Component rendering consistency