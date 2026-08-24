import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { startAutoRefreshLifecycle, supabase } from '@/lib/supabase';

import { exchangeCodeFromUrl, isAuthCallbackUrl, signOut as doSignOut } from './google';

type SessionState = {
  session: Session | null;
  user: User | null;
  /**
   * True until the persisted session has been read from storage. The router
   * must wait for this, otherwise a signed-in user is flashed the sign-in
   * screen on every cold start.
   */
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Read whatever was persisted by the expo-sqlite storage adapter.
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // Single source of truth from here on: sign-in, sign-out, token refresh and
    // user updates all arrive through this listener.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    const stopAutoRefresh = startAutoRefreshLifecycle();

    return () => {
      active = false;
      subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  // Android can hand us the OAuth redirect through the deep-link handler rather
  // than through openAuthSessionAsync's return value -- for instance if the OS
  // evicted the app while the Custom Tab was in front. Without this, sign-in
  // silently does nothing in exactly that case.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url || !isAuthCallbackUrl(url)) return;
      void exchangeCodeFromUrl(url);
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  const signOut = useCallback(async () => {
    await doSignOut();
    // Don't wait for the listener: clearing immediately makes the redirect to
    // the sign-in screen feel instant.
    setSession(null);
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, user: session?.user ?? null, isLoading, signOut }),
    [session, isLoading, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside <SessionProvider>.');
  }
  return context;
}

/**
 * The signed-in user's id, for queries that need it.
 *
 * Throws when called outside an authenticated route -- which is a programming
 * error, since everything under `(tabs)` is behind the auth gate. Queries get a
 * definite `string` instead of `string | undefined`.
 */
export function useUserId(): string {
  const { user } = useSession();
  if (!user) throw new Error('useUserId called outside an authenticated route.');
  return user.id;
}
