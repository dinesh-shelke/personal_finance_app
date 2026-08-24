import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Off for screens owning their own list. */
  scroll?: boolean;
  /** Adds horizontal gutters. Off when a child list needs to bleed to the edge. */
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra bottom room so the tab bar never covers the last row. */
  bottomInset?: number;
};

/**
 * Standard screen shell: the lavender background from the reference, safe-area
 * handling, and consistent gutters. Every route renders inside one of these so
 * padding never drifts between screens.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  onRefresh,
  refreshing = false,
  style,
  contentContainerStyle,
  bottomInset = 0,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[padded && styles.padded, !scroll && styles.fill, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }, style]}>
      {/* Dark icons: the background is light on every screen. */}
      <StatusBar style="dark" />
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom + bottomInset + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
