'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { 
  Corner, 
  CreateCorner, 
  UpdateCorner, 
  CornerInvite, 
  CreateCornerInvite,
  CornerRole,
  CornerContextType 
} from '@/lib/types';

const CornerContext = createContext<CornerContextType | undefined>(undefined);

interface CornerProviderProps {
  children: React.ReactNode;
}

export function CornerProvider({ children }: CornerProviderProps) {
  const { user } = useAuth();
  const [currentCorner, setCurrentCorner] = useState<Corner | null>(null);
  const [userCorners, setUserCorners] = useState<Corner[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CornerInvite[]>([]);
  const [userRole, setUserRole] = useState<CornerRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's corners when user changes
  useEffect(() => {
    if (user) {
      loadUserCorners();
      loadPendingInvites();
    } else {
      setUserCorners([]);
      setPendingInvites([]);
      setCurrentCorner(null);
      setUserRole(null);
      setLoading(false);
      // Clear saved corner from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCornerId');
      }
    }
  }, [user]);

  const loadUserCorners = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/corners', {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load corners (${response.status})`);
      }
      
      const { data } = await response.json();
      setUserCorners(data);
      
      // Try to restore previously selected corner from localStorage
      let selectedCorner = null;
      if (typeof window !== 'undefined') {
        const savedCornerId = localStorage.getItem('selectedCornerId');
        if (savedCornerId) {
          selectedCorner = data.find((c: Corner) => c.id === savedCornerId);
          // If saved corner is not found, clear it from localStorage
          if (!selectedCorner) {
            localStorage.removeItem('selectedCornerId');
          }
        }
      }
      
      // Set current corner: saved corner, or if none selected/available use first corner
      if (!selectedCorner && !currentCorner || (currentCorner && !data.find((c: Corner) => c.id === currentCorner.id))) {
        selectedCorner = data[0] || null;
      }
      
      if (selectedCorner) {
        setCurrentCorner(selectedCorner);
        setUserRole(selectedCorner.user_role || null);
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedCornerId', selectedCorner.id);
        }
      } else {
        // Clear current corner if no valid corner is available
        setCurrentCorner(null);
        setUserRole(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedCornerId');
        }
      }
    } catch (error) {
      console.error('Error loading user corners:', error);
      setError(error instanceof Error ? error.message : 'Failed to load corners');
      // Clear corner state on error
      setUserCorners([]);
      setCurrentCorner(null);
      setUserRole(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCornerId');
      }
    } finally {
      setLoading(false);
    }
  };

  const createCorner = async (data: CreateCorner): Promise<Corner> => {
    if (!user) throw new Error('Authentication required');
    
    const response = await fetch('/api/corners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create corner');
    }
    
    const { data: corner } = await response.json();
    
    // Add to user corners and set as current
    setUserCorners(prev => [...prev, corner]);
    setCurrentCorner(corner);
    setUserRole('admin');
    
    return corner;
  };

  const switchCorner = async (cornerId: string): Promise<void> => {
    setError(null);
    try {
      const corner = userCorners.find(c => c.id === cornerId);
      if (!corner) {
        throw new Error('Corner not found in your available corners');
      }
      
      // Verify corner access by making a test API call
      const response = await fetch(`/api/corners/${cornerId}`, {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Access denied to this corner');
      }
      
      setCurrentCorner(corner);
      setUserRole(corner.user_role || null);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedCornerId', corner.id);
      }
    } catch (error) {
      console.error('Error switching corner:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch corner');
      throw error; // Re-throw so calling code can handle it
    }
  };

  const updateCorner = async (cornerId: string, data: UpdateCorner): Promise<Corner> => {
    if (!user) throw new Error('Authentication required');
    
    const response = await fetch(`/api/corners/${cornerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update corner');
    }
    
    const { data: updatedCorner } = await response.json();
    
    // Update in user corners
    setUserCorners(prev => prev.map(c => c.id === cornerId ? updatedCorner : c));
    
    // Update current corner if it's the one being updated
    if (currentCorner?.id === cornerId) {
      setCurrentCorner(updatedCorner);
    }
    
    return updatedCorner;
  };

  const inviteUser = async (data: CreateCornerInvite): Promise<CornerInvite> => {
    if (!user) throw new Error('Authentication required');
    
    const response = await fetch('/api/corner-invites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send invite');
    }
    
    const { data: invite } = await response.json();
    return invite;
  };

  const removeUser = async (cornerId: string, userId: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    
    const response = await fetch(`/api/corners/${cornerId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove user');
    }
  };

  const loadPendingInvites = async () => {
    if (!user || !user.email) return;
    
    try {
      const response = await fetch('/api/user/pending-invites', {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });
      
      if (response.ok) {
        const { invites } = await response.json();
        setPendingInvites(invites || []);
      } else {
        console.warn('Failed to load pending invites:', response.status);
        setPendingInvites([]);
      }
    } catch (error) {
      console.error('Error loading pending invites:', error);
      setPendingInvites([]);
    }
  };

  const refreshCorners = async (): Promise<void> => {
    setError(null);
    await loadUserCorners();
    await loadPendingInvites();
  };

  const clearError = () => {
    setError(null);
  };

  const value: CornerContextType = {
    currentCorner,
    userCorners,
    pendingInvites,
    userRole,
    loading,
    error,
    createCorner,
    switchCorner,
    updateCorner,
    inviteUser,
    removeUser,
    refreshCorners,
    clearError,
  };

  return (
    <CornerContext.Provider value={value}>
      {children}
    </CornerContext.Provider>
  );
}

export function useCorner(): CornerContextType {
  const context = useContext(CornerContext);
  if (context === undefined) {
    throw new Error('useCorner must be used within a CornerProvider');
  }
  return context;
}

// Helper function to get current user token
async function getCurrentUserToken(): Promise<string> {
  const { getCurrentUserToken } = await import('@/lib/firebase/auth');
  const token = await getCurrentUserToken();
  if (!token) throw new Error('No authentication token');
  return token;
}