// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#8B5CF6', // 主紫色
            light: '#A78BFA',
            dark: '#7C3AED',
          },
          accent: {
            rose: '#60A5FA',
            green: '#34D399',
            pink: '#F472B6',
            yellow: '#FBBF24',
          },
          surface: {
            DEFAULT: '#FFFFFF',
            secondary: '#F9FAFB',
            tertiary: '#F3F4F6',
          },
          border: {
            DEFAULT: '#E5E7EB',
            light: '#F3F4F6',
          },
        }
      },
    },
    plugins: [],
    extend: 
    {
        colors: {
          'gray-50': '#F6F6F6',
        },
    }
  }