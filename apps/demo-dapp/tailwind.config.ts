import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic palette per blue theme
        brand: {
          blue: '#45AEF5',
          green: '#39CC83',
          orange: '#F5A73B',
          red: '#FF4766',
          purple: '#7665E5',
        },
        surface: {
          page: '#10161F',
          transparent: '#10161FF5', // from ARGB #F510161F
          content: '#1D2633',
          tint: '#2E3847',
          attention: '#424C5C',
          highlighted: '#C2DAFF14', // from ARGB #14C2DAFF
          overlay: {
            strong: '#000000B8', // from ARGB #B8000000
            light: '#0000007A',  // from ARGB #7A000000
            xlight: '#0000003D', // from ARGB #3D000000
          },
        },
        ink: {
          primary: '#FFFFFF',
          secondary: '#8994A3',
          tertiary: '#556170',
          accent: '#45AEF5',
          alt: '#10161F',
        },
        icon: {
          primary: '#FFFFFF',
          secondary: '#8994A3',
          tertiary: '#556170',
          alt: '#10161F',
        },
        button: {
          // Primary
          'primary': '#45AEF5',
          'primary-disabled': '#378AC2',
          'primary-hover': '#5BB8F6',
          'primary-fg': '#FFFFFF',
          // Secondary
          'secondary': '#1D2633',
          'secondary-disabled': '#171F29',
          'secondary-hover': '#222C3B',
          'secondary-fg': '#FFFFFF',
          // Tertiary
          'tertiary': '#2E3846',
          'tertiary-disabled': '#28303D',
          'tertiary-hover': '#364052',
          'tertiary-fg': '#FFFFFF',
          // Accents
          'green': '#39CC83',
          'green-disabled': '#2B9962',
          'green-hover': '#49CC8B',
          'orange': '#F5A73B',
          'orange-disabled': '#D68B2F',
          'orange-hover': '#FFC25E',
        },
        field: {
          bg: '#1D2633',
          active: '#45AEF5',
          error: '#FF4766',
          'error-bg': '#241A25',
        },
        tabbar: {
          active: '#45AEF5',
          inactive: '#8994A3',
        },
        separator: {
          common: '#C2DAFF14', // from ARGB #14C2DAFF
          alt: '#FFFFFF14',    // from ARGB #14FFFFFF
        },
      },
    },
  },
  plugins: [],
};

export default config;