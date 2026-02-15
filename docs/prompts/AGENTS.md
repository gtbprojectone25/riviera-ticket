# AGENTS.md - Riviera Ticket Repository Guide

## Build & Test Commands
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm start            # Run production build
npm run lint         # ESLint check
npm run db:push      # Apply schema to database
npm run db:seed      # Populate database with seed data
npm run db:reset     # Full database reset
npm run db:studio    # Open Drizzle Studio (visual DB manager)
```

## Architecture & Structure
**Stack**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS + PostgreSQL (Neon) + Drizzle ORM

**Key Directories**:
- `src/app/` - Pages & layouts (landing, auth, ticket-selection, checkout, confirmation)
- `src/actions/` - Server Actions (auth.ts, bookings.ts, payments.ts)
- `src/components/` - React components (UI via shadcn/ui)
- `src/db/` - Database config, schema, migrations
- `src/hooks/` - Custom hooks (use-cart, use-countdown)
- `src/lib/` - Utilities & database setup
- `src/types/` - TypeScript type definitions
- `src/stores/` - Zustand state management
- `src/context/` - React context providers

**Database**: PostgreSQL with Drizzle ORM. Schema in `src/db/schema.ts`. Connection via Neon serverless driver.

## Code Style & Conventions
- **Imports**: Use path alias `@/*` from `src/`. Group: React → External libs → Relative imports
- **Types**: TypeScript strict mode enabled. Define interfaces/types in `src/types/` or co-located
- **Naming**: PascalCase components, camelCase functions/variables, UPPER_SNAKE_CASE constants
- **Error Handling**: Use Zod validation in actions. Return `{error: string}` from server actions
- **Formatting**: ESLint + Next.js config. Run `npm run lint` before commits
- **Async**: Server Actions default; use `'use server'` directive. Client components use `'use client'`
- **Styling**: TailwindCSS only. Extend in `tailwind.config.ts`. Use `clsx` for conditionals
