import { Platform } from 'react-native';

/** Bal / petek temalı palet. Açık ve koyu mod için aynı anahtarlar. */
const palette = {
  light: {
    bg: '#FFFBF3',
    surface: '#FFFFFF',
    surfaceAlt: '#FDF3DF',
    border: '#EBDFC6',
    text: '#2A2118',
    textMuted: '#8A7A63',
    primary: '#D98A0B',
    onPrimary: '#FFFFFF',
    primarySoft: '#FBEBC8',
    success: '#2F7D52',
    successSoft: '#DFF0E4',
    warning: '#B45309',
    warningSoft: '#FCE9CE',
    danger: '#B3372C',
    dangerSoft: '#F8DEDA',
    info: '#2C6B8F',
    infoSoft: '#DCEBF3',
    shadow: '#7A5C1E',
  },
  dark: {
    bg: '#14110C',
    surface: '#1E1A13',
    surfaceAlt: '#2A2318',
    border: '#3A3225',
    text: '#F5EDE0',
    textMuted: '#A3957E',
    primary: '#F0B429',
    onPrimary: '#241A05',
    primarySoft: '#3A2E14',
    success: '#5FBF84',
    successSoft: '#1C3527',
    warning: '#F59E0B',
    warningSoft: '#3A2A10',
    danger: '#E4695C',
    dangerSoft: '#3A1E1A',
    info: '#6FB2D6',
    infoSoft: '#162B36',
    shadow: '#000000',
  },
} as const;

export type ColorName = keyof (typeof palette)['light'];
export type Palette = Record<ColorName, string>;

export const Colors = palette;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
}) as { sans: string; rounded: string; mono: string };
