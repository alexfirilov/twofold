# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment & MCP Integration

### Current Environment
- **Active Environment**: Development (dev)
- **Credentials Location**: `.env` file in project root (contains AWS credentials and other secrets)
- **GitHub Integration**: Use GitHub MCP server for repository operations

### Required Workflow
1. **Documentation**: Always document work progress and decisions in GitHub issues
2. **GitHub Actions**: Manually trigger workflows when appropriate for the dev environment
3. **Infrastructure**: Use Terraform commands for dev environment infrastructure management
4. **MCP Usage**: Leverage available MCP servers, especially GitHub MCP for repository access and management

### GitHub Integration Commands
- Create/update issues to track development work
- Reference relevant GitHub Actions workflows
- Use GitHub MCP to access repository data and manage issues/PRs

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

"Our Little Corner" is a multi-tenant romantic digital scrapbook web application for celebrating relationships. Each couple gets their own private "corner" (space) to store and share memories. The app supports Firebase authentication, invite systems, and multiple access patterns including password-protected shared access.

## Architecture

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS + Shadcn UI components
- **Backend**: Next.js API routes (monolithic structure)
- **Database**: PostgreSQL (containerized) with multi-tenant schema and RLS
- **Storage**: Amazon S3 for media files with presigned URLs
- **Authentication**: Firebase Auth + fallback password/session system (JWT)
- **Multi-tenancy**: Corner-based isolation with invite system
- **Deployment**: AWS ECS with EC2 + Application Load Balancer (primary) or Docker Compose (local dev)

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

# Local Development (without Docker)
npm install                             # Install dependencies
cp .env.example .env.local             # Copy environment variables
docker-compose up -d db                # Start only database
npm run dev                            # Run development server

# Testing
# QA Framework (available in qa/ directory)
cd qa/automated-tests && npm install  # Install test dependencies
cd qa/automated-tests && npm test     # Run all tests
npm run test:unit                     # Run unit tests
npm run test:integration              # Run integration tests
npm run test:e2e                      # Run end-to-end tests

# Infrastructure Testing
cd devops/terraform/infrastructure && terraform plan -var-file="dev.tfvars"

# ECS Deployment (Recommended)
# Deploy with ECS cluster, ALB, and managed scaling
gh workflow run deploy-ecs.yml --ref main -f environment=DEV

# Legacy EC2 Deployment
# Deploy to single EC2 instance (legacy method)
gh workflow run deploy.yml --ref main -f environment=DEV

