import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

// Hold the native splash until fonts are ready, so the first frame is never
// unstyled text. Failure here is non-fatal — worst case the splash auto-hides.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Hide on error too: shipping the system font beats an app stuck on splash.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <AuthGate />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

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
 */
function AuthGate() {
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
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
