/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#FF4500',
          orangeDark: '#CC3700',
          blue: '#0079D3',
          lightBlue: '#7FBFFF',
          gray: '#DAE0E6',
          darkGray: '#1A1A1B',
          lightGray: '#F6F7F8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
