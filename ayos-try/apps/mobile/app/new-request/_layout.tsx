import { Stack } from 'expo-router';

export default function NewRequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="issue-summary" />
      <Stack.Screen name="matching" />
    </Stack>
  );
}
