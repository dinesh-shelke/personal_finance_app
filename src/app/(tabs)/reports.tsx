import { EmptyState, Screen } from '@/components/ui';

import { TAB_BAR_HEIGHT } from './_layout';

export default function ReportsScreen() {
  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT}>
      <EmptyState
        icon="pie-chart-outline"
        title="Reports are coming"
        message="Charts, trends and CSV export are scheduled after v1."
      />
    </Screen>
  );
}
