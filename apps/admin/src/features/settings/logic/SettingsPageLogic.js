export { subscribe } from '../../../services/realtime';
export { loadSettings, saveSetting } from '../../../services/settings';

export const titleCase = (value) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase());

export const matchingWeightsTotalPercent = (weights) =>
  Math.round(
    Object.values(weights).reduce(
      (sum, value) => sum + Number(value),
      0,
    ) * 100,
  );
