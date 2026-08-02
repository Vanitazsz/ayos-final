import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { theme } from '@/constants/theme';
import { useIndexController } from '../hooks/useIndexController';
import { styles } from './IndexScreen.styles';

export default function Index() {
  const { isAuthenticated, isLoading } = useIndexController();
  if (isLoading)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/login'} />;
}
