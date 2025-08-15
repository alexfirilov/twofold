import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/firebase/serverAuth'

/**
 * GET /api/check-schema - Check database schema
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check media table schema
    const mediaSchema = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'media'
      ORDER BY ordinal_position
    `)
    
    // Check memory_groups table schema
    const memoryGroupsSchema = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'memory_groups'
      ORDER BY ordinal_position
    `)
    
    // Check corners table schema
    const cornersSchema = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'corners'
      ORDER BY ordinal_position
    `)
    
    // Check if there are any media items
    const mediaCount = await query('SELECT COUNT(*) as count FROM media')
    const memoryGroupsCount = await query('SELECT COUNT(*) as count FROM memory_groups')
    const cornersCount = await query('SELECT COUNT(*) as count FROM corners')
    
    // Check recent media items
    const recentMedia = await query(`
      SELECT id, corner_id, memory_group_id, filename, created_at 
      FROM media 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    // Check recent memory groups
    const recentGroups = await query(`
      SELECT id, corner_id, title, created_at 
      FROM memory_groups 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    return NextResponse.json({
      success: true,
      schema: {
        media: mediaSchema.rows,
        memory_groups: memoryGroupsSchema.rows,
        corners: cornersSchema.rows
      },
      counts: {
        media: mediaCount.rows[0].count,
        memory_groups: memoryGroupsCount.rows[0].count,
        corners: cornersCount.rows[0].count
      },
      recent: {
        media: recentMedia.rows,
        memory_groups: recentGroups.rows
      }
    })
    
  } catch (error) {
    console.error('Schema check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema check failed'
    })
  }
}