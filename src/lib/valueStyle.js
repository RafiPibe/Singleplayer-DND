const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getValueStyle = (value, maxAbs) => {
  if (value === 0 || value === null || value === undefined || !maxAbs) return undefined;
  const strength = clamp(Math.abs(value) / maxAbs, 0, 1);
  const saturation = 35 + strength * 55;
  const lightness = 58 - strength * 8;
  const hue = value > 0 ? 130 : 6;
  return { color: `hsl(${hue}, ${saturation}%, ${lightness}%)` };
};
