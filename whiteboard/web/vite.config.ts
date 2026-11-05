import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	// Relative asset paths so the bundle loads from the app's custom URL scheme.
	base: './',
	plugins: [react()],
	build: {
		outDir: '../apple/Web',
		emptyOutDir: true,
	},
})
