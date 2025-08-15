// Firebase Auth utilities for client-side authentication
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
  type AuthError
} from 'firebase/auth';
import { auth } from './config';
import type { FirebaseUser } from '../types';

// Convert Firebase User to our FirebaseUser type
export function mapFirebaseUser(user: User | null): FirebaseUser | null {
  if (!user) return null;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    if (!auth) {
      console.error('Firebase auth is null. Config check:', {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      throw new Error('Firebase not initialized. Please check your configuration and environment variables.');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = mapFirebaseUser(userCredential.user);
    if (!user) throw new Error('Failed to get user data');
    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw handleAuthError(error as AuthError);
  }
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
  try {
    if (!auth) {
      console.error('Firebase auth is null during sign up. Config check:', {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      throw new Error('Firebase not initialized. Please check your configuration and environment variables.');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    const user = mapFirebaseUser(userCredential.user);
    if (!user) throw new Error('Failed to get user data');
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw handleAuthError(error as AuthError);
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    if (!auth) {
      throw new Error('Firebase not initialized. Please check your configuration and environment variables.');
    }
    
    const provider = new GoogleAuthProvider();
    // Request additional scopes if needed
    provider.addScope('email');
    provider.addScope('profile');
    
    // Set custom parameters for better UX
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    const user = mapFirebaseUser(result.user);
    if (!user) throw new Error('Failed to get user data');
    return user;
  } catch (error) {
    console.error('Google sign in error:', error);
    
    // Handle specific Google Sign-In errors
    const authError = error as AuthError;
    if (authError.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    } else if (authError.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked. Please allow pop-ups and try again.');
    } else if (authError.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in request is already in progress.');
    }
    
    throw handleAuthError(authError);
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    if (!auth) {
      throw new Error('Firebase not initialized. Please check your configuration.');
    }
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw handleAuthError(error as AuthError);
  }
}

// Update user profile
export async function updateUserProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
  try {
    if (!auth) {
      throw new Error('Firebase not initialized. Please check your configuration.');
    }
    if (!auth.currentUser) throw new Error('No authenticated user');
    await updateProfile(auth.currentUser, data);
  } catch (error) {
    console.error('Update profile error:', error);
    throw handleAuthError(error as AuthError);
  }
}

// Send password reset email
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    if (!auth) {
      throw new Error('Firebase not initialized. Please check your configuration.');
    }
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw handleAuthError(error as AuthError);
  }
}

// Auth state observer
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
  if (!auth) {
    // If Firebase not initialized, call callback with null and return empty unsubscribe
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(mapFirebaseUser(user));
  });
}

// Get current user
export function getCurrentUser(): FirebaseUser | null {
  if (!auth) return null;
  return mapFirebaseUser(auth.currentUser);
}

// Get current user ID token
export async function getCurrentUserToken(): Promise<string | null> {
  try {
    if (!auth || !auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

// Handle Firebase Auth errors
function handleAuthError(error: AuthError): Error {
  const { code, message } = error;
  
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new Error('Invalid email or password');
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists');
    case 'auth/weak-password':
      return new Error('Password should be at least 6 characters');
    case 'auth/invalid-email':
      return new Error('Invalid email address');
    case 'auth/user-disabled':
      return new Error('This account has been disabled');
    case 'auth/too-many-requests':
      return new Error('Too many failed attempts. Please try again later');
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your connection');
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
      return new Error('Google Sign-In is not properly configured. Please contact support.');
    case 'auth/unauthorized-domain':
      return new Error('This domain is not authorized for Google Sign-In. Please contact support.');
    default:
      return new Error(message || 'Authentication failed');
  }
}