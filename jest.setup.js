// The app reads Supabase config at import time; give tests deterministic values
// so importing `src/lib/supabase` never depends on a developer's local .env.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';

// expo-sqlite installs a localStorage shim in the app entrypoint. Under Jest
// there is no native module, so provide an in-memory equivalent.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}
