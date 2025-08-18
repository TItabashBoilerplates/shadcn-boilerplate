# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack application boilerplate with a multi-platform frontend and backend services:

### Frontend Architecture
- **Monorepo Structure**: Uses Yarn workspaces with apps in `frontend/apps/` and shared packages in `frontend/packages/`
- **Cross-Platform**: Supports web (Next.js), mobile (Expo/React Native), with Tamagui for unified UI components
- **Tech Stack**: React 19, TypeScript, Tamagui UI library, Turbo for build orchestration
- **Build System**: Ultra-runner for concurrent operations, Turbo for dependency management

### Backend Architecture
- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Hono framework for serverless APIs
- **Database**: PostgreSQL with Prisma ORM, includes pgvector extension for embeddings
- **Infrastructure**: Supabase for auth/database, Docker containerization
- **AI Integration**: LangChain, OpenAI, multi-modal AI capabilities, vector search

### Database Design
- Multi-client architecture with corporate users, general users, and virtual users
- Chat system with rooms, messages, and user relationships
- Vector embeddings table for AI/ML features
- Clean separation between user types and permissions

## Development Commands

### Initial Setup
```bash
make init                    # Full project initialization (run once)
```

### Running Services
```bash
make run                     # Start backend services with Docker
make frontend                # Start frontend (web) development server
make local-ios-ts           # Start iOS development
make local-android-ts       # Start Android development
make stop                   # Stop all services
```

### Database Operations
```bash
make migration              # Run database migrations
make build-model            # Generate Prisma clients for all platforms
make seed                   # Seed database with initial data
make rollback              # Rollback last migration
```

### Model Generation
```bash
make build-model-frontend-supabase  # Generate Supabase types for frontend
make build-model-functions          # Generate types for edge functions
make build-model-prisma            # Generate Prisma clients
```

### Frontend Development
```bash
cd frontend
yarn web                    # Next.js web development
yarn ios                    # iOS development
yarn android               # Android development
yarn build                 # Build all packages
yarn test                  # Run tests
```

### Backend Development (Python)
Backend follows clean architecture with strict separation of concerns:
- Controllers handle HTTP requests/responses only
- Use cases contain business logic
- Gateways provide data access interfaces
- Infrastructure handles external dependencies

Code quality tools:
- Ruff for linting (line length: 88)
- MyPy for type checking (strict mode)
- Maximum function complexity: 3 (McCabe)

### Edge Functions Development
Edge Functions use Hono framework for serverless API development:
- Built with Deno runtime for TypeScript support
- Hono provides Express-like API with better performance
- Each function should have a `deno.json` with Hono imports
- Import map configuration for dependency management
- Type-safe integration with Supabase client and database schema

## Code Style and Quality

### Frontend
- Biome for linting and formatting
- 2-space indentation, 100-character line width
- TypeScript strict mode
- Import type enforced for type-only imports

### UI Design System
- **Design Language**: Unified design system based on Material Design 3 principles
- **Theme System**: Use Material Design 3 compliant themes defined in `frontend/packages/config/src/material-theme.ts`
- **Typography**: Material Design 3 typography system defined in `frontend/packages/config/src/material-text.tsx`
- **Color Tokens**: Use only the predefined tokens below:
  - **Base Colors**: `$color`, `$background`, `$borderColor`, `$placeholderColor`, `$outlineColor`
  - **Material Design 3 Colors**: `$primary`, `$secondary`, `$tertiary`, `$error`
  - **State Colors**: `$red`, `$green`, `$blue`, `$yellow` (each with 1-12 gradations)
  - **Text Colors**: `$color1-12` (contrast gradations)
  - **Shadow Colors**: `$shadow1-6`, `$shadowColor`
  - **Monochrome Colors**: `$white1-12`, `$black1-12`

