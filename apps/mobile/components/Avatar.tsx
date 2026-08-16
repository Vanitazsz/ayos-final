import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { getInitials } from '@/utils/format';

interface AvatarProps {
  uri?: string;
  size?: number;
  borderRadius?: number;
  style?: ImageStyle;
  fallback?: React.ReactNode;
  name?: string;
}

export const Avatar = React.memo(function Avatar({
  uri,
  size = 48,
  borderRadius,
  style,
  fallback,
  name,
}: AvatarProps) {
  const r = borderRadius ?? size / 2;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (!uri || imageFailed) {
    const initials = name ? getInitials(name) : null;
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: r },
          style,
        ]}
      >
        {initials ? (
          <Text
            style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}
          >
            {initials}
          </Text>
        ) : (
          fallback
        )}
      </View>
    );
  }

  const borderWidth =
    typeof style?.borderWidth === 'number' ? style.borderWidth : 0;
  const innerSize = size - borderWidth * 2;

  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: r },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        onError={() => setImageFailed(true)}
        style={[
          styles.image,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.border,
    resizeMode: 'cover',
  },
  ring: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
