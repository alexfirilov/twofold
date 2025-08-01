import { Pool, PoolClient } from 'pg'

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Disable SSL for local development
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
})

// Types for memory groups
export interface MemoryGroup {
  id: string
  title?: string
  description?: string
  is_locked: boolean
  unlock_date?: Date
  cover_media_id?: string
  created_at: Date
  updated_at: Date
  media_items?: MediaItem[]
  media_count?: number
}

export interface CreateMemoryGroup {
  title?: string
  description?: string
  is_locked?: boolean
  unlock_date?: Date
}

export interface UpdateMemoryGroup {
  title?: string
  description?: string
  is_locked?: boolean
  unlock_date?: Date
  cover_media_id?: string
}

// Types for media items
export interface MediaItem {
  id: string
  memory_group_id?: string
  filename: string
  original_name: string
  s3_key: string
  s3_url: string
  file_type: string
  file_size: number
  width?: number
  height?: number
  duration?: number
  title?: string
  note?: string
  date_taken?: Date
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface CreateMediaItem {
  memory_group_id?: string
  filename: string
  original_name: string
  s3_key: string
  s3_url: string
  file_type: string
  file_size: number
  width?: number
  height?: number
  duration?: number
  title?: string
  note?: string
  date_taken?: Date
  sort_order?: number
}

export interface UpdateMediaItem {
  title?: string
  note?: string
  date_taken?: Date
  sort_order?: number
}

export interface Session {
  id: string
  session_token: string
  expires_at: Date
  created_at: Date
}

// Filtering and sorting types
export interface MediaFilters {
  file_type?: string
  is_locked?: boolean
  date_from?: Date
  date_to?: Date
  search_term?: string
}

export interface SortOptions {
  field: 'created_at' | 'date_taken' | 'title' | 'file_size' | 'file_type'
  direction: 'asc' | 'desc'
}

export type ViewMode = 'gallery' | 'list' | 'icons' | 'columns' | 'timeline'

/**
 * Execute a query with the connection pool
 */
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Memory Group Functions

/**
 * Create a new memory group
 */
export async function createMemoryGroup(groupData: CreateMemoryGroup): Promise<MemoryGroup> {
  try {
    const result = await query(`
      INSERT INTO memory_groups (title, description, is_locked, unlock_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      groupData.title,
      groupData.description,
      groupData.is_locked || false,
      groupData.unlock_date
    ])
    
    return result.rows[0]
  } catch (error) {
    console.error('Error creating memory group:', error)
    throw new Error('Failed to create memory group')
  }
}

/**
 * Get all memory groups with their media items
 */
export async function getAllMemoryGroups(includeMedia = true, includeLocked = false): Promise<MemoryGroup[]> {
  try {
    const lockFilter = includeLocked ? '' : 'WHERE mg.is_locked = FALSE OR (mg.unlock_date IS NOT NULL AND mg.unlock_date <= NOW())'
    
    if (includeMedia) {
      const result = await query(`
        SELECT 
          mg.*,
          json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'original_name', m.original_name,
              's3_key', m.s3_key,
              's3_url', m.s3_url,
              'file_type', m.file_type,
              'file_size', m.file_size,
              'width', m.width,
              'height', m.height,
              'duration', m.duration,
              'title', m.title,
              'note', m.note,
              'date_taken', m.date_taken,
              'sort_order', m.sort_order,
              'created_at', m.created_at,
              'updated_at', m.updated_at
            ) ORDER BY m.sort_order, m.created_at
          ) FILTER (WHERE m.id IS NOT NULL) as media_items,
          COUNT(m.id)::integer as media_count
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id
        ${lockFilter}
        GROUP BY mg.id
        ORDER BY mg.created_at DESC
      `)
      return result.rows
    } else {
      const result = await query(`
        SELECT mg.*, COUNT(m.id)::integer as media_count
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id
        ${lockFilter}
        GROUP BY mg.id
        ORDER BY mg.created_at DESC
      `)
      return result.rows
    }
  } catch (error) {
    console.error('Error fetching memory groups:', error)
    throw new Error('Failed to fetch memory groups')
  }
}

/**
 * Get memory group by ID
 */
export async function getMemoryGroupById(id: string, includeMedia = true): Promise<MemoryGroup | null> {
  try {
    if (includeMedia) {
      const result = await query(`
        SELECT 
          mg.*,
          json_agg(
            json_build_object(
              'id', m.id,
              'filename', m.filename,
              'original_name', m.original_name,
              's3_key', m.s3_key,
              's3_url', m.s3_url,
              'file_type', m.file_type,
              'file_size', m.file_size,
              'width', m.width,
              'height', m.height,
              'duration', m.duration,
              'title', m.title,
              'note', m.note,
              'date_taken', m.date_taken,
              'sort_order', m.sort_order,
              'created_at', m.created_at,
              'updated_at', m.updated_at
            ) ORDER BY m.sort_order, m.created_at
          ) FILTER (WHERE m.id IS NOT NULL) as media_items
        FROM memory_groups mg
        LEFT JOIN media m ON mg.id = m.memory_group_id
        WHERE mg.id = $1
        GROUP BY mg.id
      `, [id])
      return result.rows[0] || null
    } else {
      const result = await query(`
        SELECT * FROM memory_groups WHERE id = $1
      `, [id])
      return result.rows[0] || null
    }
  } catch (error) {
    console.error('Error fetching memory group:', error)
    throw new Error('Failed to fetch memory group')
  }
}

/**
 * Update memory group
 */
export async function updateMemoryGroup(id: string, updates: UpdateMemoryGroup): Promise<MemoryGroup | null> {
  try {
    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.title !== undefined) {
      setParts.push(`title = $${paramCount}`)
      values.push(updates.title)
      paramCount++
    }

    if (updates.description !== undefined) {
      setParts.push(`description = $${paramCount}`)
      values.push(updates.description)
      paramCount++
    }

    if (updates.is_locked !== undefined) {
      setParts.push(`is_locked = $${paramCount}`)
      values.push(updates.is_locked)
      paramCount++
    }

    if (updates.unlock_date !== undefined) {
      setParts.push(`unlock_date = $${paramCount}`)
      values.push(updates.unlock_date)
      paramCount++
    }

    if (updates.cover_media_id !== undefined) {
      setParts.push(`cover_media_id = $${paramCount}`)
      values.push(updates.cover_media_id)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id)

    const result = await query(`
      UPDATE memory_groups 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error updating memory group:', error)
    throw new Error('Failed to update memory group')
  }
}

