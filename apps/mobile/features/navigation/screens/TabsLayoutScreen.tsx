import { Redirect } from 'expo-router';

import { CustomerTabsNavigator } from '../components/CustomerTabsNavigator';
import { useTabAccess } from '../hooks/useTabAccess';

export default function TabLayout() {
  const access = useTabAccess();
  if (access === 'login') return <Redirect href="/(auth)/login" />;
  if (access === 'worker') return <Redirect href="/(worker)" />;
  return access === 'customer' ? <CustomerTabsNavigator /> : null;
}
