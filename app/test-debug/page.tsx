'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCorner } from '../contexts/CornerContext'

export default function TestDebugPage() {
  const { user } = useAuth()
  const { currentCorner, userCorners } = useCorner()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-upload', {
        method: 'POST',
        credentials: 'include'
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Test failed' })
    } finally {
      setLoading(false)
    }
  }

  const testMemoryGroupsAPI = async () => {
    if (!currentCorner) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/memory-groups?cornerId=${currentCorner.id}&includeMedia=true&includeLocked=false`, {
        credentials: 'include'
      })
      const result = await response.json()
      setTestResult({ apiTest: 'memory-groups', result })
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'API test failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-semibold">Current State:</h2>
          <p>User: {user?.email || 'Not logged in'}</p>
          <p>Current Corner: {currentCorner?.name || 'None selected'}</p>
          <p>Available Corners: {userCorners.length}</p>
        </div>
        
        <div className="space-x-4">
          <button
            onClick={runTest}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Upload Test'}
          </button>
          
          <button
            onClick={testMemoryGroupsAPI}
            disabled={loading || !currentCorner}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Test Memory Groups API
          </button>
        </div>
      </div>

      {testResult && (
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Test Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}