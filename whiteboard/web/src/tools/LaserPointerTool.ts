import { Editor, react, StateNode, TLStateNodeConstructor } from 'tldraw'
import { laserSettings } from './settings'

// Replaces tldraw's laser (same id, so its toolbar button and K shortcut still work) so the
// trail's color, width and length come from the laser panel.

class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		const parent = this.parent as LaserPointerTool
		this.parent.transition('lasering', parent.startScribble())
	}
}

class Lasering extends StateNode {
	static override id = 'lasering'

	private sessionId = ''
	private scribbleId = ''

	override onEnter(info: { sessionId: string; scribbleId: string }) {
		this.sessionId = info.sessionId
		this.scribbleId = info.scribbleId
		this.pushPoint()
	}

	override onPointerMove() {
		this.pushPoint()
	}

	override onTick() {
		this.editor.scribbles.extendSession(this.sessionId)
	}

	override onPointerUp() {
		this.complete()
	}

	override onCancel() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	private pushPoint() {
		// A stalled tab can let the session time out mid-stroke; adding to it then throws, so
		// carry on in a fresh session (same guard as tldraw's own laser, #10125).
		if (!this.editor.scribbles.isSessionActive(this.sessionId)) {
			const next = (this.parent as LaserPointerTool).startScribble()
			this.sessionId = next.sessionId
			this.scribbleId = next.scribbleId
		}
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
		this.editor.scribbles.addPointToSession(this.sessionId, this.scribbleId, x, y)
	}

	private complete() {
		if (this.editor.scribbles.isSessionActive(this.sessionId)) {
			this.editor.scribbles.complete(this.scribbleId)
		}
		this.parent.transition('idle')
	}
}

export class LaserPointerTool extends StateNode {
	static override id = 'laser'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Lasering]
	}

	private sessionId: string | null = null

	override onEnter() {
		// The glowing dot drawn by LaserDot stands in for the cursor.
		this.editor.setCursor({ type: 'none', rotation: 0 })
	}

	override onExit() {
		this.sessionId = null
	}

	override onCancel() {
		if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
			this.editor.scribbles.clearSession(this.sessionId)
			this.sessionId = null
			this.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}

	startScribble() {
		// Strokes drawn in quick succession share a session, so they fade out together.
		if (!this.sessionId || !this.editor.scribbles.isSessionActive(this.sessionId)) {
			this.sessionId = this.editor.scribbles.startSession({
				selfConsume: false,
				idleTimeoutMs: laserSettings.get().trailMs,
				fadeMode: 'grouped',
				fadeEasing: 'ease-in',
			})
		}
		const scribble = this.editor.scribbles.addScribbleToSession(this.sessionId, {
			color: 'laser',
			opacity: 0.9,
			size: laserSettings.get().size,
			taper: false,
		})
		return { sessionId: this.sessionId, scribbleId: scribble.id }
	}
}

/** Scribbles can only use theme colors, so the laser color is set on the theme's laser slot. */
export function registerLaserColor(editor: Editor) {
	return react('laser color', () => {
		const { color } = laserSettings.get()
		editor.updateThemes((themes) => {
			for (const theme of Object.values(themes)) {
				if (!theme) continue
				theme.colors.light.laser = color
				theme.colors.dark.laser = color
			}
			return themes
		})
	})
}
