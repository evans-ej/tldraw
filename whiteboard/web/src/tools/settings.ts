import { atom, TLDefaultColorStyle } from 'tldraw'

// Each tool keeps its own settings, separate from the pen's styles, so switching between the pen
// and the highlighter doesn't carry one tool's color or size over to the other.

export interface HighlighterSettings {
	color: TLDefaultColorStyle
	opacity: number
	/** Stroke width in screen pixels at 100% zoom. */
	size: number
}

export interface LaserSettings {
	color: string
	/** Trail width in screen pixels. */
	size: number
	/** How long the trail stays after you stop moving, in milliseconds. */
	trailMs: number
}

export interface EraserSettings {
	/** Diameter of the eraser circle, in screen pixels. */
	size: number
}

export interface SpotlightSettings {
	/** Radius of the follow-the-pointer spotlight, in screen pixels. */
	radius: number
	/** How dark everything outside the spotlight is, 0 to 1. */
	dim: number
}

function persisted<T extends object>(key: string, defaults: T) {
	let initial = defaults
	try {
		const saved = localStorage.getItem(key)
		if (saved) initial = { ...defaults, ...JSON.parse(saved) }
	} catch {
		// Private mode or corrupt data: fall back to the defaults.
	}
	const value = atom(key, initial)
	return {
		get: () => value.get(),
		update(patch: Partial<T>) {
			const next = { ...value.get(), ...patch }
			value.set(next)
			try {
				localStorage.setItem(key, JSON.stringify(next))
			} catch {
				// Settings still apply for this session.
			}
		},
	}
}

export const highlighterSettings = persisted<HighlighterSettings>('whiteboard.highlighter', {
	color: 'yellow',
	opacity: 0.8,
	size: 24,
})

export const laserSettings = persisted<LaserSettings>('whiteboard.laser', {
	color: '#ff2d2d',
	size: 6,
	trailMs: 1200,
})

export const eraserSettings = persisted<EraserSettings>('whiteboard.eraser', {
	size: 40,
})

export const spotlightSettings = persisted<SpotlightSettings>('whiteboard.spotlight', {
	radius: 160,
	dim: 0.7,
})

export const HIGHLIGHTER_COLORS: TLDefaultColorStyle[] = [
	'yellow',
	'light-green',
	'green',
	'light-blue',
	'blue',
	'light-violet',
	'violet',
	'light-red',
	'red',
	'orange',
]

export const LASER_COLORS = ['#ff2d2d', '#ff8a00', '#ffe600', '#22e05a', '#22b8ff', '#c04dff', '#ff3ea5']
