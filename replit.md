# Overview

DentalQueue Pro is a comprehensive dental clinic management system built as a full-stack web application. The system provides patient database management, queue management, and a waiting room display for dental clinics. It features a React-based frontend with a modern UI using shadcn/ui components, an Express.js backend with TypeScript, and PostgreSQL database integration through Drizzle ORM.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/building
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with protected routes

## Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API endpoints
- **Authentication**: Passport.js with local strategy and express-session
- **Password Security**: Node.js crypto module with scrypt for password hashing
- **Database ORM**: Drizzle ORM with type-safe schema definitions
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple

## Database Design
- **Primary Database**: PostgreSQL via Neon Database serverless connection
- **Schema Structure**:
  - `clinics` table: User accounts (clinic information)
  - `patients` table: Patient records linked to clinics
  - `queue` table: Daily queue management with status tracking
- **Relationships**: One-to-many between clinics and patients/queue entries
- **Data Validation**: Zod schemas shared between frontend and backend

## API Structure
- **Patient Management**: CRUD operations with search functionality
- **Queue Management**: Add patients, update status (waiting/serving/completed)
- **Authentication**: Login/logout/register endpoints with session management
- **Reports**: Patient statistics and filtered data exports
- **Real-time Updates**: Polling-based queue status updates

## File Organization
- **Monorepo Structure**: 
  - `/client` - React frontend application
  - `/server` - Express.js backend
  - `/shared` - Common TypeScript types and schemas
- **Component Architecture**: Reusable UI components with consistent styling
- **Type Safety**: End-to-end TypeScript with shared schema definitions

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Drizzle Kit**: Database migration and schema management tools

## UI and Styling
- **Radix UI**: Headless component library for accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter font family for typography

## Authentication and Security
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Server-side session management
- **connect-pg-simple**: PostgreSQL session store adapter

## Development Tools
- **Vite**: Fast development server and build tool with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

## Third-party Integrations
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form validation and state management
- **Zod**: Runtime type validation and schema definition
- **Wouter**: Lightweight routing library for single-page application navigation