# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yabaii is a Japanese price comparison application built with Astro and React. It compares prices across major Japanese e-commerce platforms (Amazon, Rakuten, Yahoo Shopping) and provides AI-powered review summaries, deal alerts, and price tracking functionality.

### Technology Stack

- **Framework**: Astro 5.16.3 (static site generation with islands architecture)
- **UI**: React 19 with TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4+ with HeroUI components
- **State Management**: Zustand for client-side state
- **Data Fetching**: TanStack Query for server state
- **Deployment**: Cloudflare Pages (static hosting)
- **Language**: TypeScript (strict mode enabled)

### Architecture Pattern

This project uses Astro's islands architecture:
- Static content: Astro components (`.astro` files)
- Interactive components: React islands (`.jsx/.tsx` files) with `client:*` directives
- Layout system: Base layout with Header, Footer, and BottomNav
- Provider pattern: HeroUIProvider wraps the application

## Commands

### Development
```bash
npm run dev          # Start development server on localhost:4321
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run astro        # Direct access to Astro CLI
```

### Testing & Deployment
```bash
npm run test:deployment    # Run deployment validation script
node scripts/test-deployment.js  # Direct script execution
```

## Project Structure

```
src/
├── components/
│   ├── islands/          # React interactive components (client-side)
│   │   ├── Header.jsx
│   │   ├── SearchBar.jsx
│   │   ├── FilterPanel.jsx
│   │   └── BottomNav.jsx
│   ├── ui/              # Static UI components
│   │   ├── ProductCard.astro
│   │   └── ProductCard.jsx
│   └── layout/          # Layout components
│       ├── Header.astro
│       └── Footer.astro
├── layouts/
│   └── BaseLayout.astro # Main HTML layout with metadata
├── pages/               # Astro pages (file-based routing)
│   ├── index.astro
│   ├── search.astro
│   ├── compare.astro
│   ├── deals.astro
│   ├── alerts.astro
│   ├── profile.astro
│   └── products/[slug].astro
├── types/
│   └── index.ts         # Comprehensive TypeScript definitions
├── styles/
│   └── global.css       # Global styles and animations
└── lib/                 # Utilities and helpers

scripts/                 # Build and deployment scripts
├── test-deployment.js   # Deployment validation
├── validate-quickstart.sh
└── final-integration-test.sh

docs/                    # Project documentation
├── ASTRO_MIGRATION_*.md  # Migration planning docs
├── CLOUDFLARE_DEPLOYMENT_GUIDE.md
└── API_DOCUMENTATION.md
```

## TypeScript Configuration

- **Strict mode**: Enabled
- **Path aliases**: Configured for cleaner imports
  - `@/*` → `./src/*`
  - `@components/*` → `./src/components/*`
  - `@pages/*` → `./src/pages/*`
  - `@utils/*` → `./src/utils/*`
  - `@lib/*` → `./src/lib/*`
  - `@types/*` → `./src/types/*`

## Key Components and Patterns

### Islands Architecture
- React components in `src/components/islands/` use client directives
- Static content in Astro components for optimal performance
- Interactive features like search, filters, and navigation are React islands

### Data Types
The project uses comprehensive TypeScript interfaces defined in `src/types/index.ts`:
- `Product`: Core product entity with pricing, availability, and metadata
- `SearchQuery`/`SearchResult`: Search functionality
- `User`/`UserPreferences`: User management
- `Alert`: Price and stock alerts
- `Comparison`: Product comparison features
- `Deal`: Special offers and discounts

### Layout System
- `BaseLayout.astro`: Main HTML structure with SEO metadata
- Responsive design with mobile-first approach
- Background animations and modern UI patterns
- HeroUI component library integration

### Styling Approach
- Tailwind CSS with custom configuration
- HeroUI theme with custom color scheme
- CSS animations for floating elements
- Responsive breakpoints for mobile/tablet/desktop

## Development Guidelines

### Component Development
1. Use Astro components for static content
2. Create React islands for interactive features
3. Follow TypeScript strict mode requirements
4. Implement proper client directives (`client:load`, `client:only`, etc.)

### File Organization
- Keep Astro components separate from React islands
- Use TypeScript for all new components
- Follow existing naming conventions (PascalCase for components)
- Maintain the established directory structure

### Performance Considerations
- Leverage Astro's static generation for optimal performance
- Minimize client-side JavaScript through islands architecture
- Use appropriate client directives based on component needs
- Optimize images and assets for web delivery

## Deployment

The project is configured for Cloudflare Pages deployment:
- Static site generation (no server-side rendering required)
- Custom domain: yabaii.ai
- Image optimization configured for external domains
- SEO-optimized with proper metadata and sitemap

## Environment and Configuration

- **Node.js**: 18+
- **Package manager**: npm
- **Build output**: Static files in `dist/`
- **Development server**: localhost:4321
- **Type checking**: Strict TypeScript mode
- **CSS**: Tailwind with PostCSS processing
