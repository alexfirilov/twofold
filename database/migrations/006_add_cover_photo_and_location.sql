-- Migration 006: Add cover photo and location origin fields to lockets table
-- These fields support the Locket Setup Wizard feature

-- Add cover photo URL field
ALTER TABLE lockets
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add location origin field (where the relationship started)
ALTER TABLE lockets
ADD COLUMN IF NOT EXISTS location_origin TEXT;

-- Add comments for documentation
COMMENT ON COLUMN lockets.cover_photo_url IS 'URL to the cover photo for this locket, displayed as hero on Dashboard';
COMMENT ON COLUMN lockets.location_origin IS 'Where the couple met or where their relationship began';
