// Server-side Firebase authentication utilities
import { cookies } from 'next/headers';
import { adminAuth } from './admin';
import type { FirebaseUser } from '../types';

// Session cookie name
const SESSION_COOKIE_NAME = 'firebase-session';

/**
 * Verify Firebase ID token from request headers or cookies
 */
export async function verifyFirebaseToken(token?: string): Promise<FirebaseUser | null> {
  try {
    if (!adminAuth) {
      // Firebase Admin not initialized (likely during build time)
      return null;
    }

    if (!token) {
      // Try to get token from cookie
      const cookieStore = cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (!sessionCookie?.value) return null;
      token = sessionCookie.value;
    }

    // Verify the token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get user data from Firebase Auth
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Get current authenticated user from request
 */
export async function getCurrentUser(): Promise<FirebaseUser | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) return null;
    
    return await verifySessionCookie(sessionCookie.value);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<FirebaseUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Create session cookie from Firebase ID token
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin not initialized');
    }

    // Create session cookie that expires in 7 days
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    
    // Set the cookie
    const cookieStore = cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000, // Convert to seconds
      path: '/',
    });
    
    return sessionCookie;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    throw new Error('Failed to create session');
  }
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(): void {
  const cookieStore = cookies();
  
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Verify session cookie and return user
 */
export async function verifySessionCookie(sessionCookie?: string): Promise<FirebaseUser | null> {
  try {
    if (!adminAuth) {
      // Firebase Admin not initialized (likely during build time)
      return null;
    }

    if (!sessionCookie) {
      const cookieStore = cookies();
      const cookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (!cookie?.value) return null;
      sessionCookie = cookie.value;
    }

    // Verify session cookie with Firebase Admin
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    
    // Get user data from Firebase Auth
    const userRecord = await adminAuth.getUser(decodedClaims.uid);
    
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
    };
  } catch (error) {
    console.error('Session cookie verification failed:', error);
    return null;
  }
}

/**
 * Get user's corners with role information
 */
export async function getUserCornersWithRole(firebaseUid: string) {
  const { getUserCorners } = await import('../db');
  return await getUserCorners(firebaseUid);
}

/**
 * Check if user has access to a specific corner
 */
export async function checkCornerAccess(cornerId: string, firebaseUid: string): Promise<boolean> {
  try {
    const { getCornerById } = await import('../db');
    const corner = await getCornerById(cornerId, firebaseUid);
    return corner !== null && corner.user_role !== undefined;
  } catch (error) {
    console.error('Error checking corner access:', error);
    return false;
  }
}

/**
 * Check if user is admin of a specific corner
 */
export async function checkCornerAdmin(cornerId: string, firebaseUid: string): Promise<boolean> {
  try {
    const { getCornerById } = await import('../db');
    const corner = await getCornerById(cornerId, firebaseUid);
    return corner !== null && corner.user_role === 'admin';
  } catch (error) {
    console.error('Error checking corner admin:', error);
    return false;
  }
}

/**
 * Middleware helper to extract user from Authorization header
 */
export async function getUserFromAuthHeader(authHeader?: string): Promise<FirebaseUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  return await verifyFirebaseToken(token);
}

/**
 * Helper to get user and validate corner access in one call
 */
export async function requireCornerAccess(cornerId: string, authHeader?: string): Promise<{ user: FirebaseUser; hasAccess: boolean; isAdmin: boolean }> {
  const user = authHeader 
    ? await getUserFromAuthHeader(authHeader)
    : await getCurrentUser();
    
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const hasAccess = await checkCornerAccess(cornerId, user.uid);
  const isAdmin = await checkCornerAdmin(cornerId, user.uid);
  
  return { user, hasAccess, isAdmin };
}