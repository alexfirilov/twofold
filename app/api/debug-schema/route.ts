import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/firebase/serverAuth'

/**
 * GET /api/debug-schema - Check actual database schema
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    // Check media table columns
    const mediaColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'media' AND table_schema = 'public'
      ORDER BY ordinal_position
    `)
    
    // Check memory_groups table columns
    const memoryGroupsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'memory_groups' AND table_schema = 'public'
      ORDER BY ordinal_position
    `)
    
    // Check corners table columns
    const cornersColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'corners' AND table_schema = 'public'
      ORDER BY ordinal_position
    `)
    
    // Check data counts
    const counts: Record<string, number | string> = {}
    for (const table of ['media', 'memory_groups', 'corners', 'corner_users']) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = parseInt(result.rows[0].count)
      } catch (error) {
        counts[table] = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }
    
    // Check recent data
    const recentData: Record<string, any> = {}
    try {
      const recentMedia = await query('SELECT id, corner_id, memory_group_id, filename, created_at FROM media ORDER BY created_at DESC LIMIT 3')
      recentData.media = recentMedia.rows
    } catch (error) {
      recentData.media = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
    
    try {
      const recentGroups = await query('SELECT id, corner_id, title, created_at FROM memory_groups ORDER BY created_at DESC LIMIT 3')
      recentData.memory_groups = recentGroups.rows
    } catch (error) {
      recentData.memory_groups = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        user: { uid: user.uid, email: user.email },
        tables: tablesResult.rows.map((r: { table_name: string }) => r.table_name),
        schema: {
          media: mediaColumns.rows,
          memory_groups: memoryGroupsColumns.rows,
          corners: cornersColumns.rows
        },
        counts,
        recentData
      }
    })
    
  } catch (error) {
    console.error('Debug schema error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}