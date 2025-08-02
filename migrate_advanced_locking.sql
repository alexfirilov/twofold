-- Migration: Add advanced locking features
-- Run this to add new columns for enhanced locked memory functionality

-- Add new columns to memory_groups table for advanced locking
ALTER TABLE memory_groups 
ADD COLUMN IF NOT EXISTS lock_visibility VARCHAR(20) DEFAULT 'private', -- 'public' or 'private'
ADD COLUMN IF NOT EXISTS show_date_hint BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_image_preview BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blur_percentage INTEGER DEFAULT 80, -- 0-100, how much to blur preview
ADD COLUMN IF NOT EXISTS unlock_hint TEXT, -- Text hint about what this memory might be
ADD COLUMN IF NOT EXISTS unlock_task TEXT, -- Task description for task-based unlocks
ADD COLUMN IF NOT EXISTS unlock_type VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled' or 'task_based'
ADD COLUMN IF NOT EXISTS task_completed BOOLEAN DEFAULT FALSE; -- For task-based unlocks

-- Update existing records to use the new default values
UPDATE memory_groups 
SET 
    lock_visibility = 'private',
    show_date_hint = FALSE,
    show_image_preview = FALSE,
    blur_percentage = 80,
    unlock_type = 'scheduled',
    task_completed = FALSE
WHERE lock_visibility IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN memory_groups.lock_visibility IS 'Whether locked memory is visible to end users: public (visible but locked) or private (completely hidden)';
COMMENT ON COLUMN memory_groups.show_date_hint IS 'Whether to show the date when memory was created/taken for public locked memories';
COMMENT ON COLUMN memory_groups.show_image_preview IS 'Whether to show a blurred preview image for public locked memories';
COMMENT ON COLUMN memory_groups.blur_percentage IS 'Percentage of blur to apply to preview image (0-100)';
COMMENT ON COLUMN memory_groups.unlock_hint IS 'Text hint about what this locked memory contains';
COMMENT ON COLUMN memory_groups.unlock_task IS 'Description of task that needs to be completed to unlock this memory';
COMMENT ON COLUMN memory_groups.unlock_type IS 'Type of unlock mechanism: scheduled (time-based) or task_based (manual unlock after task completion)';
COMMENT ON COLUMN memory_groups.task_completed IS 'Whether the required task has been completed (for task-based unlocks)';