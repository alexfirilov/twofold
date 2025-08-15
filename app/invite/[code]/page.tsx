'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCorner } from '@/contexts/CornerContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Heart, Mail, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

interface CornerInvite {
  id: string
  corner_id: string
  email: string
  role: 'admin' | 'participant'
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  corner?: {
    id: string
    name: string
    description?: string
  }
}

export default function InvitePage({ params }: { params: { code: string } }) {
  const { code } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { switchCorner, refreshCorners } = useCorner()
  
  const [invite, setInvite] = useState<CornerInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const inviteEmail = searchParams.get('email')

  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
    loadInvite()
  }, [code, inviteEmail])

  const loadInvite = async () => {
    try {
      setLoading(true)
      // We need to find the invite by corner invite_code and email
      const response = await fetch(`/api/corner-invites?code=${code}&email=${inviteEmail || ''}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.invite) {
          setInvite(data.invite)
          if (data.invite.status !== 'pending') {
            setError(`This invitation is ${data.invite.status}`)
          }
        } else {
          setError('Invitation not found or expired')
        }
      } else {
        setError('Failed to load invitation')
      }
    } catch (error) {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite) return

    setProcessing(true)
    setError('')

    try {
      if (!auth) {
        throw new Error('Firebase not initialized')
      }

      let firebaseUser
      
      if (isSignUp) {
        // Create new account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        firebaseUser = userCredential.user
        
        // Update display name
        if (displayName) {
          await updateProfile(firebaseUser, { displayName })
        }
      } else {
        // Sign in existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        firebaseUser = userCredential.user
      }

      // Wait for auth context to update
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Accept the invitation
      await acceptInvitation()
      
    } catch (error: any) {
      console.error('Authentication error:', error)
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up instead.')
        setIsSignUp(true)
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password')
      } else if (error.code === 'auth/email-already-in-use') {
        setError('Account already exists. Please sign in instead.')
        setIsSignUp(false)
      } else {
        setError(error.message || 'Authentication failed')
      }
    } finally {
      setProcessing(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invite) return

    try {
      setProcessing(true)
      
      const response = await fetch(`/api/corner-invites/${invite.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        setSuccess('Invitation accepted! Redirecting to your corner...')
        
        // Refresh corners to include the newly joined corner
        await refreshCorners()
        
        // Switch to the invited corner
        if (invite.corner) {
          await switchCorner(invite.corner.id)
        }
        
        // Redirect to the gallery
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to accept invitation')
      }
    } catch (error) {
      setError('Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const handleDirectAccept = async () => {
    if (user) {
      await acceptInvitation()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              {error || 'This invitation may have expired or been revoked.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>{success}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-romantic text-primary">
            You're Invited!
          </CardTitle>
          <CardDescription>
            Join <strong>{invite.corner?.name || 'Our Little Corner'}</strong> as a{' '}
            <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
              {invite.role}
            </Badge>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {user ? (
            // User is already authenticated
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Signed in as {user.email}
              </div>
              <Button 
                onClick={handleDirectAccept}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </div>
          ) : (
            // User needs to authenticate
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={!!inviteEmail}
                />
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button type="submit" disabled={processing} className="w-full">
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {isSignUp ? 'Sign Up & Accept' : 'Sign In & Accept'}
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {isSignUp 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}