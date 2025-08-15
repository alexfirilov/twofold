'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCorner } from '../contexts/CornerContext'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Plus, Users, Share2, Copy } from 'lucide-react'

export default function CornerSelector() {
  const { user } = useAuth()
  const { userCorners, createCorner, switchCorner } = useCorner()
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form data for creating a corner
  const [cornerName, setCornerName] = useState('')
  const [cornerDescription, setCornerDescription] = useState('')
  
  // Invite link state
  const [showInviteLink, setShowInviteLink] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  const handleSelectCorner = async (cornerId: string) => {
    setIsLoading(true)
    try {
      await switchCorner(cornerId)
      router.push('/')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to select corner')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCorner = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!user) {
        setError('You must be logged in to create a corner')
        return
      }

      if (!cornerName.trim()) {
        setError('Corner name is required')
        return
      }

      const newCorner = await createCorner({
        name: cornerName.trim(),
        description: cornerDescription.trim() || undefined,
        is_public: false,
        admin_firebase_uid: user.uid,
      })

      setSuccess('Corner created successfully!')
      
      // Generate invite link for sharing using the corner's invite code
      const shareableLink = `${window.location.origin}/invite/${newCorner.invite_code}`
      setInviteLink(shareableLink)
      setShowInviteLink(true)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create corner')
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setSuccess('Invite link copied to clipboard!')
    } catch (error) {
      setError('Failed to copy link')
    }
  }

  const proceedToCorner = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
            <h1 className="text-4xl font-romantic text-primary">Choose Your Corner</h1>
            <Heart className="h-8 w-8 text-primary animate-heart-beat" />
          </div>
          <p className="text-muted-foreground font-body">
            Select a corner to enter, or create a new one 💕
          </p>
        </div>

        {/* Corner Selection or Creation */}
        {!showInviteLink ? (
          <Card className="romantic-card border-accent/30 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-romantic text-primary">
                {mode === 'select' ? 'Your Corners' : 'Create New Corner'}
              </CardTitle>
              <CardDescription className="font-body">
                {mode === 'select' 
                  ? 'Choose which corner you\'d like to visit'
                  : 'Set up a new romantic space for your memories'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {mode === 'select' ? (
                <div className="space-y-6">
                  {userCorners.length > 0 ? (
                    <div className="space-y-3">
                      {userCorners.map((corner) => (
                        <Card key={corner.id} className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer" onClick={() => handleSelectCorner(corner.id)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-romantic text-lg text-primary">{corner.name}</h3>
                                {corner.description && (
                                  <p className="text-sm text-muted-foreground font-body">{corner.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground font-body mt-1">
                                  Role: <span className="capitalize">{corner.user_role}</span>
                                </p>
                              </div>
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-body mb-4">
                        You're not part of any corners yet
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => setMode('create')}
                      variant="romantic"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Corner
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateCorner} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Corner name (e.g., 'Our Love Story')"
                        value={cornerName}
                        onChange={(e) => setCornerName(e.target.value)}
                        className="romantic-input text-center"
                        disabled={isLoading}
                        autoFocus
                        required
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Description (optional)"
                        value={cornerDescription}
                        onChange={(e) => setCornerDescription(e.target.value)}
                        className="romantic-input text-center"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center font-body animate-fade-in">
                      {error}
                    </p>
                  )}

                  {success && (
                    <p className="text-sm text-green-600 text-center font-body animate-fade-in">
                      {success}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMode('select')}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="romantic"
                      className="flex-1"
                      disabled={isLoading || !cornerName.trim()}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Create Corner
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Invite Link Display */
          <Card className="romantic-card border-accent/30 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-romantic text-primary">Corner Created!</CardTitle>
              <CardDescription className="font-body">
                Share this link with your partner to invite them to your corner
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-body text-muted-foreground">Invite Link:</span>
                </div>
                <div className="mt-2 p-2 bg-background rounded border text-sm font-mono break-all">
                  {inviteLink}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={copyInviteLink}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={proceedToCorner}
                  variant="romantic"
                  className="flex-1"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Enter Corner
                </Button>
              </div>

              {success && (
                <p className="text-sm text-green-600 text-center font-body animate-fade-in">
                  {success}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}