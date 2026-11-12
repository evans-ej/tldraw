import { Editor, TLHighlightShape } from 'tldraw'
import { highlighterSettings } from './settings'

// tldraw draws a size "m" highlight at theme.fontSize × 1.5 × 1.12 (HighlightShapeUtil). Scaling from
// that base gives the highlighter a continuous size instead of tldraw's four steps.
const SIZE_M_FACTOR = 1.5 * 1.12

/** Gives new highlighter strokes the highlighter panel's color, opacity and size. */
export function registerHighlighter(editor: Editor) {
	return editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
		// Only strokes drawn now: pasted, duplicated or synced highlights keep their own look.
		if (shape.type !== 'highlight' || source !== 'user' || !editor.isIn('highlight')) return shape
		const highlight = shape as TLHighlightShape
		const { color, opacity, size } = highlighterSettings.get()
		const base = editor.getCurrentTheme().fontSize * SIZE_M_FACTOR
		return {
			...highlight,
			opacity,
			props: {
				...highlight.props,
				color,
				size: 'm',
				scale: highlight.props.scale * (size / base),
			},
		}
	})
}
