// Database migrations for multi-tenant schema
import { query } from './db';

// Migration tracking table
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

// Migration definitions
const migrations = [
  {
    name: '001_create_extensions',
    sql: `
      -- Create extension for UUID generation
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `,
  },
  {
    name: '002_create_enums',
    sql: `
      -- Create enum types
      DO $$ BEGIN
        CREATE TYPE corner_role AS ENUM ('admin', 'participant');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `,
  },
  {
    name: '003_create_corners_table',
    sql: `
      -- 1. CORNERS TABLE - Represents each couple's private space
      CREATE TABLE IF NOT EXISTS corners (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          
          -- Unique identifiers for sharing
          slug VARCHAR(100) UNIQUE NOT NULL, -- Human-readable identifier (e.g., 'alex-and-sarah')
          invite_code VARCHAR(32) UNIQUE NOT NULL, -- Secure invite code
          
          -- Privacy settings
          is_public BOOLEAN DEFAULT false,
          share_password VARCHAR(255), -- Optional password for shared access (hashed)
          
          -- Firebase Auth admin user
          admin_firebase_uid VARCHAR(255) NOT NULL, -- Firebase UID of the corner creator
          
          -- Metadata
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraints
          CONSTRAINT corners_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
          CONSTRAINT corners_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
      );
    `,
  },
  {
    name: '004_create_corner_users_table',
    sql: `
      -- 2. CORNER_USERS TABLE - Many-to-many relationship between Firebase users and corners
      CREATE TABLE IF NOT EXISTS corner_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
          firebase_uid VARCHAR(255) NOT NULL, -- Firebase Auth UID
          
          -- User details (cached from Firebase for performance)
          display_name VARCHAR(255),
          email VARCHAR(255),
          avatar_url TEXT,
          
          -- Role and permissions
          role corner_role NOT NULL DEFAULT 'participant',
          
          -- Specific permissions (JSON for flexibility)
          permissions JSONB DEFAULT '{"upload": false, "edit": false, "manage": false}'::jsonb,
          
          -- Metadata
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraints
          UNIQUE(corner_id, firebase_uid),
          CONSTRAINT corner_users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$' OR email IS NULL)
      );
    `,
  },
  {
    name: '005_create_corner_invites_table',
    sql: `
      -- 3. CORNER_INVITES TABLE - Invitation system
      CREATE TABLE IF NOT EXISTS corner_invites (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          invite_token VARCHAR(64) UNIQUE NOT NULL, -- Secure random token
          
          -- Invitation details
          role corner_role NOT NULL DEFAULT 'participant',
          permissions JSONB DEFAULT '{"upload": false, "edit": false, "manage": false}'::jsonb,
          
          -- Status and metadata
          status invite_status NOT NULL DEFAULT 'pending',
          invited_by_firebase_uid VARCHAR(255) NOT NULL, -- Who sent the invite
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- 7-day expiry
          accepted_at TIMESTAMP WITH TIME ZONE,
          
          -- Constraints
          CONSTRAINT corner_invites_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
          CONSTRAINT corner_invites_accepted_at_check CHECK (
              (status = 'accepted' AND accepted_at IS NOT NULL) OR 
              (status != 'accepted' AND accepted_at IS NULL)
          )
      );
    `,
  },
  {
    name: '006_add_corner_id_to_existing_tables',
    sql: `
      -- Add corner_id to existing tables for multi-tenant support
      
      -- Add corner_id to media table
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'media' AND column_name = 'corner_id') THEN
              ALTER TABLE media ADD COLUMN corner_id UUID;
              -- Create a default corner for existing data
              INSERT INTO corners (name, slug, invite_code, admin_firebase_uid)
              VALUES ('My Corner', 'my-corner', 'default-invite-code', 'legacy-admin')
              ON CONFLICT (slug) DO NOTHING;
              
              -- Update existing media to belong to the default corner
              UPDATE media SET corner_id = (SELECT id FROM corners WHERE slug = 'my-corner' LIMIT 1)
              WHERE corner_id IS NULL;
              
              -- Make corner_id required and add foreign key
              ALTER TABLE media ALTER COLUMN corner_id SET NOT NULL;
              ALTER TABLE media ADD CONSTRAINT media_corner_id_fkey FOREIGN KEY (corner_id) REFERENCES corners(id) ON DELETE CASCADE;
          END IF;
      END $$;
      
      -- Add corner_id to memory_groups table
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'memory_groups' AND column_name = 'corner_id') THEN
              ALTER TABLE memory_groups ADD COLUMN corner_id UUID;
              
              -- Update existing memory groups to belong to the default corner
              UPDATE memory_groups SET corner_id = (SELECT id FROM corners WHERE slug = 'my-corner' LIMIT 1)
              WHERE corner_id IS NULL;
              
              -- Make corner_id required and add foreign key
              ALTER TABLE memory_groups ALTER COLUMN corner_id SET NOT NULL;
              ALTER TABLE memory_groups ADD CONSTRAINT memory_groups_corner_id_fkey FOREIGN KEY (corner_id) REFERENCES corners(id) ON DELETE CASCADE;
          END IF;
      END $$;
    `,
  },
  {
    name: '007_create_additional_tables',
    sql: `
      -- 4. SHARED_ACCESS_TOKENS TABLE - Temporary access tokens
      CREATE TABLE IF NOT EXISTS shared_access_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
          token VARCHAR(64) UNIQUE NOT NULL,
          permissions JSONB DEFAULT '{}'::jsonb,
          max_uses INTEGER DEFAULT 1,
          current_uses INTEGER DEFAULT 0,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_by_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          CONSTRAINT shared_access_tokens_uses_check CHECK (current_uses <= max_uses)
      );
      
      -- 5. CORNER_ANALYTICS TABLE - Usage tracking
      CREATE TABLE IF NOT EXISTS corner_analytics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          firebase_uid VARCHAR(255), -- Optional user identification
          metadata JSONB DEFAULT '{}'::jsonb,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
  {
    name: '008_create_indexes',
    sql: `
      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_corner_users_corner_id ON corner_users(corner_id);
      CREATE INDEX IF NOT EXISTS idx_corner_users_firebase_uid ON corner_users(firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_corner_invites_corner_id ON corner_invites(corner_id);
      CREATE INDEX IF NOT EXISTS idx_corner_invites_token ON corner_invites(invite_token);
      CREATE INDEX IF NOT EXISTS idx_corner_invites_email ON corner_invites(email);
      CREATE INDEX IF NOT EXISTS idx_corner_invites_status ON corner_invites(status);
      CREATE INDEX IF NOT EXISTS idx_media_corner_id ON media(corner_id);
      CREATE INDEX IF NOT EXISTS idx_memory_groups_corner_id ON memory_groups(corner_id);
      CREATE INDEX IF NOT EXISTS idx_shared_access_tokens_corner_id ON shared_access_tokens(corner_id);
      CREATE INDEX IF NOT EXISTS idx_shared_access_tokens_token ON shared_access_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_corner_analytics_corner_id ON corner_analytics(corner_id);
      CREATE INDEX IF NOT EXISTS idx_corner_analytics_event_type ON corner_analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_corners_slug ON corners(slug);
      CREATE INDEX IF NOT EXISTS idx_corners_invite_code ON corners(invite_code);
      CREATE INDEX IF NOT EXISTS idx_corners_admin_firebase_uid ON corners(admin_firebase_uid);
    `,
  },
  {
    name: '009_add_legacy_permission_columns',
    sql: `
      -- Add backward-compatible permission columns to corner_users
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'corner_users' AND column_name = 'can_upload') THEN
              ALTER TABLE corner_users 
              ADD COLUMN can_upload BOOLEAN DEFAULT false,
              ADD COLUMN can_edit_others_media BOOLEAN DEFAULT false,
              ADD COLUMN can_manage_corner BOOLEAN DEFAULT false;
          END IF;
      END $$;
      
      -- Add backward-compatible permission columns to corner_invites
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'corner_invites' AND column_name = 'can_upload') THEN
              ALTER TABLE corner_invites 
              ADD COLUMN can_upload BOOLEAN DEFAULT false,
              ADD COLUMN can_edit_others_media BOOLEAN DEFAULT false;
          END IF;
      END $$;
      
      -- Update existing records to sync with permissions JSONB
      UPDATE corner_users 
      SET 
        can_upload = (permissions->>'upload')::boolean,
        can_edit_others_media = (permissions->>'edit')::boolean,
        can_manage_corner = (permissions->>'manage')::boolean
      WHERE permissions IS NOT NULL;
      
      UPDATE corner_invites 
      SET 
        can_upload = (permissions->>'upload')::boolean,
        can_edit_others_media = (permissions->>'edit')::boolean
      WHERE permissions IS NOT NULL;
    `,
  },
  {
    name: '010_fix_memory_groups_schema',
    sql: `
      -- Add missing columns to memory_groups table
      DO $$ 
      BEGIN 
          -- Add created_by_firebase_uid if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'memory_groups' AND column_name = 'created_by_firebase_uid') THEN
              ALTER TABLE memory_groups ADD COLUMN created_by_firebase_uid VARCHAR(255);
          END IF;
          
          -- Add advanced locking columns
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'memory_groups' AND column_name = 'lock_visibility') THEN
              ALTER TABLE memory_groups 
              ADD COLUMN lock_visibility VARCHAR(20) DEFAULT 'private',
              ADD COLUMN show_date_hint BOOLEAN DEFAULT false,
              ADD COLUMN show_image_preview BOOLEAN DEFAULT false,
              ADD COLUMN blur_percentage INTEGER DEFAULT 80,
              ADD COLUMN unlock_hint TEXT,
              ADD COLUMN unlock_task TEXT,
              ADD COLUMN unlock_type VARCHAR(20) DEFAULT 'scheduled',
              ADD COLUMN task_completed BOOLEAN DEFAULT false,
              ADD COLUMN show_title BOOLEAN DEFAULT false,
              ADD COLUMN show_description BOOLEAN DEFAULT false,
              ADD COLUMN show_media_count BOOLEAN DEFAULT false,
              ADD COLUMN show_creation_date BOOLEAN DEFAULT false;
          END IF;
      END $$;
      
      -- Update existing records with default values for created_by_firebase_uid
      UPDATE memory_groups 
      SET created_by_firebase_uid = (SELECT admin_firebase_uid FROM corners WHERE corners.id = memory_groups.corner_id LIMIT 1)
      WHERE created_by_firebase_uid IS NULL;
    `,
  },
  {
    name: '011_fix_orphaned_media_and_add_validation',
    sql: `
      -- Fix any orphaned media records that don't have proper corner_id
      
      -- Step 1: Fix media that have memory_group_id but wrong/missing corner_id
      UPDATE media 
      SET corner_id = mg.corner_id
      FROM memory_groups mg
      WHERE media.memory_group_id = mg.id 
        AND (media.corner_id IS NULL OR media.corner_id != mg.corner_id);
      
      -- Step 2: Create default memory groups for any media without memory_group_id
      -- but with valid corner_id
      DO $$ 
      DECLARE
          corner_record RECORD;
          default_group_id UUID;
      BEGIN
          -- For each corner that has standalone media
          FOR corner_record IN 
              SELECT 
                  m.corner_id,
                  COUNT(*) as media_count
              FROM media m
              WHERE m.memory_group_id IS NULL 
                AND m.corner_id IS NOT NULL
              GROUP BY m.corner_id
          LOOP
              -- Create a default memory group for this corner
              INSERT INTO memory_groups (
                  corner_id, 
                  title, 
                  description, 
                  is_locked, 
                  created_by_firebase_uid
              ) 
              SELECT 
                  corner_record.corner_id, 
                  'Legacy Uploads', 
                  'Media uploaded before memory groups were required', 
                  false,
                  c.admin_firebase_uid
              FROM corners c 
              WHERE c.id = corner_record.corner_id
              RETURNING id INTO default_group_id;
              
              -- Assign standalone media to this memory group
              UPDATE media 
              SET memory_group_id = default_group_id
              WHERE corner_id = corner_record.corner_id 
                AND memory_group_id IS NULL;
          END LOOP;
      END $$;
      
      -- Step 3: Add uploaded_by_firebase_uid column if missing
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'media' AND column_name = 'uploaded_by_firebase_uid') THEN
              ALTER TABLE media ADD COLUMN uploaded_by_firebase_uid VARCHAR(255);
              
              -- Set default uploader to corner admin for existing media
              UPDATE media 
              SET uploaded_by_firebase_uid = (
                  SELECT admin_firebase_uid 
                  FROM corners 
                  WHERE corners.id = media.corner_id 
                  LIMIT 1
              )
              WHERE uploaded_by_firebase_uid IS NULL;
          END IF;
      END $$;
      
      -- Step 4: Ensure all media has memory_group_id (require it)
      -- First check if there are any remaining orphans
      DO $$
      DECLARE
          orphan_count INTEGER;
      BEGIN
          SELECT COUNT(*) INTO orphan_count 
          FROM media 
          WHERE memory_group_id IS NULL;
          
          IF orphan_count > 0 THEN
              RAISE NOTICE 'Found % orphaned media records without memory groups', orphan_count;
              -- This would require manual intervention if it happens
          END IF;
      END $$;
      
      -- Step 5: Add database constraints to prevent future orphans
      -- Add check constraint to ensure corner_id consistency
      ALTER TABLE media 
      ADD CONSTRAINT media_corner_consistency_check 
      CHECK (
          corner_id IS NOT NULL AND 
          (memory_group_id IS NULL OR 
           EXISTS (SELECT 1 FROM memory_groups mg WHERE mg.id = memory_group_id AND mg.corner_id = media.corner_id))
      );
    `,
  },
];

// Check if migration has been run
async function isMigrationExecuted(migrationName: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migrationName]
    );
    return result.rows.length > 0;
  } catch (error) {
    // If migrations table doesn't exist, migration hasn't been run
    return false;
  }
}

// Record migration as executed
async function recordMigration(migrationName: string): Promise<void> {
  await query(
    'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [migrationName]
  );
}

// Run a single migration
async function runMigration(migration: { name: string; sql: string }): Promise<void> {
  console.log(`Running migration: ${migration.name}`);
  
  try {
    // Execute migration SQL
    await query(migration.sql);
    
    // Record migration as completed
    await recordMigration(migration.name);
    
    console.log(`✓ Migration ${migration.name} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migration.name} failed:`, error);
    throw error;
  }
}

// Run all pending migrations
export async function runPendingMigrations(): Promise<void> {
  console.log('Checking for pending database migrations...');
  
  try {
    // Ensure migrations table exists
    await query(createMigrationsTable);
    
    // Run pending migrations
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.name);
      if (!isExecuted) {
        await runMigration(migration);
      } else {
        console.log(`- Migration ${migration.name} already executed`);
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Get migration status
export async function getMigrationStatus(): Promise<Array<{ name: string; executed: boolean; executed_at?: Date }>> {
  await query(createMigrationsTable);
  
  const executedMigrations = await query('SELECT name, executed_at FROM migrations ORDER BY executed_at');
  const executedMap = new Map(
    executedMigrations.rows.map((row: any) => [row.name, { executed: true, executed_at: row.executed_at }])
  );
  
  return migrations.map(migration => {
    const executionInfo = executedMap.get(migration.name) as { executed: boolean; executed_at: Date } | undefined;
    return {
      name: migration.name,
      executed: executedMap.has(migration.name),
      executed_at: executionInfo?.executed_at,
    };
  });
}