import { EmptyState, Screen } from '@/components/ui';

import { TAB_BAR_HEIGHT } from './_layout';

export default function HistoryScreen() {
  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT}>
      <EmptyState
        icon="receipt-outline"
        title="Your transaction history"
        message="Grouped by day with filters and search. Arrives with milestone M5."
      />
    </Screen>
  );
}
