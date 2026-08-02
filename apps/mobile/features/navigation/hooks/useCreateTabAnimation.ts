import { useRef } from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';

export function useCreateTabAnimation() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    router.push('/new-request/create');
  };
  return { handlePressIn, handlePressOut, scale };
}
