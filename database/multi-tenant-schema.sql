-- Multi-tenant database schema for Twofold
-- This file contains the schema design for Firebase Auth integration
-- Uses "locket" naming (the final naming convention)

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE locket_role AS ENUM ('admin', 'participant');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- 1. LOCKETS TABLE - Represents each couple's private space
CREATE TABLE lockets (
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
    admin_firebase_uid VARCHAR(255) NOT NULL, -- Firebase UID of the locket creator

    -- Relationship metadata (Twofold features)
    anniversary_date DATE, -- When the relationship started
    cover_photo_url TEXT, -- URL to cover photo displayed on dashboard
    location_origin TEXT, -- Where the couple met
    next_countdown_event_name VARCHAR(255), -- Custom countdown event name
    next_countdown_date DATE, -- Custom countdown target date

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT lockets_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT lockets_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- 2. LOCKET_USERS TABLE - Many-to-many relationship between Firebase users and lockets
CREATE TABLE locket_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
    firebase_uid VARCHAR(255) NOT NULL, -- Firebase Auth UID

    -- User details (cached from Firebase for performance)
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,

    -- Role and permissions
    role locket_role NOT NULL DEFAULT 'participant',

    -- Access settings
    can_upload BOOLEAN DEFAULT true,
    can_edit_others_media BOOLEAN DEFAULT false,
    can_manage_locket BOOLEAN DEFAULT false,

    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(locket_id, firebase_uid),
    CONSTRAINT locket_users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- 3. LOCKET_INVITES TABLE - Track pending invitations
CREATE TABLE locket_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Invite details
    email VARCHAR(255) NOT NULL,
    invite_token VARCHAR(64) UNIQUE NOT NULL,
    message TEXT,

    -- Permissions for invited user
    role locket_role NOT NULL DEFAULT 'participant',
    can_upload BOOLEAN DEFAULT true,
    can_edit_others_media BOOLEAN DEFAULT false,

    -- Status tracking
    status invite_status NOT NULL DEFAULT 'pending',
    invited_by_firebase_uid VARCHAR(255) NOT NULL,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT locket_invites_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT locket_invites_expires_future CHECK (expires_at > created_at)
);

-- 4. MEMORY_GROUPS TABLE - Groups of related memories (albums, trips, events)
CREATE TABLE IF NOT EXISTS memory_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255),
    description TEXT,
    date_taken DATE,

    -- Features
    is_milestone BOOLEAN DEFAULT false,
    cover_media_id UUID, -- Reference to the cover image (set after media is added)

    -- Creator tracking (either partner can upload)
    created_by_firebase_uid VARCHAR(255) NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MEDIA TABLE - Individual media items (photos, videos)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
    memory_group_id UUID REFERENCES memory_groups(id) ON DELETE SET NULL,

    -- File info
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    storage_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,

    -- Image/video dimensions
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- Video duration in seconds

    -- Content metadata
    title VARCHAR(255),
    note TEXT,
    date_taken TIMESTAMP WITH TIME ZONE,

    -- Location data
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    place_name VARCHAR(255),

    -- Display order
    sort_order INTEGER DEFAULT 0,

    -- Creator tracking
    uploaded_by_firebase_uid VARCHAR(255) NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. BUCKET_LIST_ITEMS TABLE - Shared bucket list/goals
CREATE TABLE IF NOT EXISTS bucket_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other', -- 'travel', 'food', 'activity', 'other'

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Creator tracking
    created_by_firebase_uid VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. LOCKET_ANALYTICS TABLE - Track usage and sharing
CREATE TABLE locket_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Event tracking
    event_type VARCHAR(50) NOT NULL, -- 'view', 'upload', 'share', 'invite'
    firebase_uid VARCHAR(255), -- NULL for anonymous/guest views

    -- Additional data
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately (PostgreSQL doesn't support inline INDEX in CREATE TABLE)
CREATE INDEX IF NOT EXISTS idx_locket_analytics_locket_event ON locket_analytics(locket_id, event_type);
CREATE INDEX IF NOT EXISTS idx_locket_analytics_date ON locket_analytics(created_at);

-- 8. SHARED_ACCESS_TOKENS TABLE - For temporary guest access
CREATE TABLE shared_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Token details
    token VARCHAR(64) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{"can_view": true, "can_download": false}',

    -- Access tracking
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Created by
    created_by_firebase_uid VARCHAR(255) NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT shared_tokens_uses_positive CHECK (current_uses >= 0),
    CONSTRAINT shared_tokens_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0)
);