# ECS Validation
./scripts/validate-ecs-deployment.sh -e dev  # Validate ECS deployment
```

## Key Directory Structure

```
app/
├── (gallery)/           # Main gallery route group (password protected)
│   └── components/      # Gallery components with memory group support
│       ├── MediaGallery.tsx & EnhancedMediaGallery.tsx
│       ├── MediaCard.tsx & MediaDetailModal.tsx
│       ├── MemoryGroupDetailModal.tsx  # Memory group viewing
│       ├── FilterControls.tsx & SortControls.tsx & ViewControls.tsx
│       └── CountdownTimer.tsx  # For locked memory groups
├── admin/              # Admin panel (/admin route)
│   ├── components/     # Enhanced admin functionality
│   │   ├── AdminDashboard.tsx & EnhancedAdminDashboard.tsx
│   │   ├── UploadForm.tsx & EnhancedUploadForm.tsx
│   │   ├── MediaManagement.tsx & MediaEditor.tsx
│   │   ├── MemoryGroupManagement.tsx  # Memory group admin
│   │   ├── LockingControls.tsx  # Advanced locking features
│   │   ├── TaskManagement.tsx   # Task-based unlocking
│   │   └── RichTextEditor.tsx   # TipTap editor for notes
│   └── page.tsx        # Admin dashboard page
├── api/                # API routes
│   ├── auth/route.ts   # Password verification & session creation
│   ├── corners/        # Corner (tenant) management API
│   │   ├── route.ts    # CRUD operations for corners
│   │   └── [id]/       # Individual corner operations
│   │       ├── route.ts      # Get/update/delete corner
│   │       ├── invites/      # Corner invite management
│   │       └── users/        # Corner user management
│   ├── corner-invites/ # Global invite management
│   │   ├── route.ts    # Create/list invites
│   │   └── [id]/       # Individual invite operations
│   │       ├── route.ts      # Get/update invite
│   │       └── accept/route.ts # Accept invite
│   ├── user/           # Current user operations
│   │   └── pending-invites/route.ts # User's pending invites
│   ├── media/route.ts  # Media CRUD operations (GET/POST/PUT/DELETE)
│   ├── memory-groups/  # Memory group API endpoints
│   │   ├── route.ts    # CRUD operations for groups
│   │   └── [id]/       # Individual group operations
│   │       ├── route.ts        # Get/update specific group
│   │       └── unlock/route.ts # Unlock functionality
│   ├── upload/route.ts # S3 presigned URL generation
│   └── health/route.ts # Health check endpoint
├── lib/
│   ├── db.ts           # PostgreSQL connection pool & database queries
│   ├── s3.ts           # S3 client operations and file management
│   ├── auth.ts         # Authentication utilities and session validation
│   ├── types.ts        # Multi-tenant TypeScript interfaces and types
│   ├── utils.ts        # General utilities
│   └── firebase/       # Firebase configuration and server-side auth
│       ├── config.ts   # Firebase client configuration
│       ├── admin.ts    # Firebase Admin SDK setup
│       ├── auth.ts     # Firebase Auth client utilities
│       └── serverAuth.ts # Server-side Firebase Auth validation
├── components/         # Shared components
│   ├── CornerSelector.tsx # Corner selection interface
│   ├── ProfileDropdown.tsx # User profile menu
│   └── ui/             # Shadcn UI components (button, card, dialog, input, label)
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Firebase authentication state management
│   └── CornerContext.tsx # Current corner and user role management
├── corner-selector/    # Corner selection page
│   └── page.tsx        # Corner selection interface
├── invite/            # Invite acceptance pages
│   └── [code]/        # Dynamic invite code handling
│       └── page.tsx   # Invite acceptance page
├── settings/          # User settings pages
│   └── page.tsx       # Settings interface
└── middleware.ts      # Route protection and security headers
├── devops/               # Infrastructure and deployment
│   └── terraform/        # AWS infrastructure as code
│       ├── bootstrap/    # Terraform state management setup
│       └── infrastructure/ # Main application infrastructure
├── qa/                   # Testing framework
│   └── automated-tests/  # Unit, integration, and e2e tests
├── scripts/              # Setup and utility scripts
│   ├── setup.sh          # Environment setup script
│   └── startup.js        # Application startup script
└── database/             # Database schemas and migrations
    ├── multi-tenant-schema.sql
    └── fix-orphaned-media.sql
