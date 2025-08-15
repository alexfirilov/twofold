'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCorner } from '../contexts/CornerContext'

export default function SimpleTestPage() {
  const { user } = useAuth()
  const { currentCorner } = useCorner()
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const runMigrations = async () => {
    setLoading(true)
    setResult('Running migrations...')

    try {
      const response = await fetch('/api/run-migrations', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()
      setResult(`Migration result: ${JSON.stringify(data, null, 2)}`)

    } catch (error) {
      setResult(`Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const checkMigrations = async () => {
    setLoading(true)
    setResult('Checking migrations...')

    try {
      const response = await fetch('/api/run-migrations', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()
      setResult(`Migration status: ${JSON.stringify(data, null, 2)}`)

    } catch (error) {
      setResult(`Migration check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testCreateMemoryGroup = async () => {
    if (!currentCorner) {
      setResult('No corner selected')
      return
    }

    setLoading(true)
    setResult('Testing...')

    try {
      // Test 1: Create memory group
      const response = await fetch('/api/memory-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          corner_id: currentCorner.id,
          title: `Test Memory ${Date.now()}`,
          description: 'Test description',
          is_locked: false
        })
      })

      const responseText = await response.text()
      setResult(`Response: ${response.status}\n${responseText}`)

      if (response.ok) {
        const data = JSON.parse(responseText)
        setResult(prev => prev + `\n\nParsed data: ${JSON.stringify(data, null, 2)}`)
        
        // Test 2: Fetch memory groups
        const fetchResponse = await fetch(`/api/memory-groups?cornerId=${currentCorner.id}&includeMedia=true&includeLocked=false`, {
          credentials: 'include'
        })
        
        const fetchData = await fetchResponse.json()
        setResult(prev => prev + `\n\nFetch result: ${JSON.stringify(fetchData, null, 2)}`)
      }

    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test</h1>
      
      <div className="mb-4">
        <p>User: {user?.email || 'Not logged in'}</p>
        <p>Corner: {currentCorner?.name || 'None'} ({currentCorner?.id || 'No ID'})</p>
      </div>

      <div className="space-x-2 mb-4">
        <button
          onClick={checkMigrations}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Check Migrations
        </button>
        
        <button
          onClick={runMigrations}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Run Migrations
        </button>
        
        <button
          onClick={async () => {
            setLoading(true)
            try {
              const response = await fetch('/api/debug-schema', { credentials: 'include' })
              const data = await response.json()
              setResult(`Schema debug: ${JSON.stringify(data, null, 2)}`)
            } catch (error) {
              setResult(`Schema error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          Debug Schema
        </button>
        
        <button
          onClick={testCreateMemoryGroup}
          disabled={loading || !currentCorner}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Create Memory Group'}
        </button>
      </div>

      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
        {result || 'No results yet'}
      </pre>
    </div>
  )
}