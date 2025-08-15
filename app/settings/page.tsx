'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  ArrowLeft, 
  User, 
  Mail, 
  Trash2, 
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { updateProfile, updateEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  
  // UI states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const clearMessages = () => {
    setMessage('')
    setError('')
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.currentUser) return

    setIsUpdatingProfile(true)
    clearMessages()

    try {
      await updateProfile(auth.currentUser!, {
        displayName: displayName.trim()
      })
      setMessage('Display name updated successfully!')
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.currentUser) return

    setIsUpdatingEmail(true)
    clearMessages()

    try {
      // Re-authenticate user before email change
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser!.email || '', currentPassword)
        await reauthenticateWithCredential(auth.currentUser!, credential)
      }

      await updateEmail(auth.currentUser!, email)
      setMessage('Email updated successfully!')
      setCurrentPassword('')
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setError('Please enter your current password to update your email')
      } else {
        setError(error.message || 'Failed to update email')
      }
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!auth?.currentUser || deleteConfirmation !== 'DELETE') return

    setIsDeletingAccount(true)
    clearMessages()

    try {
      // Re-authenticate user before deletion
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser!.email || '', currentPassword)
        await reauthenticateWithCredential(auth.currentUser!, credential)
      }

      await deleteUser(auth.currentUser!)
      router.push('/login')
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setError('Please enter your current password to delete your account')
      } else {
        setError(error.message || 'Failed to delete account')
      }
      setIsDeletingAccount(false)
    }
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-romantic text-primary">Account Settings</h1>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your display name and personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                />
              </div>
              
              <Button type="submit" disabled={isUpdatingProfile} className="w-full">
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Display Name
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Address
            </CardTitle>
            <CardDescription>
              Change your account email address. You'll need to verify the new email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter new email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPasswordEmail">Current Password</Label>
                <Input
                  id="currentPasswordEmail"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
              </div>
              
              <Button type="submit" disabled={isUpdatingEmail} className="w-full">
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-medium mb-2">
                    ⚠️ This will permanently delete your account and all data
                  </p>
                  <p className="text-red-600 text-sm">
                    Type "DELETE" to confirm this action.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">Confirmation</Label>
                  <Input
                    id="deleteConfirm"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="border-red-200 focus:border-red-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentPasswordDelete">Current Password</Label>
                  <Input
                    id="currentPasswordDelete"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="border-red-200 focus:border-red-400"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmation('')
                      setCurrentPassword('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || !currentPassword || isDeletingAccount}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}