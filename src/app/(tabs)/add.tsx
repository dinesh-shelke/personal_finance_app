import { EmptyState, Screen } from '@/components/ui';

import { TAB_BAR_HEIGHT } from './_layout';

export default function AddScreen() {
  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT}>
      <EmptyState
        icon="add-circle-outline"
        title="Opening the add sheet"
        message="This tab slot opens a modal, so this screen is never shown."
      />
    </Screen>
  );
}
