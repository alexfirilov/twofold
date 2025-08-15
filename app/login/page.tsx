"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Lock, Mail, UserPlus, KeyRound } from 'lucide-react'
import { signInWithEmail, signUpWithEmail, sendPasswordReset, signInWithGoogle } from '@/lib/firebase/auth'

type AuthMode = 'signin' | 'signup' | 'reset'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      let user;
      
      if (mode === 'signin') {
        user = await signInWithEmail(email, password)
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Display name is required')
          return
        }
        user = await signUpWithEmail(email, password, displayName.trim())
      } else if (mode === 'reset') {
        await sendPasswordReset(email)
        setMessage('Password reset email sent! Check your inbox.')
        return
      }

      if (user) {
        // Session creation will be handled by AuthContext
        // Add a small delay to ensure session is created
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const user = await signInWithGoogle()
      if (user) {
        // Session creation will be handled by AuthContext
        // Add a small delay to ensure session is created
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }


  const getHeaderInfo = () => {
    switch (mode) {
      case 'signin':
        return {
          icon: <Lock className="h-6 w-6 text-primary" />,
          title: 'Welcome Back',
          description: 'Sign in to access our memories'
        }
      case 'signup':
        return {
          icon: <UserPlus className="h-6 w-6 text-primary" />,
          title: 'Join Our Corner',
          description: 'Create your account to start sharing memories'
        }
      case 'reset':
        return {
          icon: <KeyRound className="h-6 w-6 text-primary" />,
          title: 'Reset Password',
          description: 'Enter your email to receive a password reset link'
        }
    }
  }

  const headerInfo = getHeaderInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Romantic header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
            <h1 className="text-4xl font-romantic text-primary">Our Little Corner</h1>
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
          </div>
          <p className="text-muted-foreground font-body">
            A special place for our memories 💕
          </p>
        </div>

        {/* Auth card */}
        <Card className="romantic-card border-accent/30 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {headerInfo.icon}
            </div>
            <CardTitle className="text-2xl font-romantic text-primary">{headerInfo.title}</CardTitle>
            <CardDescription className="font-body">
              {headerInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Email field */}
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="romantic-input text-center text-lg h-12"
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                </div>

                {/* Password field (not shown for reset mode) */}
                {mode !== 'reset' && (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Enter your password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="romantic-input text-center text-lg h-12"
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>
                )}

                {/* Display name field (only for signup) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter your display name..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="romantic-input text-center text-lg h-12"
                      disabled={isLoading}
                      required
                    />
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <p className="text-sm text-red-500 text-center font-body animate-fade-in">
                    {error}
                  </p>
                )}

                {/* Success message */}
                {message && (
                  <p className="text-sm text-green-600 text-center font-body animate-fade-in">
                    {message}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                variant="romantic"
                className="w-full h-12 text-lg"
                disabled={isLoading || !email.trim() || (mode !== 'reset' && !password.trim()) || (mode === 'signup' && !displayName.trim())}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending email...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    {mode === 'signin' ? 'Enter Our Corner' : mode === 'signup' ? 'Join Our Corner' : 'Send Reset Email'}
                    <Heart className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Google Sign-In (only for signin and signup modes) */}
            {mode !== 'reset' && (
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-accent/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-body">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 mt-4 text-lg border-accent/30 hover:bg-accent/10"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </div>
                  )}
                </Button>
              </div>
            )}

            {/* Mode switching */}
            <div className="mt-6 space-y-3 text-center">
              {mode === 'signin' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                    className="text-primary hover:text-primary/80 font-body"
                  >
                    Don't have an account? Sign up
                  </Button>
                  <br />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                    className="text-muted-foreground hover:text-foreground font-body"
                  >
                    Forgot your password?
                  </Button>
                </>
              )}
              
              {mode === 'signup' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                  className="text-primary hover:text-primary/80 font-body"
                >
                  Already have an account? Sign in
                </Button>
              )}
              
              {mode === 'reset' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                  className="text-primary hover:text-primary/80 font-body"
                >
                  Back to sign in
                </Button>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Made with 💖 for someone special
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Decorative elements */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-2 text-primary/60">
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}