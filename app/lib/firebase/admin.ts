// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin (avoid double initialization)
const apps = getApps();

// Check if Firebase environment variables are available
const hasFirebaseConfig = process.env.FIREBASE_ADMIN_PROJECT_ID && 
                          process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
                          process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const adminApp = apps.length === 0 && hasFirebaseConfig ? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
}) : apps[0] || null;

// Get Auth instance (only if adminApp is available)
const adminAuth = adminApp ? getAuth(adminApp) : null;

export { adminAuth };
export default adminApp;