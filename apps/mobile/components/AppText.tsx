import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { Typography, Colors } from '@/constants/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySm' | 'caption' | 'label' | 'button' | 'overline';
type Weight = 'regular' | 'medium' | 'semiBold' | 'bold';

interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  align?: 'auto' | 'left' | 'center' | 'right' | 'justify';
}

const variantStyles: Record<Variant, TextStyle> = {
  h1: { fontSize: Typography['5xl'], lineHeight: Typography['5xl'] * Typography.lineHeightTight, fontWeight: Typography.bold },
  h2: { fontSize: Typography['4xl'], lineHeight: Typography['4xl'] * Typography.lineHeightTight, fontWeight: Typography.bold },
  h3: { fontSize: Typography['3xl'], lineHeight: Typography['3xl'] * Typography.lineHeightTight, fontWeight: Typography.semiBold },
  h4: { fontSize: Typography.xl, lineHeight: Typography.xl * Typography.lineHeightTight, fontWeight: Typography.semiBold },
  body: { fontSize: Typography.lg, lineHeight: Typography.lg * Typography.lineHeightNormal, fontWeight: Typography.regular },
  bodySm: { fontSize: Typography.base, lineHeight: Typography.base * Typography.lineHeightNormal, fontWeight: Typography.regular },
  caption: { fontSize: Typography.sm, lineHeight: Typography.sm * Typography.lineHeightNormal, fontWeight: Typography.regular },
  label: { fontSize: Typography.base, lineHeight: Typography.base * Typography.lineHeightTight, fontWeight: Typography.medium },
  button: { fontSize: Typography.lg, lineHeight: Typography.lg * Typography.lineHeightTight, fontWeight: Typography.semiBold },
  overline: { fontSize: Typography.xs, lineHeight: Typography.xs * Typography.lineHeightTight, fontWeight: Typography.bold, textTransform: 'uppercase', letterSpacing: 1 },
};

const weightMap: Record<Weight, string> = {
  regular: Typography.regular,
  medium: Typography.medium,
  semiBold: Typography.semiBold,
  bold: Typography.bold,
};

export const AppText = React.memo(function AppText({
  variant = 'body',
  weight,
  color = Colors.textPrimary,
  align,
  style,
  ...props
}: AppTextProps) {
  const vStyle = variantStyles[variant];
  const resolvedWeight = weight ? weightMap[weight] : vStyle.fontWeight;
  return (
    <Text
      style={[
        vStyle,
        { fontWeight: resolvedWeight as TextStyle['fontWeight'], color },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...props}
    />
  );
});
