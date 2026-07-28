import React from 'react';
import { Image, View, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface AvatarProps {
  uri?: string;
  size?: number;
  borderRadius?: number;
  style?: ImageStyle;
  fallback?: React.ReactNode;
}

export const Avatar = React.memo(function Avatar({
  uri,
  size = 48,
  borderRadius,
  style,
  fallback,
}: AvatarProps) {
  const r = borderRadius ?? size / 2;

  if (!uri) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: r }, style]}>
        {fallback}
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: r }, style]}
    />
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.border,
    resizeMode: 'cover',
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
