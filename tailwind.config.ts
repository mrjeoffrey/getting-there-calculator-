
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				sky: {
					50: '#f0f9ff',
					100: '#e0f2fe',
					200: '#bae6fd',
					300: '#7dd3fc',
					400: '#38bdf8',
					500: '#0ea5e9',
					600: '#0284c7',
					700: '#0369a1',
					800: '#075985',
					900: '#0c4a6e',
				},
				amber: {
					50: '#fffbeb',
					100: '#fef3c7',
					200: '#fde68a',
					300: '#fcd34d',
					400: '#fbbf24',
					500: '#f59e0b',
					600: '#d97706',
					700: '#b45309',
					800: '#92400e',
					900: '#78350f',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-down': {
					'0%': { transform: 'translateY(-20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'plane-move': {
					'0%': { transform: 'translateX(0) translateY(0) rotate(0deg)' },
					'50%': { transform: 'translateX(calc(var(--travel-x) / 2)) translateY(calc(var(--travel-y) / 2 - 20px)) rotate(var(--rotate-deg))' },
					'100%': { transform: 'translateX(var(--travel-x)) translateY(var(--travel-y)) rotate(var(--rotate-deg))' }
				},
				'pulse-marker': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.2)', opacity: '0.8' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'flight-dot': {
					'0%': { strokeDashoffset: '1000' },
					'100%': { strokeDashoffset: '0' }
				},
				// New animation keyframes
				'draw-path': {
					'0%': { strokeDashoffset: '1000' },
					'100%': { strokeDashoffset: '0' }
				},
				'zoom-to-point': {
					'0%': { transform: 'scale(4)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'fly-along-path': {
					'0%': { offsetDistance: '0%', opacity: '0.5' },
					'10%': { opacity: '1' },
					'90%': { opacity: '1' },
					'100%': { offsetDistance: '100%', opacity: '0.5' }
				},
				'pulse-plane': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)' }
				},
				'takeoff': {
					'0%': { transform: 'translateY(0) scale(0.9)', opacity: '0.5' },
					'30%': { transform: 'translateY(-10px) scale(1.1)', opacity: '1' },
					'100%': { transform: 'translateY(-5px) scale(1)', opacity: '1' }
				},
				// Enhanced animation keyframes
				'map-zoom': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.5)', opacity: '0.7' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'path-draw': {
					'0%': { strokeDashoffset: '1000', opacity: '0.3' },
					'100%': { strokeDashoffset: '0', opacity: '1' }
				},
				'marker-pulse': {
					'0%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(255,255,255,0.4)' },
					'70%': { transform: 'scale(1.5)', opacity: '0.5', boxShadow: '0 0 0 10px rgba(255,255,255,0)' },
					'100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(255,255,255,0)' }
				},
				'tracking-dot': {
					'0%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(100px)', opacity: '0' }
				},
				'completion-check': {
					'0%': { transform: 'scale(0)', opacity: '0' },
					'60%': { transform: 'scale(1.2)', opacity: '1' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'takeoff-effect': {
					'0%': { transform: 'scale(1)', opacity: '0.8' },
					'50%': { transform: 'scale(1.5)', opacity: '0.4' },
					'100%': { transform: 'scale(1)', opacity: '0.8' }
				},
				'landing-effect': {
					'0%': { transform: 'scale(1.5)', opacity: '0.3' },
					'100%': { transform: 'scale(0.8)', opacity: '0.7' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.4s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'slide-down': 'slide-down 0.4s ease-out',
				'plane-move': 'plane-move 3s ease-in-out forwards',
				'pulse-marker': 'pulse-marker 2s ease-in-out infinite',
				'flight-dot': 'flight-dot 2s linear forwards',
				// New animations
				'draw-path': 'draw-path 2s ease-out forwards',
				'zoom-to-point': 'zoom-to-point 1.5s ease-out',
				'fly-along-path': 'fly-along-path 5s linear forwards',
				'pulse-plane': 'pulse-plane 2s infinite',
				'takeoff': 'takeoff 1s ease-out forwards',
				// Enhanced animations
				'map-zoom': 'map-zoom 2s ease-in-out',
				'path-draw': 'path-draw 3s linear forwards',
				'marker-pulse': 'marker-pulse 1.5s infinite',
				'tracking-dot': 'tracking-dot 1s linear infinite',
				'completion-check': 'completion-check 0.5s ease-out',
				'takeoff-effect': 'takeoff-effect 1s infinite',
				'landing-effect': 'landing-effect 1s ease-out'
			},
			backgroundImage: {
				'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1))',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
