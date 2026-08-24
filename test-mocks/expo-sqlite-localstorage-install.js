// Stub for `expo-sqlite/localStorage/install`.
//
// The real module swaps globalThis.localStorage for a SQLite-backed store via a
// native module that does not exist under Jest. Neutralising it here lets the
// in-memory localStorage from jest.setup.js stand, so any test that imports app
// code (and therefore `src/lib/supabase`) runs without a native runtime.
module.exports = {};
