import Slider from '@react-native-community/slider';

import type { RadiusSliderProps } from './RadiusSlider';

export function RadiusSlider(props: RadiusSliderProps) {
  return <Slider style={{ width: '100%', height: 40 }} {...props} />;
}
