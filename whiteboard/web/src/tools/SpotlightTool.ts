import { atom, Box, Editor, TLPageId, TLShapeId, StateNode, Vec } from 'tldraw'

export type SpotlightTarget =
	| { kind: 'shape'; id: TLShapeId }
	| { kind: 'area'; box: Box }

interface SpotlightState {
	pageId: TLPageId | null
	targets: SpotlightTarget[]
	/** The area being dragged out right now, in page space. */
	draft: Box | null
}

export const spotlightState = atom<SpotlightState>('spotlight', {
	pageId: null,
	targets: [],
	draft: null,
})

/** Targets for the page on screen. A spotlight set on another page stays with that page. */
export function getSpotlightTargets(editor: Editor) {
	const { pageId, targets } = spotlightState.get()
	if (pageId !== editor.getCurrentPageId()) return []
	return targets.filter((t) => t.kind === 'area' || editor.getShape(t.id))
}

export function clearSpotlight() {
	spotlightState.set({ pageId: null, targets: [], draft: null })
}

function setTargets(editor: Editor, targets: SpotlightTarget[]) {
	spotlightState.set({ pageId: editor.getCurrentPageId(), targets, draft: null })
}

/**
 * Click an item to spotlight it, shift-click to add more, drag to spotlight an area, click empty
 * board to clear. With nothing picked, a round spotlight follows the pointer.
 * The spotlight stays on after switching tools, so you can draw or point inside it.
 */
export class SpotlightTool extends StateNode {
	static override id = 'spotlight'
	static override isLockable = false

	private origin: Vec | null = null
	private isDragging = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.origin = null
		this.isDragging = false
		spotlightState.update((s) => ({ ...s, draft: null }))
	}

	override onPointerDown() {
		this.origin = this.editor.inputs.getCurrentPagePoint().clone()
		this.isDragging = false
	}

	override onPointerMove() {
		if (!this.origin) return
		if (!this.isDragging && !this.editor.inputs.getIsDragging()) return
		this.isDragging = true
		const draft = Box.FromPoints([this.origin, this.editor.inputs.getCurrentPagePoint()])
		spotlightState.update((s) => ({ ...s, draft }))
	}

	override onPointerUp() {
		if (!this.origin) return
		const { editor } = this
		const additive = editor.inputs.getShiftKey()
		const current = getSpotlightTargets(editor)
		const draft = spotlightState.get().draft
		this.origin = null

		if (this.isDragging && draft) {
			this.isDragging = false
			const area: SpotlightTarget = { kind: 'area', box: draft }
			setTargets(editor, additive ? [...current, area] : [area])
			return
		}

		const hit = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
			hitInside: true,
			hitLocked: true,
			hitLabels: true,
			margin: 4 / editor.getZoomLevel(),
		})
		if (!hit) {
			if (!additive) clearSpotlight()
			return
		}
		// Spotlight the whole group, not one stroke inside it.
		const id = editor.getOutermostSelectableShape(hit).id
		const isLit = current.some((t) => t.kind === 'shape' && t.id === id)
		if (additive) {
			setTargets(
				editor,
				isLit
					? current.filter((t) => !(t.kind === 'shape' && t.id === id))
					: [...current, { kind: 'shape', id }]
			)
		} else if (isLit && current.length === 1) {
			clearSpotlight()
		} else {
			setTargets(editor, [{ kind: 'shape', id }])
		}
	}

	override onCancel() {
		if (getSpotlightTargets(this.editor).length > 0) clearSpotlight()
		else this.editor.setCurrentTool('select')
	}
}
