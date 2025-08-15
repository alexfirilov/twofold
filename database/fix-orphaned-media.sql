-- Fix orphaned media records that don't have corner_id set
-- This script should be run after the multi-tenant migration

-- Step 1: Check for orphaned media (media without corner_id)
SELECT 
    COUNT(*) as orphaned_media_count,
    'Media records without corner_id' as description
FROM media 
WHERE corner_id IS NULL;

-- Step 2: Check for media that have memory_group_id but mismatched corner_id
SELECT 
    m.id as media_id,
    m.filename,
    m.corner_id as media_corner_id,
    mg.corner_id as group_corner_id,
    'Media with mismatched corner_id' as issue
FROM media m
JOIN memory_groups mg ON m.memory_group_id = mg.id
WHERE m.corner_id != mg.corner_id OR m.corner_id IS NULL;

-- Step 3: Fix orphaned media by setting corner_id from their memory groups
UPDATE media 
SET corner_id = mg.corner_id
FROM memory_groups mg
WHERE media.memory_group_id = mg.id 
  AND media.corner_id IS NULL;

-- Step 4: For media without memory_group_id, we need to create a default memory group
-- First, let's see if there are any such records
SELECT 
    COUNT(*) as standalone_media_count,
    'Media records without memory group' as description
FROM media 
WHERE memory_group_id IS NULL;

-- Step 5: If there's standalone media, we need more information to assign to corners
-- This query will help identify the appropriate corner based on upload patterns
SELECT 
    uploaded_by_firebase_uid,
    COUNT(*) as media_count,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload
FROM media 
WHERE memory_group_id IS NULL
GROUP BY uploaded_by_firebase_uid;

-- Step 6: Verification query to ensure all media now has corner_id
SELECT 
    COUNT(*) as total_media,
    COUNT(corner_id) as media_with_corner_id,
    COUNT(*) - COUNT(corner_id) as remaining_orphans
FROM media;