# Technology Stack & Build System

## Architecture

**Frontend**: Next.js 16 with App Router and React Server Components
**Backend**: Django 6.0 with async views and REST framework
**AI/ML**: Google Gemini Pro with function calling capabilities
**OCR**: Google Cloud Vision API for text extraction
**Database**: Django ORM (PostgreSQL recommended for production)

## Frontend Stack

- **Framework**: Next.js 16 with TypeScript
- **UI Library**: Shadcn UI with custom glassmorphic theme
- **Styling**: Tailwind CSS with CSS variables for dynamic theming
- **Animation**: Framer Motion for component transitions
- **Charts**: Recharts for data visualizations
- **State Management**: React Server Components + client state

## Backend Stack

- **Framework**: Django 6.0 with async support
- **API**: Django REST Framework
- **AI Integration**: google-generativeai library
- **OCR**: google-cloud-vision library
- **File Processing**: PIL/Pillow for image handling

## Key Dependencies

### Frontend
```json
{
  "next": "^16.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "framer-motion": "^10.0.0",
  "recharts": "^2.0.0"
}
```

### Backend
```python
# requirements.txt
Django>=6.0.0
djangorestframework>=3.14.0
google-generativeai>=0.3.0
google-cloud-vision>=3.4.0
Pillow>=10.0.0
```

## Common Commands

### Development Setup
```bash
# Frontend setup
cd frontend/
npm install
npm run dev

# Backend setup
cd backend/
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Build & Deploy
```bash
# Frontend build
npm run build
npm start

# Backend production
python manage.py collectstatic
gunicorn project.wsgi:application
```

### Testing
```bash
# Frontend tests
npm run test
npm run test:e2e

# Backend tests
python manage.py test
pytest  # for property-based tests with Hypothesis
```

## Component Architecture

The system uses a **Component Registry** pattern where AI tool calls map to React components:

```typescript
const COMPONENT_MAP = {
  'tool_hero_prism': HeroPrism,
  'tool_hero_terminal': HeroTerminal,
  'tool_exp_timeline': ExpTimeline,
  'tool_exp_masonry': ExpMasonry,
  'tool_skills_dots': SkillDots,
  'tool_skills_radar': SkillRadar,
  'tool_stats_bento': BentoGrid,
};
```

## Theme System

Uses CSS variables for runtime theme switching:
- **neon_blue**: Tech-focused blue palette
- **emerald_green**: Creative green palette  
- **cyber_pink**: Creative pink palette
- **Glassmorphic Base**: `bg-white/5`, `border-white/10`, `backdrop-blur-md`