'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChange, 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as firebaseSignOut,
  updateUserProfile 
} from '@/lib/firebase/auth';
import type { FirebaseUser, AuthContextType } from '@/lib/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sessionSyncInProgress = false;
    
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);
      
      // If user is authenticated but we don't have a session cookie, create one
      if (user && !sessionSyncInProgress) {
        sessionSyncInProgress = true;
        try {
          // Check if we already have a session cookie
          const response = await fetch('/api/auth', {
            method: 'GET',
            credentials: 'include',
          });
          
          const { authenticated } = await response.json();
          
          // If not authenticated on the server side, create session
          if (!authenticated) {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const idToken = await getCurrentUserToken();
            
            if (idToken) {
              await fetch('/api/auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken }),
                credentials: 'include',
              });
            }
          }
        } catch (error) {
          console.error('Error syncing session:', error);
        } finally {
          sessionSyncInProgress = false;
        }
      } else if (!user) {
        // User signed out, ensure session is cleared
        try {
          await fetch('/api/auth', {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Error clearing session on signout:', error);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // User state will be updated by onAuthStateChange
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      // User state will be updated by onAuthStateChange
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      // Clear session cookie first
      await fetch('/api/auth', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      // Then sign out from Firebase
      await firebaseSignOut();
      
      // User state will be updated by onAuthStateChange
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const updateProfile = async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    if (!user) throw new Error('No authenticated user');
    
    await updateUserProfile(data);
    
    // Update local user state
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}