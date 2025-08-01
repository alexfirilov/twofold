# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan & Review

### Before starting work
- Always use plan mode to make a plan
- After creating the plan, write it to .claude/tasks/TASK_NAME.md
- The plan should be a detailed implementation plan with reasoning and broken down tasks
- If the task requires external knowledge or packages, research to get latest knowledge (use Task tool for research)
- Don't over plan - always think MVP
- Once you write the plan, ask for approval before continuing

### While implementing
- Update the plan as you work
- After completing tasks, append detailed descriptions of changes made for handover to other engineers

## Project Overview

"Our Little Corner" is a personal web application - a romantic digital scrapbook for celebrating relationships. It's a surprise gift project featuring a password-protected gallery for viewing photos/videos with personal notes, and a hidden admin panel for content management.

## Architecture

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS + Shadcn UI components
- **Backend**: Next.js API routes (monolithic structure)
- **Database**: PostgreSQL (containerized) with connection pooling
- **Storage**: Amazon S3 for media files with presigned URLs
- **Authentication**: Simple password + session cookies (JWT)
- **Deployment**: Docker Compose with separate app and database containers

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Docker Development
docker-compose up -d                    # Start all services
docker-compose up -d --build           # Rebuild and start
docker-compose logs -f app             # View app logs
docker-compose logs -f db              # View database logs
docker-compose down                    # Stop all services

# Database Management
docker-compose exec db pg_isready -U postgres -d our_little_corner  # Check DB health
docker-compose exec db psql -U postgres -d our_little_corner        # Access DB shell
```

## Key Directory Structure

```
app/
├── (gallery)/           # Main gallery route group (password protected)
│   └── components/      # MediaGallery.tsx, MediaCard.tsx, MediaDetailModal.tsx
├── admin/              # Admin panel (/admin route)
│   ├── components/     # AdminDashboard.tsx, UploadForm.tsx, MediaManagement.tsx, RichTextEditor.tsx
│   └── page.tsx        # Admin dashboard page
├── api/                # API routes
│   ├── auth/route.ts   # Password verification & session creation
│   ├── media/route.ts  # Media CRUD operations (GET/POST/PUT/DELETE)
│   ├── upload/route.ts # S3 presigned URL generation
│   └── health/route.ts # Health check endpoint
├── lib/
│   ├── db.ts           # PostgreSQL connection pool & database queries
│   ├── s3.ts           # S3 client operations and file management
│   ├── auth.ts         # Authentication utilities and session validation
│   └── utils.ts        # General utilities
├── components/ui/      # Shadcn UI components (button, card, dialog, input, label)
└── middleware.ts       # Route protection and security headers
```

## Database Schema

### Media Table
- `id` (UUID, primary key)
- `filename`, `original_name`, `s3_key`, `s3_url`
- `file_type`, `file_size`, `width`, `height`, `duration`
- `title`, `note` (user content)
- `date_taken`, `created_at`, `updated_at`

### Sessions Table
- `id` (UUID, primary key)
- `session_token`, `expires_at`, `created_at`

## Key Components & Patterns

### Database Operations
- Use connection pooling via `app/lib/db.ts`
- All database functions are async and include proper error handling
- Media operations: `getAllMedia()`, `createMediaItem()`, `updateMediaItem()`, `deleteMediaItem()`
- Session management: `createSession()`, `getSessionByToken()`, `deleteSession()`

### Authentication Flow
1. User enters password at `/login`
2. API validates password and creates JWT session
3. Session stored as HTTP-only cookie (`our-corner-session`)
4. Middleware protects routes `/` and `/admin`
5. API routes use `requireAuth()` from `lib/auth.ts`

### File Upload Process
1. Frontend requests presigned URL from `/api/upload`
2. File uploaded directly to S3 using presigned URL
3. Frontend sends metadata to `/api/media` to create database record
4. S3 files are referenced by `s3_key` and accessed via `s3_url`

### Design System

**Main Gallery (Romantic Theme)**:
- Primary: #FFC0CB (Pastel Pink)
- Secondary: #F5E6E8 (Creamy White)  
- Accent: #D9AAB7 (Dusty Rose)
- Text: #5C5470 (Dark Muted Purple)
- Fonts: "Dancing Script"/"Pacifico" for headings, "Lato"/"Quicksand" for body

**Admin Panel**: Clean, functional design using default Shadcn UI components

## Environment Configuration

Required environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@db:5432/our_little_corner
POSTGRES_DB=our_little_corner
POSTGRES_PASSWORD=secure_password

# Authentication
APP_PASSWORD=your_romantic_password
JWT_SECRET=your_jwt_secret_minimum_32_characters
NEXTAUTH_SECRET=your_nextauth_secret_minimum_32_characters

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# App URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Features

- **Route Protection**: Middleware enforces authentication on `/` and `/admin`
- **Session Management**: HTTP-only cookies with JWT tokens
- **Content Security Policy**: Comprehensive CSP headers in middleware
- **Input Validation**: API routes validate all inputs
- **SQL Injection Prevention**: Parameterized queries in all database operations
- **S3 Security**: Presigned URLs for secure file uploads
- **Error Handling**: Proper error responses without exposing internal details

## Key Features to Implement

1. **Gallery View**: Masonry grid layout with media cards, full-screen modal detail view
2. **Admin Upload**: File upload to S3 via presigned URLs, rich text editor for notes using TipTap
3. **Authentication**: Single password protection with persistent sessions
4. **Media Management**: PostgreSQL storage of metadata, S3 storage of files
5. **Search & Filter**: Search by title/note content, filter by file type

## Development Notes

- The app uses TypeScript throughout - maintain type safety
- All API routes follow RESTful conventions with proper HTTP status codes
- Database queries use connection pooling for performance
- Rich text editing powered by TipTap React editor
- Responsive design with mobile-first approach
- Component architecture follows Next.js App Router conventions
- Error boundaries and proper error handling throughout

## Testing & Quality

- Use `npm run lint` to check code quality
- Verify database health with `/api/health` endpoint
- Test file uploads end-to-end (presigned URL → S3 → database)
- Validate authentication flows and session persistence
- Check responsive design across devices

## Important Implementation Details

### TypeScript Interfaces
- `MediaItem`: Complete media record from database
- `CreateMediaItem`: Data for creating new media records
- `UpdateMediaItem`: Fields that can be updated (title, note, date_taken)
- `Session`: Session record structure

### API Route Patterns
- All protected routes use `requireAuth()` middleware
- Consistent error handling with appropriate HTTP status codes
- Database operations wrapped in try-catch blocks
- S3 operations are non-blocking where possible

### Component Patterns
- Client components use "use client" directive
- State management with React useState
- Proper loading states and error handling
- Responsive design with Tailwind classes

### Security Considerations
- Password verification in development vs production modes
- Session token validation on both client and server
- Middleware route protection with security headers
- S3 file validation for allowed types and sizes