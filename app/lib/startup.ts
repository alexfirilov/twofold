// Startup initialization for the application
import { runPendingMigrations } from './migrations';

// Flag to track if initialization has been run
let isInitialized = false;

export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('Initializing application...');

  try {
    // Run database migrations
    await runPendingMigrations();
    
    console.log('✓ Application initialized successfully');
    isInitialized = true;
  } catch (error) {
    console.error('✗ Application initialization failed:', error);
    // Don't mark as initialized if it failed
    throw error;
  }
}

// Force re-initialization (useful for development)
export function resetInitialization(): void {
  isInitialized = false;
}