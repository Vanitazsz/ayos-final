import type { ComponentType } from 'react';

export type RadiusSliderProps = {
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
};

export const RadiusSlider: ComponentType<RadiusSliderProps>;
