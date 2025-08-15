// Firebase configuration for client-side SDK
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

// Debug: Log environment variables (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Firebase config check:', {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Check if we have all required config values
const hasFirebaseConfig = firebaseConfig.apiKey && 
                          firebaseConfig.authDomain && 
                          firebaseConfig.projectId &&
                          firebaseConfig.storageBucket &&
                          firebaseConfig.messagingSenderId &&
                          firebaseConfig.appId;

// Initialize Firebase app (avoid double initialization)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (hasFirebaseConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('Firebase initialized successfully');
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else if (typeof window !== 'undefined') {
  console.error('Firebase configuration missing. Please check your environment variables.');
}

// Connect to emulator in development
if (auth && process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    // Emulator already connected, ignore the error
    console.log('Auth emulator already connected');
  }
}

export { auth };
export default app;