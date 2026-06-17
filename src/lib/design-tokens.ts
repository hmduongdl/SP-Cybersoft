export const colors = {
  primary: '#0050cb',
  'primary-gradient-end': '#0066ff',

  surface: '#faf8ff',
  'surface-bright': '#ffffff',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f2f3ff',
  'surface-container': '#eaedff',
  'surface-container-high': '#e0e4ff',
  'surface-container-highest': '#dae2fd',
  'surface-dim': '#d9d9e4',
  'surface-variant': '#e1e2ec',

  'on-surface': '#131b2e',
  'on-surface-variant': '#44495a',

  'primary-container': '#d8e2ff',
  'on-primary': '#ffffff',
  'primary-fixed': '#dae1ff',
  'primary-fixed-dim': '#b3c5ff',
  'on-primary-fixed': '#001849',
  'on-primary-fixed-variant': '#003fa4',

  'secondary-container': '#dde1f9',
  'on-secondary-container': '#191c2c',
  'secondary-fixed': '#dae1ff',
  'secondary-fixed-dim': '#b4c5fc',
  'on-secondary-fixed': '#031846',
  'on-secondary-fixed-variant': '#344574',

  tertiary: '#7b2400',
  'on-tertiary': '#ffffff',
  'tertiary-fixed': '#d5f8e8',
  'tertiary-fixed-dim': '#ffb59c',
  'on-tertiary-fixed': '#390c00',
  'on-tertiary-fixed-variant': '#832700',

  'error-container': '#ffdad6',
  'on-error-container': '#410002',
  error: '#ba1a1a',

  outline: '#737685',
  'outline-variant': '#c4c8da',

  background: '#faf8ff',
  'on-background': '#191b23',
  'inverse-surface': '#2e3038',
  'inverse-on-surface': '#f0f0fb',
  'inverse-primary': '#b3c5ff',
  'surface-tint': '#1155d0',
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  unit: '8px',
  gutter: '24px',
  'margin-mobile': '20px',
  'margin-desktop': '64px',
  'container-max': '1440px',
} as const;

export const borderRadius = {
  none: '0',
  DEFAULT: '0.25rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '20px',
  full: '9999px',
} as const;

export const fontFamily = {
  manrope: ['Manrope', 'sans-serif'],
  inter: ['Inter', 'sans-serif'],
} as const;

export const fontSize = {
  'headline-xl': ['48px', { lineHeight: '1.2', fontWeight: '700' }] as const,
  'headline-lg': ['32px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }] as const,
  'headline-lg-mobile': ['28px', { lineHeight: '1.25', fontWeight: '600' }] as const,
  'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }] as const,
  'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }] as const,
  'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }] as const,
  'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }] as const,
  'label-md': ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }] as const,
} as const;

export const gradients = {
  primary: 'linear-gradient(135deg, #0050cb, #0066ff)',
} as const;

export const shadows = {
  ambient: '0 20px 40px rgba(19, 27, 46, 0.06)',
  soft: '0 12px 30px rgba(15, 23, 42, 0.08)',
  card: '0 2px 8px rgba(19, 27, 46, 0.04)',
} as const;
