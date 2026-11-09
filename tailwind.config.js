/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
        padding: {
            DEFAULT: '15px'
        }
    },
    screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1300px'
    },
    extend: {
        colors: {
            primary: {
                DEFAULT: 'hsl(var(--primary))',
                foreground: 'hsl(var(--primary-foreground))'
            },
            secondary: {
                DEFAULT: 'hsl(var(--secondary))',
                foreground: 'hsl(var(--secondary-foreground))'
            },
            accent: {
                DEFAULT: 'hsl(var(--accent))',
                // 👇 CHANGED: Red hover to Sky Blue hover
                hover: '#70c1e3', 
                foreground: 'hsl(var(--accent-foreground))'
            },
            body: '#dedede',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            card: {
                DEFAULT: 'hsl(var(--card))',
                foreground: 'hsl(var(--card-foreground))'
            },
            popover: {
                DEFAULT: 'hsl(var(--popover))',
                foreground: 'hsl(var(--popover-foreground))'
            },
            muted: {
                DEFAULT: 'hsl(var(--muted))',
                foreground: 'hsl(var(--muted-foreground))'
            },
            destructive: {
                DEFAULT: 'hsl(var(--destructive))',
                foreground: 'hsl(var(--destructive-foreground))'
            },
            custom_red: {
                // 👇 CHANGED: Red to Green Blue (Keeping the name to save you time)
                DEFAULT: '#06c668', 
                foreground: 'hsl(var(--destructive-foreground))'
            },
            border: 'hsl(var(--border))',
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
            chart: {
                '1': 'hsl(var(--chart-1))',
                '2': 'hsl(var(--chart-2))',
                '3': 'hsl(var(--chart-3))',
                '4': 'hsl(var(--chart-4))',
                '5': 'hsl(var(--chart-5))'
            }
        },
        borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)'
        },
        keyframes: {
            marquee: {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(calc(-100% - var(--gap)))' }
            },
            'marquee-vertical': {
                from: { transform: 'translateY(0)' },
                to: { transform: 'translateY(calc(-100% - var(--gap)))' }
            }
        },
        animation: {
            marquee: 'marquee var(--duration) infinite linear',
            'marquee-vertical': 'marquee-vertical var(--duration) linear infinite'
        }
    }
  },
  plugins: [require("tailwindcss-animate")],
}