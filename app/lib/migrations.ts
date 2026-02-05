// Database migrations for Twofold multi-tenant schema
// All migrations use "locket" naming convention (not "corner")
import { query } from './db';

// Migration tracking table
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

// Migration definitions - all use locket naming
const migrations = [
  {
    name: '100_ensure_extensions',
    sql: `
      -- Create extension for UUID generation
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `,
  },
  {
    name: '101_ensure_locket_role_enum',
    sql: `
      -- Create locket_role enum if not exists
      DO $$ BEGIN
        CREATE TYPE locket_role AS ENUM ('admin', 'participant');
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
    name: '102_ensure_base_tables',
    sql: `
      -- Ensure lockets table exists
      CREATE TABLE IF NOT EXISTS lockets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          slug VARCHAR(100) UNIQUE NOT NULL,
          invite_code VARCHAR(32) UNIQUE NOT NULL,
          is_public BOOLEAN DEFAULT false,
          share_password VARCHAR(255),
          admin_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure locket_users table exists
      CREATE TABLE IF NOT EXISTS locket_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          firebase_uid VARCHAR(255) NOT NULL,
          display_name VARCHAR(255),
          email VARCHAR(255),
          avatar_url TEXT,
          role locket_role NOT NULL DEFAULT 'participant',
          can_upload BOOLEAN DEFAULT true,
          can_edit_others_media BOOLEAN DEFAULT false,
          can_manage_locket BOOLEAN DEFAULT false,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(locket_id, firebase_uid)
      );

      -- Ensure locket_invites table exists
      CREATE TABLE IF NOT EXISTS locket_invites (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          invite_token VARCHAR(64) UNIQUE NOT NULL,
          message TEXT,
          role locket_role NOT NULL DEFAULT 'participant',
          can_upload BOOLEAN DEFAULT true,
          can_edit_others_media BOOLEAN DEFAULT false,
          status invite_status NOT NULL DEFAULT 'pending',
          invited_by_firebase_uid VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          accepted_at TIMESTAMP WITH TIME ZONE
      );

      -- Ensure memory_groups table exists with locket_id
      CREATE TABLE IF NOT EXISTS memory_groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          title VARCHAR(255),
          description TEXT,
          date_taken DATE,
          is_milestone BOOLEAN DEFAULT false,
          cover_media_id UUID,
          created_by_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure media table exists with locket_id
      CREATE TABLE IF NOT EXISTS media (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          memory_group_id UUID REFERENCES memory_groups(id) ON DELETE SET NULL,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          storage_key VARCHAR(512) NOT NULL,
          storage_url TEXT NOT NULL,
          file_type VARCHAR(100),
          file_size BIGINT,
          width INTEGER,
          height INTEGER,
          duration INTEGER,
          title VARCHAR(255),
          note TEXT,
          date_taken TIMESTAMP WITH TIME ZONE,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          place_name VARCHAR(255),
          sort_order INTEGER DEFAULT 0,
          uploaded_by_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure bucket_list_items table exists
      CREATE TABLE IF NOT EXISTS bucket_list_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50) DEFAULT 'other',
          status VARCHAR(20) DEFAULT 'active',
          completed_at TIMESTAMP WITH TIME ZONE,
          created_by_firebase_uid VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure locket_analytics table exists
      CREATE TABLE IF NOT EXISTS locket_analytics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          firebase_uid VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure shared_access_tokens table exists
      CREATE TABLE IF NOT EXISTS shared_access_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          token VARCHAR(64) UNIQUE NOT NULL,
          permissions JSONB DEFAULT '{"can_view": true, "can_download": false}',
          max_uses INTEGER DEFAULT NULL,
          current_uses INTEGER DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_by_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Ensure sessions table exists
      CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
  {
    name: '103_create_indexes',
    sql: `
      -- Indexes for lockets
      CREATE INDEX IF NOT EXISTS idx_lockets_admin_uid ON lockets(admin_firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_lockets_slug ON lockets(slug);
      CREATE INDEX IF NOT EXISTS idx_lockets_invite_code ON lockets(invite_code);

      -- Indexes for locket_users
      CREATE INDEX IF NOT EXISTS idx_locket_users_firebase_uid ON locket_users(firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_locket_users_locket_role ON locket_users(locket_id, role);

      -- Indexes for locket_invites
      CREATE INDEX IF NOT EXISTS idx_locket_invites_token ON locket_invites(invite_token);
      CREATE INDEX IF NOT EXISTS idx_locket_invites_email ON locket_invites(email);
      CREATE INDEX IF NOT EXISTS idx_locket_invites_status ON locket_invites(status);

      -- Indexes for memory_groups
      CREATE INDEX IF NOT EXISTS idx_memory_groups_locket ON memory_groups(locket_id);
      CREATE INDEX IF NOT EXISTS idx_memory_groups_creator ON memory_groups(created_by_firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_memory_groups_milestone ON memory_groups(is_milestone) WHERE is_milestone = true;
      CREATE INDEX IF NOT EXISTS idx_memory_groups_date ON memory_groups(date_taken);

      -- Indexes for media
      CREATE INDEX IF NOT EXISTS idx_media_locket ON media(locket_id);
      CREATE INDEX IF NOT EXISTS idx_media_uploader ON media(uploaded_by_firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_media_group ON media(memory_group_id);
      CREATE INDEX IF NOT EXISTS idx_media_location ON media(latitude, longitude) WHERE latitude IS NOT NULL;

      -- Indexes for bucket_list_items
      CREATE INDEX IF NOT EXISTS idx_bucket_list_locket ON bucket_list_items(locket_id);
      CREATE INDEX IF NOT EXISTS idx_bucket_list_status ON bucket_list_items(status);

      -- Indexes for locket_analytics
      CREATE INDEX IF NOT EXISTS idx_locket_analytics_locket_event ON locket_analytics(locket_id, event_type);
      CREATE INDEX IF NOT EXISTS idx_locket_analytics_date ON locket_analytics(created_at);

      -- Indexes for shared_access_tokens
      CREATE INDEX IF NOT EXISTS idx_shared_tokens_locket ON shared_access_tokens(locket_id);
      CREATE INDEX IF NOT EXISTS idx_shared_tokens_token ON shared_access_tokens(token);
    `,
  },
  {
    name: '104_create_triggers',
    sql: `
      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Auto-update triggers
      DROP TRIGGER IF EXISTS trigger_lockets_updated_at ON lockets;
      CREATE TRIGGER trigger_lockets_updated_at
          BEFORE UPDATE ON lockets
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_memory_groups_updated_at ON memory_groups;
      CREATE TRIGGER trigger_memory_groups_updated_at
          BEFORE UPDATE ON memory_groups
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_media_updated_at ON media;
      CREATE TRIGGER trigger_media_updated_at
          BEFORE UPDATE ON media
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS trigger_bucket_list_updated_at ON bucket_list_items;
      CREATE TRIGGER trigger_bucket_list_updated_at
          BEFORE UPDATE ON bucket_list_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `,
  },
  {
    name: '105_cleanup_legacy_corner_objects',
    sql: `
      -- ================================================================
      -- Cleanup any legacy "corner" naming that might exist
      -- This ensures clean state regardless of previous migrations
      -- ================================================================

      -- Drop corner_id columns if they exist (shouldn't be there)
      ALTER TABLE media DROP COLUMN IF EXISTS corner_id;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS corner_id;

      -- Drop legacy corner_* tables
      DROP TABLE IF EXISTS corner_analytics CASCADE;
      DROP TABLE IF EXISTS corner_invites CASCADE;
      DROP TABLE IF EXISTS corner_users CASCADE;
      DROP TABLE IF EXISTS corners CASCADE;

      -- Drop legacy corner_role enum
      DROP TYPE IF EXISTS corner_role CASCADE;

      -- Remove old locking features that are no longer used
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS is_locked;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS unlock_date;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS lock_visibility;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_date_hint;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_image_preview;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS blur_percentage;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS unlock_hint;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS unlock_task;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS unlock_type;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS task_completed;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_title;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_description;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_media_count;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS show_creation_date;
      ALTER TABLE memory_groups DROP COLUMN IF EXISTS mood;

      -- Drop unused mood enum
      DROP TYPE IF EXISTS memory_mood CASCADE;
    `,
  },
  {
    name: '106_add_comments_table',
    sql: `
      -- Create comment_type enum
      DO $$ BEGIN
        CREATE TYPE comment_type AS ENUM ('comment', 'activity');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Create comments table
      CREATE TABLE IF NOT EXISTS memory_comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          memory_group_id UUID NOT NULL REFERENCES memory_groups(id) ON DELETE CASCADE,
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          comment_type comment_type NOT NULL DEFAULT 'comment',
          activity_action VARCHAR(50),
          author_firebase_uid VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_memory_comments_group ON memory_comments(memory_group_id);
      CREATE INDEX IF NOT EXISTS idx_memory_comments_locket ON memory_comments(locket_id);
      CREATE INDEX IF NOT EXISTS idx_memory_comments_author ON memory_comments(author_firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_memory_comments_created ON memory_comments(created_at);

      -- Trigger for updated_at
      DROP TRIGGER IF EXISTS trigger_memory_comments_updated_at ON memory_comments;
      CREATE TRIGGER trigger_memory_comments_updated_at
          BEFORE UPDATE ON memory_comments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      -- Enable RLS
      ALTER TABLE memory_comments ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: '107_add_likes_table',
    sql: `
      -- Create likes table for memories
      CREATE TABLE IF NOT EXISTS memory_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          memory_group_id UUID NOT NULL REFERENCES memory_groups(id) ON DELETE CASCADE,
          locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
          user_firebase_uid VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(memory_group_id, user_firebase_uid)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_memory_likes_group ON memory_likes(memory_group_id);
      CREATE INDEX IF NOT EXISTS idx_memory_likes_locket ON memory_likes(locket_id);
      CREATE INDEX IF NOT EXISTS idx_memory_likes_user ON memory_likes(user_firebase_uid);

      -- Enable RLS
      ALTER TABLE memory_likes ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: '108_add_locket_details',
    sql: `
      -- Add cover photo and location origin fields to lockets table
      ALTER TABLE lockets
      ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

      ALTER TABLE lockets
      ADD COLUMN IF NOT EXISTS location_origin TEXT;

      COMMENT ON COLUMN lockets.cover_photo_url IS 'URL to the cover photo for this locket, displayed as hero on Dashboard';
      COMMENT ON COLUMN lockets.location_origin IS 'Where the couple met or where their relationship began';
    `,
  },
  {
    name: '109_immersive_home',
    sql: `
      -- 1. Multiple cover photos table
      CREATE TABLE IF NOT EXISTS locket_covers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        storage_key TEXT,
        sort_order INTEGER DEFAULT 0,
        added_by_firebase_uid VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_locket_covers_locket ON locket_covers(locket_id);
      CREATE INDEX IF NOT EXISTS idx_locket_covers_order ON locket_covers(locket_id, sort_order);

      -- Enable RLS
      ALTER TABLE locket_covers ENABLE ROW LEVEL SECURITY;

      -- RLS Policies for locket_covers
      DROP POLICY IF EXISTS locket_covers_select_policy ON locket_covers;
      CREATE POLICY locket_covers_select_policy ON locket_covers
          FOR SELECT USING (true);

      DROP POLICY IF EXISTS locket_covers_insert_policy ON locket_covers;
      CREATE POLICY locket_covers_insert_policy ON locket_covers
          FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS locket_covers_update_policy ON locket_covers;
      CREATE POLICY locket_covers_update_policy ON locket_covers
          FOR UPDATE USING (true);

      DROP POLICY IF EXISTS locket_covers_delete_policy ON locket_covers;
      CREATE POLICY locket_covers_delete_policy ON locket_covers
          FOR DELETE USING (true);

      -- 2. Pinned memory for "Fridge" feature
      ALTER TABLE lockets
      ADD COLUMN IF NOT EXISTS pinned_memory_id UUID REFERENCES memory_groups(id) ON DELETE SET NULL;

      COMMENT ON COLUMN lockets.pinned_memory_id IS 'Currently pinned memory shown in the Fridge widget';
    `,
  },
  {
    name: '110_add_anniversary_fields',
    sql: `
      -- Add anniversary and countdown fields to lockets table
      ALTER TABLE lockets
      ADD COLUMN IF NOT EXISTS anniversary_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS next_countdown_event_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS next_countdown_date TIMESTAMP WITH TIME ZONE;

      COMMENT ON COLUMN lockets.anniversary_date IS 'The relationship anniversary date';
      COMMENT ON COLUMN lockets.next_countdown_event_name IS 'Name of the next event to count down to';
      COMMENT ON COLUMN lockets.next_countdown_date IS 'Date/time of the next countdown event';
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
