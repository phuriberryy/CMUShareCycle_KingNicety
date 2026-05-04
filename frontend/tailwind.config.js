/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Fresh forest — readable on white, less “flat mud” than pure Pantone screen hex
        primary: {
          DEFAULT: '#2A6B52',
          light: '#E8F2EC',
          dark: '#1B4332',
          bright: '#3D9270',
        },
        muted: '#556B62',
        surface: '#F0F6F3',
        'surface-light': '#FAFCFB',
      },
      boxShadow: {
        soft: '0 24px 48px -12px rgba(27, 67, 50, 0.14)',
        card: '0 4px 24px -4px rgba(42, 107, 82, 0.08), 0 1px 3px rgba(15, 40, 30, 0.05)',
        elevated:
          '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 12px 32px -8px rgba(27, 67, 50, 0.1)',
        'elevated-hover':
          '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 20px 44px -12px rgba(42, 107, 82, 0.16)',
        'glow-primary': '0 8px 28px -6px rgba(42, 107, 82, 0.38)',
      },
      borderRadius: {
        xl: '1.5rem',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'Noto Sans Thai', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
    },
  },
  plugins: [],
}
