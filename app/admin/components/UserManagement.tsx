'use client'

import { useState, useEffect } from 'react'
import { useCorner } from '../../contexts/CornerContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, UserPlus, Trash2, Shield, Settings, Copy, Check } from 'lucide-react'

interface CornerUser {
  id: string
  firebase_uid: string
  display_name?: string
  email?: string
  avatar_url?: string
  role: 'admin' | 'participant'
  permissions: {
    can_upload: boolean
    can_edit: boolean
    can_manage: boolean
  }
  joined_at: string
  last_active_at?: string
}

interface PendingInvite {
  id: string
  email: string
  role: 'admin' | 'participant'
  permissions: {
    can_upload: boolean
    can_edit: boolean
    can_manage: boolean
  }
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  invited_by_firebase_uid: string
  expires_at: string
  created_at: string
}

export default function UserManagement() {
  const { currentCorner, userRole } = useCorner()
  const [users, setUsers] = useState<CornerUser[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'participant'>('participant')
  const [invitePermissions, setInvitePermissions] = useState({
    can_upload: true,
    can_edit: false,
    can_manage: false
  })
  const [isInviting, setIsInviting] = useState(false)

  // Copy state
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)

  useEffect(() => {
    if (currentCorner) {
      loadUsers()
      loadPendingInvites()
    }
  }, [currentCorner])

  const loadUsers = async () => {
    if (!currentCorner) return

    try {
      const response = await fetch(`/api/corners/${currentCorner.id}/users`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPendingInvites = async () => {
    if (!currentCorner) return

    try {
      const response = await fetch(`/api/corners/${currentCorner.id}/invites`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPendingInvites(data.invites || [])
      }
    } catch (error) {
      console.error('Error loading invites:', error)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCorner) return

    setIsInviting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/corner-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          corner_id: currentCorner.id,
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Invitation sent to ${inviteEmail}!`)
        setInviteEmail('')
        setShowInviteForm(false)
        loadPendingInvites()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send invitation')
      }
    } catch (error) {
      setError('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCopyInviteLink = async (invite: PendingInvite) => {
    const inviteLink = `${window.location.origin}/invite/${currentCorner?.invite_code}?email=${invite.email}`
    
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedInvite(invite.id)
      setTimeout(() => setCopiedInvite(null), 2000)
    } catch (error) {
      setError('Failed to copy invite link')
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/corner-invites/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setSuccess('Invitation revoked')
        loadPendingInvites()
      } else {
        setError('Failed to revoke invitation')
      }
    } catch (error) {
      setError('Failed to revoke invitation')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!currentCorner || !confirm('Are you sure you want to remove this user?')) return

    try {
      const response = await fetch(`/api/corners/${currentCorner.id}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setSuccess('User removed from corner')
        loadUsers()
      } else {
        setError('Failed to remove user')
      }
    } catch (error) {
      setError('Failed to remove user')
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'participant') => {
    if (!currentCorner) return

    try {
      const response = await fetch(`/api/corners/${currentCorner.id}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setSuccess('User role updated')
        loadUsers()
      } else {
        setError('Failed to update user role')
      }
    } catch (error) {
      setError('Failed to update user role')
    }
  }

  if (!currentCorner) {
    return <div>Loading...</div>
  }

  if (userRole !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Admin privileges required</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h2>
          <p className="text-muted-foreground">
            Manage users and invitations for {currentCorner.name}
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Invitation
            </CardTitle>
            <CardDescription>
              Invite someone to join {currentCorner.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'participant')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="participant">Participant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={invitePermissions.can_upload}
                      onChange={(e) => setInvitePermissions(prev => ({
                        ...prev,
                        can_upload: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Can upload media</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={invitePermissions.can_edit}
                      onChange={(e) => setInvitePermissions(prev => ({
                        ...prev,
                        can_edit: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Can edit content</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={invitePermissions.can_manage}
                      onChange={(e) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Can manage corner settings</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Current Users */}
      <Card>
        <CardHeader>
          <CardTitle>Current Users ({users.length})</CardTitle>
          <CardDescription>Active members of this corner</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.display_name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateUserRole(user.id, e.target.value as 'admin' | 'participant')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="participant">Participant</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations ({pendingInvites.length})</CardTitle>
          <CardDescription>Invitations waiting for acceptance</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No pending invitations
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {invite.role} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{invite.status}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyInviteLink(invite)}
                    >
                      {copiedInvite === invite.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}