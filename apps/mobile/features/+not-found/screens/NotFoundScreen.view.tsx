import { styles } from './NotFoundScreen.styles';
import { Text, View } from 'react-native';
import type { useNotFoundScreenController } from '../hooks/useNotFoundScreenController';

export function NotFoundView({
  model,
}: {
  model: ReturnType<typeof useNotFoundScreenController>;
}) {
  const { Link, Stack } = model;
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
