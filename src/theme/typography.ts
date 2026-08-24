import { StyleSheet } from 'react-native';

import { colors } from './tokens';

/**
 * Inter, matching the reference: very large bold numerals for balances,
 * medium-weight body text, and muted small caps-ish labels.
 *
 * Family names come from `@expo-google-fonts/inter` and are registered in
 * `src/app/_layout.tsx`. Until the fonts load the app renders nothing, so
 * these names are always resolvable at paint time.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const text = StyleSheet.create({
  /** The headline balance, e.g. "$21,535.00". */
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  /** The oversized amount on the numpad entry screen. */
  displayLg: {
    fontFamily: fonts.bold,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.2,
    color: colors.textPrimary,
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  h3: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  bodyRegular: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  /** Row subtitles, "Market Fund" / "Stock" in the reference. */
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  /** Section labels above cards, e.g. "Portfolio value". */
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  tiny: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: colors.onPrimary,
  },
});
