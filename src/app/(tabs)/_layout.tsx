import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '@/theme';

/**
 * The five-slot bottom bar from the reference.
 *
 * The middle slot is not a tab — it is a raised primary button that opens the
 * "new transaction" modal. Adding money is the app's most frequent action, so
 * it gets the thumb-friendly centre position rather than a corner FAB.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: [
          styles.bar,
          {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: () => <AddButton />,
          // Intercept the press: this slot opens a modal rather than switching
          // tabs, so the underlying route is never actually shown.
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              onPress={() => router.push('/transaction/new')}
              style={styles.addSlot}
            >
              <AddButton />
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function AddButton() {
  return (
    <View style={[styles.addButton, shadows.raised]}>
      <Ionicons name="add" size={26} color={colors.onPrimary} />
    </View>
  );
}

export const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    // The reference floats the bar as a rounded surface above the page.
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.xs,
    ...Platform.select({
      android: { elevation: 12 },
      default: {
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
    }),
  },
  item: {
    paddingTop: spacing.xxs,
  },
  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift it above the bar, as in the reference.
    marginBottom: spacing.xs,
  },
});