/**
 * Delete memory group (and all associated media)
 */
export async function deleteMemoryGroup(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM memory_groups 
      WHERE id = $1
      RETURNING id
    `, [id])
    
    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting memory group:', error)
    throw new Error('Failed to delete memory group')
  }
}

// Media Item Functions

/**
 * Get all media items, sorted by creation date (newest first)
 */
export async function getAllMedia(): Promise<MediaItem[]> {
  try {
    const result = await query(`
      SELECT * FROM media 
      ORDER BY created_at DESC
    `)
    return result.rows
  } catch (error) {
    console.error('Error fetching media:', error)
    throw new Error('Failed to fetch media items')
  }
}

/**
 * Get a single media item by ID
 */
export async function getMediaById(id: string): Promise<MediaItem | null> {
  try {
    const result = await query(`
      SELECT * FROM media 
      WHERE id = $1
    `, [id])
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching media by ID:', error)
    throw new Error('Failed to fetch media item')
  }
}

/**
 * Create a new media item
 */
export async function createMediaItem(mediaData: CreateMediaItem): Promise<MediaItem> {
  try {
    const result = await query(`
      INSERT INTO media (
        memory_group_id, filename, original_name, s3_key, s3_url, file_type, file_size,
        width, height, duration, title, note, date_taken, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      mediaData.memory_group_id,
      mediaData.filename,
      mediaData.original_name,
      mediaData.s3_key,
      mediaData.s3_url,
      mediaData.file_type,
      mediaData.file_size,
      mediaData.width,
      mediaData.height,
      mediaData.duration,
      mediaData.title,
      mediaData.note,
      mediaData.date_taken,
      mediaData.sort_order || 0,
    ])
    
    return result.rows[0]
  } catch (error) {
    console.error('Error creating media item:', error)
    throw new Error('Failed to create media item')
  }
}

