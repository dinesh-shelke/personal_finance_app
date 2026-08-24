import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors, text } from '@/theme';

type DonutRingProps = {
  /** 0–1. Values outside the range are clamped rather than overdrawn. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Centre label. Defaults to the rounded percentage. */
  label?: string;
  showLabel?: boolean;
};

/**
 * The progress ring from the reference's "Your target … 61%" card.
 *
 * Drawn with a stroke-dashoffset arc rather than a Path, so the sweep is one
 * number to animate later and there is no arc-flag maths to get wrong.
 */
export function DonutRing({
  progress,
  size = 56,
  strokeWidth = 6,
  color = colors.primary,
  trackColor = colors.border,
  label,
  showLabel = true,
}: DonutRingProps) {
  const clamped = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;

  const percentLabel = label ?? `${Math.round(clamped * 100)}%`;

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size}>
        {/* Rotate so the arc starts at 12 o'clock instead of 3 o'clock. */}
        <G rotation={-90} origin={`${centre}, ${centre}`}>
          <Circle
            cx={centre}
            cy={centre}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={centre}
            cy={centre}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
          />
        </G>
      </Svg>

      {showLabel ? (
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={[text.tiny, styles.label, { fontSize: size < 48 ? 9 : 11 }]}>
            {percentLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textPrimary,
  },
});
