import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PillButton, Screen } from '@/components/ui';
import { signInWithGoogle } from '@/features/auth/google';
import { colors, radius, spacing, text } from '@/theme';

/**
 * The only unauthenticated screen. Google is the sole provider, so there is one
 * button and no form.
 */
export default function SignInScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);

    const result = await signInWithGoogle();

    // On success the auth listener in SessionProvider redirects us, so leave
    // the spinner running rather than flashing an idle button mid-navigation.
    if (result.status === 'error') {
      setError(result.message);
      setIsSigningIn(false);
    } else if (result.status === 'cancelled') {
      // Backing out of the Google sheet is a normal choice, not a failure.
      setIsSigningIn(false);
    }
  };

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Ionicons name="wallet" size={30} color={colors.onPrimary} />
          </View>

          <View style={styles.copy}>
            <Text style={text.h1}>Your money, clearly</Text>
            <Text style={[text.body, styles.subtitle]}>
              Track income and spending, see where it goes, and keep your own books private — even
              on a shared family app.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PillButton
            label="Continue with Google"
            icon="logo-google"
            onPress={handleSignIn}
            loading={isSigningIn}
          />

          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={16} color={colors.negative} />
              <Text style={[text.caption, styles.errorText]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[text.tiny, styles.legal]}>
            Only your own transactions are ever visible to you.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxxl * 2,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    gap: spacing.xxl,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.negativeBg,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.negative,
  },
  legal: {
    textAlign: 'center',
    color: colors.textMuted,
  },
});
