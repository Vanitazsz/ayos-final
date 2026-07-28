import type { ChangeEvent } from 'react';

import type { RadiusSliderProps } from './RadiusSlider';

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
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(event.currentTarget.value));
  };

  return (
    <input
      aria-label="Service radius in kilometers"
      type="range"
      min={minimumValue}
      max={maximumValue}
      step={step}
      value={value}
      onChange={handleChange}
      style={{
        width: '100%',
        height: 40,
        margin: 0,
        accentColor: thumbTintColor || minimumTrackTintColor,
        backgroundColor: maximumTrackTintColor,
        cursor: 'pointer',
      }}
    />
  );
}