/**
 * Update a media item (title, note, date_taken, sort_order)
 */
export async function updateMediaItem(id: string, updates: UpdateMediaItem): Promise<MediaItem | null> {
  try {
    const setParts: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.title !== undefined) {
      setParts.push(`title = $${paramCount}`)
      values.push(updates.title)
      paramCount++
    }

    if (updates.note !== undefined) {
      setParts.push(`note = $${paramCount}`)
      values.push(updates.note)
      paramCount++
    }

    if (updates.date_taken !== undefined) {
      setParts.push(`date_taken = $${paramCount}`)
      values.push(updates.date_taken)
      paramCount++
    }

    if (updates.sort_order !== undefined) {
      setParts.push(`sort_order = $${paramCount}`)
      values.push(updates.sort_order)
      paramCount++
    }

    if (setParts.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(id) // Add ID as the last parameter

    const result = await query(`
      UPDATE media 
      SET ${setParts.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error updating media item:', error)
    throw new Error('Failed to update media item')
  }
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM media 
      WHERE id = $1
      RETURNING id
    `, [id])
    
    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting media item:', error)
    throw new Error('Failed to delete media item')
  }
}

/**
 * Get media items by file type (image or video)
 */
export async function getMediaByType(fileTypePrefix: string): Promise<MediaItem[]> {
  try {
    const result = await query(`
      SELECT * FROM media 
      WHERE file_type LIKE $1
      ORDER BY created_at DESC
    `, [`${fileTypePrefix}%`])
    
    return result.rows
  } catch (error) {
    console.error('Error fetching media by type:', error)
    throw new Error('Failed to fetch media items by type')
  }
}

/**
 * Search media items by title or note content
 */
export async function searchMedia(searchTerm: string): Promise<MediaItem[]> {
  try {
    const result = await query(`
      SELECT * FROM media 
      WHERE title ILIKE $1 OR note ILIKE $1
      ORDER BY created_at DESC
    `, [`%${searchTerm}%`])
    
    return result.rows
  } catch (error) {
    console.error('Error searching media:', error)
    throw new Error('Failed to search media items')
  }
}

// Session management functions

/**
 * Create a new session
 */
export async function createSession(sessionToken: string, expiresAt: Date): Promise<Session> {
  try {
    const result = await query(`
      INSERT INTO sessions (session_token, expires_at)
      VALUES ($1, $2)
      RETURNING *
    `, [sessionToken, expiresAt])
    
    return result.rows[0]
  } catch (error) {
    console.error('Error creating session:', error)
    throw new Error('Failed to create session')
  }
}

/**
 * Get a session by token
 */
export async function getSessionByToken(sessionToken: string): Promise<Session | null> {
  try {
    const result = await query(`
      SELECT * FROM sessions 
      WHERE session_token = $1 AND expires_at > NOW()
    `, [sessionToken])
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching session:', error)
    throw new Error('Failed to fetch session')
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    const result = await query(`
      DELETE FROM sessions 
      WHERE session_token = $1
      RETURNING id
    `, [sessionToken])
    
    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting session:', error)
    throw new Error('Failed to delete session')
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await query(`
      DELETE FROM sessions 
      WHERE expires_at < NOW()
    `)
    
    return result.rowCount
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error)
    return 0
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<{ status: string; timestamp: Date }> {
  try {
    const result = await query('SELECT NOW() as timestamp')
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    throw new Error('Database is unhealthy')
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end()
})

process.on('SIGTERM', () => {
  pool.end()
})