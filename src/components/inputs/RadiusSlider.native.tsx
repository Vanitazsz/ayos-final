import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import type { RadiusSliderProps } from './RadiusSlider';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 28;

export function RadiusSlider({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
}: RadiusSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const startXRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const range = maximumValue - minimumValue;
  const clamped = range > 0 ? Math.min(1, Math.max(0, (value - minimumValue) / range)) : 0;
  const thumbLeft = Math.max(0, (trackWidth - THUMB_SIZE) * clamped);

  const updateFromX = useCallback(
    (x: number) => {
      const usable = Math.max(1, trackWidth - THUMB_SIZE);
      const rawFraction = Math.min(1, Math.max(0, x / usable));
      const rawValue = minimumValue + rawFraction * range;
      const stepped = Math.round(rawValue / step) * step;
      const next = Math.min(maximumValue, Math.max(minimumValue, stepped));
      if (next !== valueRef.current) onValueChange(next);
    },
    [trackWidth, minimumValue, range, step, maximumValue, onValueChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          startXRef.current = event.nativeEvent.locationX;
          updateFromX(startXRef.current);
        },
        onPanResponderMove: (_event, gestureState) => {
          updateFromX(startXRef.current + gestureState.dx);
        },
      }),
    [updateFromX],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Service radius in kilometers"
      accessibilityValue={{
        min: minimumValue,
        max: maximumValue,
        now: value,
        text: `${value} kilometers`,
      }}
    >
      <View style={styles.trackWrap}>
        <View
          style={[
            styles.track,
            { backgroundColor: maximumTrackTintColor },
          ]}
        />
        <View
          style={[
            styles.track,
            styles.trackFill,
            {
              width: trackWidth > 0 ? thumbLeft + THUMB_SIZE / 2 : 0,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: thumbTintColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  trackWrap: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackFill: {
    left: 0,
    right: undefined,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
