import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, PillButton, Screen, SectionHeader } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { colors, radius, spacing, text } from '@/theme';

import { TAB_BAR_HEIGHT } from './_layout';

/**
 * Profile and settings.
 *
 * Sign-out is live from M2 so the two-user isolation test can be run by hand on
 * a device. Editable name/currency/privacy settings arrive with M7.
 */
export default function ProfileScreen() {
  const { user, signOut } = useSession();

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? 'Signed in';
  const email = user?.email ?? '—';

  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color={colors.primary} />
        </View>
        <View style={styles.identity}>
          <Text style={text.h2} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={text.caption} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      <SectionHeader title="Settings" />
      <Card padding="sm">
        <ListRow
          icon="cash-outline"
          title="Currency"
          subtitle="Indian Rupee (INR)"
          showChevron
          onPress={() => {}}
        />
        <View style={styles.divider} />
        <ListRow
          icon="wallet-outline"
          title="Accounts"
          subtitle="Manage your wallets"
          showChevron
          onPress={() => {}}
        />
        <View style={styles.divider} />
        <ListRow
          icon="pricetags-outline"
          title="Categories"
          subtitle="Income and expense categories"
          showChevron
          onPress={() => {}}
        />
      </Card>

      <View style={styles.signOut}>
        <PillButton label="Sign out" variant="secondary" icon="log-out-outline" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  signOut: {
    marginTop: spacing.xl,
  },
});
