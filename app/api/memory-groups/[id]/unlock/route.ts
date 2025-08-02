import { NextRequest, NextResponse } from 'next/server'
import { updateMemoryGroup } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    await requireAuth()
  } catch (authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = params

    // Mark task as completed and unlock the memory
    const updatedGroup = await updateMemoryGroup(id, {
      task_completed: true,
      is_locked: false
    })

    if (!updatedGroup) {
      return NextResponse.json({ error: 'Memory group not found' }, { status: 404 })
    }

    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Error unlocking memory:', error)
    return NextResponse.json(
      { error: 'Failed to unlock memory' },
      { status: 500 }
    )
  }
}