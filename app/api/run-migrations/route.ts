import { NextRequest, NextResponse } from 'next/server'
import { runPendingMigrations, getMigrationStatus } from '@/lib/migrations'
import { requireAuth } from '@/lib/firebase/serverAuth'

/**
 * POST /api/run-migrations - Run pending database migrations
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    console.log('Running pending migrations...')
    await runPendingMigrations()
    
    const status = await getMigrationStatus()
    
    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully',
      migrations: status
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

/**
 * GET /api/run-migrations - Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const status = await getMigrationStatus()
    
    return NextResponse.json({
      success: true,
      migrations: status
    })
    
  } catch (error) {
    console.error('Migration status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get migration status'
    })
  }
}