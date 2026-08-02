import { Redirect } from 'expo-router';

import { WorkerTabsNavigator } from '../components/WorkerTabsNavigator';
import { useTabAccess } from '../hooks/useTabAccess';

export default function WorkerTabLayout() {
  const access = useTabAccess();
  if (access === 'login') return <Redirect href="/(auth)/login" />;
  if (access === 'customer') return <Redirect href="/(tabs)/home" />;
  return access === 'worker' ? <WorkerTabsNavigator /> : null;
}