```

## Database Schema

### Multi-Tenant Core Tables

#### Corners Table (Tenant Isolation)
- `id` (UUID, primary key)
- `name`, `description` (corner metadata)
- `slug` (human-readable URL identifier), `invite_code` (secure sharing)
- `is_public` (boolean), `share_password` (hashed, optional)
- `admin_firebase_uid` (Firebase UID of corner creator)
- `created_at`, `updated_at`

#### Corner Users Table (User-Corner Relationships)
- `id` (UUID, primary key)
- `corner_id` (FK to corners), `firebase_uid` (Firebase Auth UID)
- `display_name`, `email`, `avatar_url` (cached Firebase data)
- `role` ('admin'/'participant'), permissions (upload, edit, manage)
- `joined_at`, `last_active_at`

#### Corner Invites Table (Invitation System)
- `id` (UUID, primary key)
- `corner_id` (FK to corners), `email`, `invite_token`
- `role`, permissions, `status` ('pending'/'accepted'/'expired'/'revoked')
- `invited_by_firebase_uid`, `expires_at`, `created_at`, `accepted_at`

### Content Tables (Corner-Aware)

#### Memory Groups Table
- `id` (UUID, primary key)
- `corner_id` (FK to corners) - **Multi-tenant isolation**
- `title`, `description` (optional metadata)
- `is_locked` (boolean), `unlock_date` (timestamp)
- `cover_media_id` (reference to featured media)
- `created_by_firebase_uid` (FK to Firebase user)
- `created_at`, `updated_at`
- **Advanced Locking Features:**
  - `lock_visibility` ('public'/'private')
  - `show_date_hint`, `show_image_preview`, `blur_percentage`
  - `unlock_hint`, `unlock_task`, `unlock_type` ('scheduled'/'task_based')
  - `task_completed` (boolean)
- **Public Visibility Controls:**
  - `show_title`, `show_description`, `show_media_count`, `show_creation_date`

#### Media Table
- `id` (UUID, primary key)
- `corner_id` (FK to corners) - **Multi-tenant isolation**
- `memory_group_id` (optional, links to memory groups)
- `filename`, `original_name`, `s3_key`, `s3_url`
- `file_type`, `file_size`, `width`, `height`, `duration`
- `title`, `note` (user content)
- `date_taken`, `created_at`, `updated_at`
- `sort_order` (for ordering within groups)
- `uploaded_by_firebase_uid` (FK to Firebase user)

### Additional Tables

#### Sessions Table (Guest/Shared Access)
- `id` (UUID, primary key)
- `session_token`, `corner_id` (optional), `firebase_uid` (optional)
- `session_type` ('firebase'/'guest'/'shared')
- `expires_at`, `created_at`

#### Shared Access Tokens Table (Temporary Access)
- `id` (UUID, primary key)
- `corner_id` (FK to corners), `token`, `permissions` (JSON)
- `max_uses`, `current_uses`, `expires_at`
- `created_by_firebase_uid`, `created_at`

#### Corner Analytics Table (Usage Tracking)
- `id` (UUID, primary key)
- `corner_id` (FK to corners), `event_type`, `firebase_uid` (optional)
- `metadata` (JSON), `ip_address`, `user_agent`, `created_at`

## Key Components & Patterns

### Database Operations
- Use connection pooling via `app/lib/db.ts`
- All database functions are async and include proper error handling
- **Multi-tenant isolation:** All queries include `corner_id` for tenant separation
- **Corner operations:** `getAllCorners()`, `createCorner()`, `updateCorner()`, `deleteCorner()`, `getCornerBySlug()`
- **Corner user operations:** `getCornerUsers()`, `addUserToCorner()`, `updateUserRole()`, `removeUserFromCorner()`
- **Invite operations:** `createInvite()`, `getInviteByToken()`, `acceptInvite()`, `expireInvite()`
- **Media operations:** `getAllMedia()`, `createMediaItem()`, `updateMediaItem()`, `deleteMediaItem()`
- **Memory Group operations:** `getAllMemoryGroups()`, `createMemoryGroup()`, `updateMemoryGroup()`, `deleteMemoryGroup()`, `unlockMemoryGroup()`
- **Session management:** `createSession()`, `getSessionByToken()`, `deleteSession()`

### Authentication Flow

#### Firebase Authentication (Primary)
1. User signs up/in with Firebase Auth (email/password or providers)
2. Firebase ID token is validated server-side using Firebase Admin SDK
3. User is automatically added to corners they have access to
4. `AuthContext` manages Firebase auth state throughout the app
5. `CornerContext` manages current corner selection and user role

#### Fallback Password Authentication (Legacy/Guest)
1. User enters corner password at `/login`
2. API validates password and creates JWT session
3. Session stored as HTTP-only cookie (`our-corner-session`)
4. Middleware protects routes `/` and `/admin`
5. API routes use `requireAuth()` from `lib/auth.ts`

#### Invite System
1. Corner admin generates invite with email and permissions
2. Invitee receives email with secure token link
3. Link accepts invite and creates Firebase account if needed
4. User is added to corner with specified role and permissions

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

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Fallback Authentication (Legacy)
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

## Key Features

1. **Gallery View**: Masonry grid layout with memory group support, full-screen modal detail view
2. **Memory Groups**: Organized collections of media with advanced locking features
3. **Advanced Locking System**: 
   - Scheduled unlocking with countdown timers
   - Task-based unlocking with custom challenges  
   - Visibility controls (public/private locked content)
   - Blur effects and preview controls
4. **Admin Panel**: File upload to S3, memory group management, rich text editor using TipTap
5. **Authentication**: Single password protection with persistent sessions
6. **Media Management**: PostgreSQL metadata storage, S3 file storage, sorting within groups
7. **Search & Filter**: Search by title/note content, filter by file type and memory groups

## Development Notes

- The app uses TypeScript throughout - maintain type safety
- All API routes follow RESTful conventions with proper HTTP status codes
- Database queries use connection pooling for performance
- Rich text editing powered by TipTap React editor
- Responsive design with mobile-first approach
- Component architecture follows Next.js App Router conventions
- Error boundaries and proper error handling throughout

## Testing & Quality

### Code Quality
- Use `npm run lint` to check code quality
- TypeScript type checking is built into Next.js build process
- Verify database health with `/api/health` endpoint

### Testing Framework (qa/automated-tests/)
The project includes a testing framework with:
- **Unit Tests**: Component and utility function tests (`qa/automated-tests/unit/`)
- **Integration Tests**: API endpoint and database integration tests (`qa/automated-tests/integration/`)
- **E2E Tests**: Full user workflow testing (`qa/automated-tests/e2e/`)

### Manual Testing Workflows
- Test file uploads end-to-end (presigned URL → S3 → database)
- Validate authentication flows and session persistence
- Check responsive design across devices
- Test memory group locking/unlocking functionality
- Verify multi-tenant data isolation

## Important Implementation Details

### TypeScript Interfaces

All types are defined in `app/lib/types.ts` for the multi-tenant system:

- **Multi-Tenant Core Types:**
  - `Corner`: Complete corner record with metadata and calculated fields
  - `CreateCorner`, `UpdateCorner`: Corner creation and update data
  - `CornerUser`: User-corner relationship with role and permissions
  - `CornerInvite`: Invitation system with status tracking
  - `CornerRole`: 'admin' | 'participant' enum
  - `InviteStatus`: 'pending' | 'accepted' | 'expired' | 'revoked' enum

- **Content Types (Corner-aware):**
  - `MediaItem`: Complete media record (includes corner_id, uploaded_by_firebase_uid)
  - `CreateMediaItem`, `UpdateMediaItem`: Media creation and update data
  - `MemoryGroup`: Complete memory group record (includes corner_id, created_by_firebase_uid)
  - `CreateMemoryGroup`, `UpdateMemoryGroup`: Memory group creation and update data

- **Authentication Types:**
  - `FirebaseUser`: Firebase Auth user interface
  - `Session`: Multi-type session (firebase/guest/shared)
  - `SessionType`: 'firebase' | 'guest' | 'shared' enum
  - `AuthContextType`: React context for Firebase auth state
  - `CornerContextType`: React context for corner and role management

- **Sharing & Analytics:**
  - `SharedAccessToken`: Temporary access tokens with permissions
  - `CornerAnalytics`: Usage tracking and analytics
  - `ShareableLink`: Shareable corner links with controls

### API Route Patterns
- **Multi-tenant isolation:** All routes validate `corner_id` and user permissions
- **Firebase integration:** Routes support both Firebase ID tokens and legacy JWT sessions
- **Permission checking:** Role-based access control (admin/participant permissions)
- All protected routes use `requireAuth()` middleware
- Consistent error handling with appropriate HTTP status codes
- Database operations wrapped in try-catch blocks
- S3 operations are non-blocking where possible

### Component Patterns
- **Context-driven architecture:** Components consume `AuthContext` and `CornerContext`
- **Role-based rendering:** UI adapts based on user's role in current corner
- **Multi-tenant aware:** All data fetching includes current corner context
- Client components use "use client" directive
- State management with React useState and Context API
- Proper loading states and error handling
- Responsive design with Tailwind classes

### Security Considerations
- **Multi-tenant isolation:** Row-level security (RLS) policies ensure corner data separation
- **Firebase Auth integration:** Server-side ID token validation with Firebase Admin SDK
- **Role-based permissions:** Granular permissions (upload, edit, manage) within corners
- **Invite system security:** Secure token generation with expiration and status tracking
- Password verification in development vs production modes
- Session token validation on both client and server
- Middleware route protection with security headers
- S3 file validation for allowed types and sizes

## Multi-Tenant Architecture Notes

### Corner Isolation
- All content (media, memory groups) is isolated by `corner_id`
- Database queries include corner context for tenant separation
- Row-level security policies enforce access control
- Users can belong to multiple corners with different roles

### User Management
- Firebase Auth provides user identity across the platform
- Corner-specific roles and permissions stored in `corner_users` table
- Invitation system allows secure onboarding of new users
- User data cached locally for performance (display_name, email, avatar)

### Access Patterns
1. **Corner Admin**: Full control over corner settings, users, and content
2. **Corner Participant**: Can view/upload based on granted permissions
3. **Guest Access**: Temporary access via shared tokens or legacy passwords
4. **Invite Recipients**: Can accept invites to join corners permanently

### Database Migrations
- `database/multi-tenant-schema.sql` contains the new multi-tenant schema
- Migration scripts handle existing single-tenant data transformation
- Backward compatibility maintained for legacy authentication flows
- Database initialization uses UUID extensions and PostgreSQL enum types

## Key Implementation Notes

### Package Dependencies
The project uses several key libraries:
- **TipTap**: Rich text editor (`@tiptap/react`, `@tiptap/starter-kit`)
- **Radix UI**: Accessible component primitives (`@radix-ui/*`)
- **AWS SDK**: S3 integration (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Firebase**: Authentication (`firebase`, `firebase-admin`, `next-firebase-auth-edge`)
- **bcryptjs**: Password hashing for legacy auth
- **date-fns**: Date manipulation and formatting
- **Lucide React**: Icon library

### Firebase Configuration Requirements
The app requires both client-side and server-side Firebase configuration:
- Client config in `app/lib/firebase/config.ts` for browser authentication
- Server config in `app/lib/firebase/admin.ts` for token validation
- Middleware integration via `next-firebase-auth-edge` for session management

## Infrastructure & Deployment

### AWS Infrastructure (devops/terraform/)
The project includes complete Terraform infrastructure for AWS deployment:

```bash
# Terraform Commands (from devops/terraform/infrastructure/)
terraform init                                  # Initialize Terraform
terraform workspace new dev                     # Create development workspace
terraform workspace select dev                  # Switch to development
terraform plan -var-file="dev.tfvars"          # Plan infrastructure changes
terraform apply -var-file="dev.tfvars"         # Deploy infrastructure
terraform output                                # Get deployment info (URLs, IPs)
terraform destroy -var-file="dev.tfvars"       # Clean up environment
```

### Infrastructure Components
- **VPC**: Isolated network per environment (dev/stage/prod)
- **ECS**: Container orchestration with EC2 capacity provider (primary deployment)
- **ALB**: Application Load Balancer for traffic distribution and health checks
- **EC2**: Auto Scaling Group for ECS cluster instances
- **ECR**: Container registry for application images
- **RDS**: PostgreSQL database (replaces containerized DB in production)
- **Secrets Manager**: Secure storage for application and database credentials
- **Security Groups**: ALB-to-ECS and database access configuration
- **IAM Roles**: ECS task execution and application permissions

### Environment Management
- **Workspaces**: dev, stage, prod environments with isolated resources
- **State Management**: S3 backend with DynamoDB locking
- **Configuration**: Environment-specific .tfvars files

### Setup Scripts
```bash
# Initial environment setup
./scripts/setup.sh                             # Run initial setup script
node scripts/startup.js                        # Run application startup script
```