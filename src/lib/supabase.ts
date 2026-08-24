// Installs a `localStorage` shim backed by expo-sqlite. This MUST be imported
// before `createClient`, because the auth client captures the storage adapter
// at construction time. It is what keeps a family member signed in across app
// restarts.
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fail loudly at startup rather than with a confusing network error later.
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ' +
      'then restart the bundler with `npx expo start --clear`.',
  );
}

/**
 * The one Supabase client for the whole app.
 *
 * Both values above ship inside the APK by design — Row Level Security, not key
 * secrecy, is what stops one family member reading another's data.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: globalThis.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // On native there is no URL bar to read the OAuth fragment from; the code is
    // handed to us by the deep link and exchanged explicitly. On web the shared
    // browser flow can still read it.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

let appStateSubscription: { remove: () => void } | null = null;

/**
 * Supabase's token refresh runs on a timer. Left running in the background
 * Android throttles it and the app wakes with an expired token, so start it on
 * foreground and stop it on background. Called once from the root layout.
 *
 * Returns a teardown function.
 */
export function startAutoRefreshLifecycle(): () => void {
  if (Platform.OS === 'web') return () => {};

  appStateSubscription?.remove();

  if (AppState.currentState === 'active') {
    void supabase.auth.startAutoRefresh();
  }

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    void supabase.auth.stopAutoRefresh();
  };
}
