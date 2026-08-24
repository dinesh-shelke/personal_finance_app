import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Google sign-in via Supabase's PKCE flow.
 *
 * Why the browser flow rather than the native Google SDK: the native SDK needs
 * the SHA-1 fingerprint of every signing keystore registered in Google Cloud,
 * including the one EAS generates. That is a recurring setup tax for a family
 * app, and the flow below gives the same result through Android's Custom Tab.
 *
 * Sequence:
 *   1. Ask Supabase for the Google consent URL (it generates and stores the
 *      PKCE verifier).
 *   2. Open it in a Custom Tab. Google redirects back to `pfa://...?code=...`.
 *   3. Exchange the code for a session, which the storage adapter persists.
 *
 * `pfa://` must be allow-listed in Supabase (Auth -> URL Configuration ->
 * Redirect URLs) or step 3 never happens -- the browser will just sit on an
 * error page.
 */

export type SignInResult =
  | { status: 'success' }
  /** The user backed out of the Custom Tab. Not an error; show nothing. */
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Human-readable message for anything we can't recover from. */
function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const redirectTo = AuthSession.makeRedirectUri({
    // Matches `scheme` in app.config.ts.
    scheme: 'pfa',
    // Deep link the router can resolve, rather than the bare scheme root.
    path: 'auth/callback',
  });

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // We open the browser ourselves so we can await the result; letting
        // supabase-js redirect would work on web but strand us on native.
        skipBrowserRedirect: true,
        queryParams: {
          // Ask Google for a refresh token and let the user pick an account
          // rather than silently reusing the last one -- important when several
          // family members share one phone.
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return { status: 'error', message: error.message };
    if (!data?.url) {
      return { status: 'error', message: 'Google sign-in is not configured for this project.' };
    }

    // On web, the shared browser handles the redirect and `detectSessionInUrl`
    // picks the session up on reload.
    if (Platform.OS === 'web') {
      globalThis.location.assign(data.url);
      return { status: 'success' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      // Reuse the user's signed-in Chrome session so they usually just tap
      // their existing Google account.
      preferEphemeralSession: false,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { status: 'cancelled' };
    }
    if (result.type !== 'success' || !result.url) {
      return { status: 'error', message: 'Sign-in did not complete. Please try again.' };
    }

    return exchangeCodeFromUrl(result.url);
  } catch (error) {
    return {
      status: 'error',
      message: toMessage(error, 'Could not reach Google. Check your connection.'),
    };
  }
}

/**
 * Turns the `?code=...` on the returned deep link into a persisted session.
 *
 * Exported separately because Android can deliver the redirect through the
 * cold-start deep-link handler instead of `openAuthSessionAsync` -- e.g. when
 * the OS evicts the app while the Custom Tab is in front.
 */
export async function exchangeCodeFromUrl(url: string): Promise<SignInResult> {
  const params = parseCallbackParams(url);

  // Supabase surfaces provider failures as query params, not as an HTTP error.
  if (params.error) {
    // The user tapping "cancel" on Google's consent screen arrives here, not as
    // a browser dismissal — treat it as a choice rather than a failure.
    if (params.error === 'access_denied') return { status: 'cancelled' };
    return {
      status: 'error',
      message: params.error_description ?? `Sign-in was rejected (${params.error}).`,
    };
  }

  const code = params.code;
  if (!code) {
    return { status: 'error', message: 'Sign-in response was missing its authorisation code.' };
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return { status: 'error', message: error.message };

  return { status: 'success' };
}

/**
 * Reads the parameters off an OAuth callback deep link.
 *
 * Hand-rolled rather than using `expo-auth-session`'s `getQueryParams`, which
 * lives in an internal module that the package does not re-export, or a `URL`
 * polyfill, which does not reliably parse custom schemes like `pfa://` on
 * Hermes.
 *
 * Both the query string (`?code=...`, the PKCE flow) and the fragment
 * (`#error=...`, which is how some provider errors come back) are read, so a
 * failure is never silently swallowed.
 */
export function parseCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  for (const separator of ['?', '#']) {
    const start = url.indexOf(separator);
    if (start === -1) continue;

    // Stop at the other separator so a fragment isn't parsed as part of the query.
    const rest = url.slice(start + 1);
    const other = separator === '?' ? rest.indexOf('#') : -1;
    const segment = other === -1 ? rest : rest.slice(0, other);

    for (const pair of segment.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
      if (!rawKey) continue;

      try {
        // `+` is a space in form-encoded values; decodeURIComponent leaves it.
        params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      } catch {
        // A malformed percent-escape shouldn't lose the rest of the params.
        params[rawKey] = rawValue;
      }
    }
  }

  return params;
}

/** True when a deep link looks like the OAuth callback rather than an in-app link. */
export function isAuthCallbackUrl(url: string): boolean {
  return url.includes('auth/callback') || /[?#&]code=/.test(url);
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}
