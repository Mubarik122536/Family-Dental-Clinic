/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1a2b5f',
                    50: '#eef2ff',
                    100: '#dce4ff',
                    200: '#b9c9ff',
                    300: '#8ba3f5',
                    400: '#5b7be8',
                    500: '#3958d4',
                    600: '#1a2b5f',
                    700: '#152350',
                    800: '#101b3d',
                    900: '#0b1229',
                },
                accent: {
                    DEFAULT: '#56b8d9',
                    50: '#ecfaff',
                    100: '#d4f3ff',
                    200: '#a8e7ff',
                    300: '#7dd9f5',
                    400: '#56b8d9',
                    500: '#3a9fc2',
                    600: '#2a7f9e',
                    700: '#1f6480',
                },
                background: '#f5f6f8',
                surface: '#ffffff',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '1rem',
                xl: '1.5rem',
                full: '9999px',
            },
            keyframes: {
                'slide-up': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-down': {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            animation: {
                'slide-up': 'slide-up 0.3s ease-out',
                'slide-down': 'slide-down 0.3s ease-out',
            },
            padding: {
                'safe': 'env(safe-area-inset-bottom)',
            },
        },
    },
    plugins: [],
}
