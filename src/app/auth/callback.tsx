import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/SessionProvider';
import { colors } from '@/theme';

/**
 * Where Google sends the user back to, via `pfa://auth/callback`.
 *
 * This screen does no work: `SessionProvider`'s deep-link handler exchanges the
 * code for a session. But the redirect target has to *exist* as a route, or
 * expo-router matches nothing and renders `+not-found` — which is what the user
 * saw after a successful sign-in, since the session was established underneath
 * the error screen.
 *
 * Declared outside both guards in `_layout.tsx`, because it is reached while
 * still signed out and must survive the moment the session arrives.
 */

/**
 * How long to wait for the exchange before assuming it will not arrive. Long
 * enough for a slow network to finish, short enough that a failure does not
 * leave the user staring at a spinner with no way forward.
 */
const EXCHANGE_TIMEOUT_MS = 15_000;

export default function AuthCallbackScreen() {
  const { session, isLoading } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), EXCHANGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The happy path: the exchange landed and the guard has opened up.
  if (session) return <Redirect href="/(tabs)" />;

  // Nothing arrived. Send them back rather than spinning forever -- the error
  // itself is surfaced by the sign-in screen, which owns that reporting.
  if (timedOut && !isLoading) return <Redirect href="/(auth)/sign-in" />;

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