### UI Implementation Guidelines
1. **Theme Usage**: Always use `material_light` or `material_dark` themes
2. **Typography**: Use Material Design 3 text components:
   - Display: `DisplayLarge`, `DisplayMedium`, `DisplaySmall`
   - Headline: `HeadlineLarge`, `HeadlineMedium`, `HeadlineSmall`
   - Title: `TitleLarge`, `TitleMedium`, `TitleSmall`
   - Body: `BodyLarge`, `BodyMedium`, `BodySmall`
   - Label: `LabelLarge`, `LabelMedium`, `LabelSmall`
   - Aliases: `H1-H6`, `Body1-2`, `Subtitle1-2`, `Caption`, `Overline`
3. **Color Token Usage**: Only use predefined color tokens, avoid hardcoded color values
4. **Accessibility**: Follow Material Design 3 accessibility guidelines
5. **Responsive Design**: Consider cross-platform compatibility

### Example: Correct UI Implementation
```typescript
// ✅ Good example: Material Design 3 compliant
<Theme name="material_light">
  <Card padding="$4" borderColor="$outlineColor">
    <TitleLarge color="$primary">Title</TitleLarge>
    <BodyMedium color="$color">Body text</BodyMedium>
    <Button theme="primary">Action</Button>
  </Card>
</Theme>

// ❌ Bad example: Hardcoded color values
<Card padding="16" borderColor="#cccccc">
  <Text fontSize="22" color="#6442d6">Title</Text>
  <Text fontSize="14" color="#333333">Body text</Text>
</Card>
```

### Backend Python
- Ruff with comprehensive rule set (pyproject.toml)
- Google-style docstrings
- All functions must have type annotations
- Async/await for all I/O operations
- Clean architecture dependency rules enforced

### Edge Functions
- Hono framework for routing and middleware
- TypeScript strict mode with proper type annotations
- Deno formatting and linting standards
- Import maps for clean dependency management

## Environment Configuration

Environment files are in `env/` directory:
- `env/secrets.env` - Copy from `env/secrets.env.example` and configure
- `env/frontend/local.env` - Frontend environment variables
- `env/migration/local.env` - Database migration settings

## Special Notes

### Multi-Client Prisma Generation
The schema generates clients for multiple targets:
- Frontend TypeScript client
- Backend Python client  
- Edge functions (Deno) client
- Flutter/Dart client

### AI/ML Features
- Vector embeddings with pgvector
- LangChain integration for complex AI workflows
- Multiple LLM providers supported (OpenAI, Anthropic)
- RAG (Retrieval Augmented Generation) capabilities

### Authentication
- Supabase auth integration
- JWT token verification middleware
- User context properly typed throughout application

### Development Workflow
- Use `make` commands for consistency across team
- Environment variables managed through dotenvx
- Docker compose for service orchestration
- Supports multiple development environments (local, staging, production)

## Important Notes for UI Implementation

### Material Design 3 Theme Verification
When implementing frontend UI, always follow these steps:

1. **Check Theme Files**
   - `frontend/packages/config/src/material-theme.ts` - Color token definitions
   - `frontend/packages/config/src/material-text.tsx` - Typography components
   - `frontend/packages/config/src/material-fonts.ts` - Font configurations

2. **Reference Demo Pages**
   - `http://localhost:3001/typography-example` - Typography system demo
   - `http://localhost:3001/theme-example` - Theme and color system demo

3. **Available Components**
   ```typescript
   // Material Design 3 Typography Components
   import { 
     DisplayLarge, HeadlineLarge, TitleLarge, BodyLarge, LabelLarge,
     H1, H2, H3, H4, H5, H6, Body1, Body2, Caption 
   } from '@my/config'
   
   // Theme Usage
   import { Theme } from '@my/ui'
   <Theme name="material_light">
     <TitleLarge color="$primary">Title</TitleLarge>
   </Theme>
   ```

4. **Strict Color Token Usage**
   - Hardcoded color values (`#ffffff`, `rgb(255,255,255)`, etc.) are prohibited
   - Always use predefined color tokens (`$primary`, `$color`, `$background`, etc.)
   - When new colors are needed, add them to theme files following Material Design 3 guidelines

5. **Accessibility Compliance**
   - Follow Material Design 3 contrast ratio standards
   - Consider color vision deficiency (don't rely solely on color for information)
   - Support screen readers

This implementation ensures a unified, accessible, and maintainable UI system.