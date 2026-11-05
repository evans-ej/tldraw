import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	// Relative asset paths so the bundle loads from the app's custom URL scheme.
	base: './',
	plugins: [react()],
	// Pre-bundling breaks the `?url` asset imports in @tldraw/assets, so `npm run dev` crashed.
	optimizeDeps: { exclude: ['@tldraw/assets'] },
	build: {
		outDir: '../apple/Web',
		emptyOutDir: true,
	},
})