-- 9. CREATE INDEXES FOR PERFORMANCE

-- Lockets indexes
CREATE INDEX idx_lockets_admin_uid ON lockets(admin_firebase_uid);
CREATE INDEX idx_lockets_slug ON lockets(slug);
CREATE INDEX idx_lockets_invite_code ON lockets(invite_code);

-- Locket users indexes
CREATE INDEX idx_locket_users_firebase_uid ON locket_users(firebase_uid);
CREATE INDEX idx_locket_users_locket_role ON locket_users(locket_id, role);

-- Locket invites indexes
CREATE INDEX idx_locket_invites_token ON locket_invites(invite_token);
CREATE INDEX idx_locket_invites_email ON locket_invites(email);
CREATE INDEX idx_locket_invites_status ON locket_invites(status);

-- Memory groups indexes
CREATE INDEX IF NOT EXISTS idx_memory_groups_locket ON memory_groups(locket_id);
CREATE INDEX IF NOT EXISTS idx_memory_groups_creator ON memory_groups(created_by_firebase_uid);
CREATE INDEX IF NOT EXISTS idx_memory_groups_milestone ON memory_groups(is_milestone) WHERE is_milestone = true;
CREATE INDEX IF NOT EXISTS idx_memory_groups_date ON memory_groups(date_taken);

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_media_locket ON media(locket_id);
CREATE INDEX IF NOT EXISTS idx_media_uploader ON media(uploaded_by_firebase_uid);
CREATE INDEX IF NOT EXISTS idx_media_group ON media(memory_group_id);
CREATE INDEX IF NOT EXISTS idx_media_location ON media(latitude, longitude) WHERE latitude IS NOT NULL;

-- Bucket list indexes
CREATE INDEX IF NOT EXISTS idx_bucket_list_locket ON bucket_list_items(locket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_list_status ON bucket_list_items(status);

-- Shared tokens indexes
CREATE INDEX idx_shared_tokens_locket ON shared_access_tokens(locket_id);
CREATE INDEX idx_shared_tokens_token ON shared_access_tokens(token);

-- 10. CREATE FUNCTIONS FOR COMMON OPERATIONS

-- Function to generate unique locket slug
CREATE OR REPLACE FUNCTION generate_locket_slug(locket_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from locket name
    base_slug := lower(regexp_replace(locket_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Ensure it's not empty
    IF base_slug = '' THEN
        base_slug := 'locket';
    END IF;

    -- Check for uniqueness and add counter if needed
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM lockets WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    invite_code TEXT;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        invite_code := upper(substring(md5(random()::text) from 1 for 8));

        -- Check if it's unique
        IF NOT EXISTS (SELECT 1 FROM lockets WHERE invite_code = invite_code) THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN invite_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. CREATE TRIGGERS

-- Auto-update updated_at for lockets
CREATE TRIGGER trigger_lockets_updated_at
    BEFORE UPDATE ON lockets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for memory_groups
DROP TRIGGER IF EXISTS trigger_memory_groups_updated_at ON memory_groups;
CREATE TRIGGER trigger_memory_groups_updated_at
    BEFORE UPDATE ON memory_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for media
DROP TRIGGER IF EXISTS trigger_media_updated_at ON media;
CREATE TRIGGER trigger_media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for bucket_list_items
DROP TRIGGER IF EXISTS trigger_bucket_list_updated_at ON bucket_list_items;
CREATE TRIGGER trigger_bucket_list_updated_at
    BEFORE UPDATE ON bucket_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. INSERT DEFAULT DATA

-- Note: We won't insert any default data since this will be a fresh multi-tenant setup
-- Existing data will be migrated separately

-- 13. SECURITY POLICIES (Row Level Security)

-- Enable RLS on all tenant-aware tables
ALTER TABLE lockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE locket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locket_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE locket_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

-- RLS policies will be created in a separate file for Firebase integration
-- These will use Firebase JWT claims to ensure users can only access their lockets

COMMENT ON SCHEMA public IS 'Multi-tenant Twofold database with Firebase Auth integration';
