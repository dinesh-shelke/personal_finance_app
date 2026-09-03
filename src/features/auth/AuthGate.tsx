import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/features/auth/SessionProvider';
import { colors } from '@/theme';

/**
 * Routes between the signed-out and signed-in halves of the app.
 *
 * The signed-in screens are declared inside a guard rather than redirected to
 * from an effect. An effect runs only after the commit, so a redirect written
 * that way is always one render too late: on a cold start with no persisted
 * session the router mounts `/` -> `(tabs)/index` first, and the dashboard's
 * `useUserId()` throws before the redirect can fire. Screens behind a false
 * guard are absent from the tree, so they cannot mount at all.
 *
 * The `key` is the other half of the same problem. Flipping a guard removes
 * the screens, but a mounted screen can still re-render once with the new
 * (null) session before the navigator unmounts it — which is the same throw,
 * on sign-out instead of on launch. Re-keying makes React discard the old tree
 * outright rather than render it again. It only changes when signed-in state
 * itself changes, so a token refresh does not remount the app.
 *
 * Lives here rather than inside `app/_layout.tsx` so the guard can be tested
 * without mounting the font loader and splash-screen side effects that the
 * root layout owns. See `__tests__/AuthGate.test.tsx`.
 */
export function AuthGate() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      key={session ? 'authenticated' : 'anonymous'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="accounts" />

        <Stack.Screen name="categories" />

        <Stack.Screen
          name="transaction"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Protected>

      {/*
        Outside both guards on purpose: the OAuth redirect lands here while the
        user is still signed out, and the screen must survive the instant the
        session arrives. Behind either guard it would vanish mid-exchange.

        Declared LAST, not first. The stack anchors on its first declared
        screen when the incoming URL does not resolve to one, so putting the
        callback at the top made every cold start open on this spinner
        regardless of session. `AuthGate.test.tsx` pins the ordering.
      */}
      <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
