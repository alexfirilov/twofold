// Application initialization helper
import { runPendingMigrations } from './migrations';

let initPromise: Promise<void> | null = null;

export function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = runPendingMigrations().catch(error => {
      // Reset the promise so it can be retried
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}