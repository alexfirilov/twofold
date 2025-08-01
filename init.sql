-- Create database if it doesn't exist
-- Note: This is handled by POSTGRES_DB environment variable in docker-compose

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create memory_groups table for grouping related media items
CREATE TABLE IF NOT EXISTS memory_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    description TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    unlock_date TIMESTAMP WITH TIME ZONE,
    cover_media_id UUID, -- References media.id for the cover image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media table for storing photo/video metadata
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_group_id UUID REFERENCES memory_groups(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    s3_key VARCHAR(1000) NOT NULL UNIQUE,
    s3_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- image/jpeg, image/png, video/mp4, etc.
    file_size BIGINT NOT NULL, -- Size in bytes
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration INTEGER, -- For videos (in seconds)
    title VARCHAR(500),
    note TEXT, -- Rich text content for the memory note
    date_taken TIMESTAMP WITH TIME ZONE, -- When the photo/video was taken
    sort_order INTEGER DEFAULT 0, -- Order within memory group
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for memory_groups table
CREATE INDEX IF NOT EXISTS idx_memory_groups_created_at ON memory_groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_groups_locked ON memory_groups(is_locked);
CREATE INDEX IF NOT EXISTS idx_memory_groups_unlock_date ON memory_groups(unlock_date);

-- Create indexes for media table
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_date_taken ON media(date_taken DESC);
CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type);
CREATE INDEX IF NOT EXISTS idx_media_memory_group_id ON media(memory_group_id);
CREATE INDEX IF NOT EXISTS idx_media_sort_order ON media(memory_group_id, sort_order);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to both tables
CREATE TRIGGER update_memory_groups_updated_at 
    BEFORE UPDATE ON memory_groups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at 
    BEFORE UPDATE ON media 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development (optional)
-- This can be removed for production
INSERT INTO memory_groups (id, title, description, is_locked) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Our First Date 💕', 'The day everything changed. Our first romantic evening together.', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO media (
    memory_group_id,
    filename, 
    original_name, 
    s3_key, 
    s3_url, 
    file_type, 
    file_size, 
    width, 
    height, 
    title, 
    note,
    date_taken,
    sort_order
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'sample-romantic-photo.jpg',
    'Our First Date.jpg',
    'media/sample-romantic-photo.jpg',
    'https://your-bucket.s3.amazonaws.com/media/sample-romantic-photo.jpg',
    'image/jpeg',
    1024000,
    1920,
    1080,
    'Our First Date 💕',
    '<p>This was the day everything changed. I remember how nervous I was, but you made everything feel so natural and beautiful. The way you smiled when you saw me... I knew right then that this was something special. 💖</p>',
    '2024-02-14 19:30:00+00',
    0
) ON CONFLICT (s3_key) DO NOTHING;

-- Clean up expired sessions (can be run periodically)
-- DELETE FROM sessions WHERE expires_at < NOW();