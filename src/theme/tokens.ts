/**
 * Design tokens extracted from `Theme_refrence.webp`.
 *
 * Rule: no component may hard-code a colour, radius, or spacing value.
 * Everything reads from here so a palette change is a one-file change.
 */

export const colors = {
  /** Screen background — the faint lavender-grey behind every card. */
  bg: '#F4F5FA',
  /** Cards, sheets, secondary buttons. */
  surface: '#FFFFFF',
  /** Inset rows and chips sitting *on* a white card. */
  surfaceAlt: '#F7F8FC',

  /** The deep teal-navy of the primary pill buttons. */
  primary: '#0B3B4C',
  primaryDark: '#082D3B',
  /** 12% primary — selected chips, icon bubbles. */
  primarySoft: '#E7EDF0',
  onPrimary: '#FFFFFF',

  textPrimary: '#0F1B2A',
  textSecondary: '#8A94A6',
  textMuted: '#AEB6C4',
  onPrimaryMuted: '#B4C6CE',

  /** Income / gains — the mint "▲ 2%" badges. */
  positive: '#12B76A',
  positiveBg: '#E7F8F0',
  /** Expenses / losses — the rose "▼ 1,2%" badges. */
  negative: '#F04438',
  negativeBg: '#FEECEB',
  /** Transfers — neutral, so they never read as income or spend. */
  neutral: '#6B7A99',
  neutralBg: '#EEF1F7',

  warning: '#F79009',
  warningBg: '#FFF6ED',

  border: '#E9ECF3',
  borderStrong: '#D7DCE7',
  /** Modal scrim. */
  overlay: 'rgba(15, 27, 42, 0.45)',
} as const;

/** Palette used to colour user-created accounts and categories. */
export const swatches = [
  '#0B3B4C',
  '#2E90FA',
  '#12B76A',
  '#F79009',
  '#F04438',
  '#7A5AF8',
  '#EE46BC',
  '#15B79E',
  '#6B7A99',
  '#854A0E',
] as const;

/** 4pt base scale. Use `spacing.md`, never a bare number. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  input: 16,
  card: 24,
  sheet: 28,
  pill: 999,
} as const;

/**
 * Android renders `elevation`; iOS/web render the shadow* props. Both are set
 * so the soft card lift in the reference survives on every platform.
 */
export const shadows = {
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  raised: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
} as const;

/** Minimum touch target — below this, taps get missed on a phone. */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const controlHeight = { pill: 52, input: 52, chip: 36 } as const;

export const theme = {
  colors,
  swatches,
  spacing,
  radius,
  shadows,
  hitSlop,
  controlHeight,
} as const;

export type Theme = typeof theme;
