import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen>
      <EmptyState
        icon="help-circle-outline"
        title="Page not found"
        message="That screen does not exist."
        actionLabel="Go home"
        onAction={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
