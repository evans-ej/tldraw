import { useEffect, useState } from 'react'
import { TLPointerEventInfo, useEditor } from 'tldraw'

// Option on a Mac keyboard. MacBook trackpads only draw while the pad is held down,
// so holding this key instead turns plain finger movement into ink.
export const INK_KEY = 'Alt'
const INK_POINTER_ID = 9999
// Tools that Option-gliding drives as they are; from any other tool it inks with the pen.
const GLIDE_TOOLS = ['draw', 'highlight', 'laser']

export function HoldToInk() {
	const editor = useEditor()
	const [isInking, setIsInking] = useState(false)

	useEffect(() => {
		let last = { x: NaN, y: NaN }
		let inking = false
		let toolBefore: string | null = null
		let markId: string | null = null

		function dispatchPointer(name: TLPointerEventInfo['name']) {
			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name,
				// z of 0 makes tldraw treat this as non-pressure input and simulate pressure from speed.
				point: { x: last.x, y: last.y, z: 0 },
				pointerId: INK_POINTER_ID,
				button: 0,
				isPen: false,
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})
		}

		function isOverCanvas() {
			if (Number.isNaN(last.x)) return false
			const el = document.elementFromPoint(last.x, last.y)
			return !!el?.closest('.tl-canvas')
		}

		function start() {
			const current = editor.getCurrentToolId()
			toolBefore = GLIDE_TOOLS.includes(current) ? null : current
			if (toolBefore) editor.setCurrentTool('draw')
			markId = editor.markHistoryStoppingPoint('hold to ink')
			dispatchPointer('pointer_down')
			inking = true
			setIsInking(true)
		}

		function stop({ cancel }: { cancel: boolean }) {
			if (!inking) return
			inking = false
			setIsInking(false)
			dispatchPointer('pointer_up')
			// Option is also a modifier (Option+key shortcuts); if another key joins in,
			// the stroke wasn't meant as ink, so undo it.
			if (cancel && markId) editor.bailToMark(markId)
			if (toolBefore) editor.setCurrentTool(toolBefore)
			toolBefore = null
			markId = null
		}

		function onPointerMove(e: PointerEvent) {
			last = { x: e.clientX, y: e.clientY }
		}

		function onKeyDown(e: KeyboardEvent) {
			if (inking) {
				if (e.key !== INK_KEY) stop({ cancel: true })
				return
			}
			if (e.key !== INK_KEY || e.repeat) return
			if (e.metaKey || e.ctrlKey || e.shiftKey) return
			if (editor.inputs.getIsPointing() || editor.getEditingShapeId()) return
			if (!isOverCanvas()) return
			e.preventDefault()
			start()
		}

		function onKeyUp(e: KeyboardEvent) {
			if (e.key === INK_KEY) stop({ cancel: false })
		}

		function onBlur() {
			stop({ cancel: false })
		}

		window.addEventListener('pointermove', onPointerMove, true)
		window.addEventListener('keydown', onKeyDown, true)
		window.addEventListener('keyup', onKeyUp, true)
		window.addEventListener('blur', onBlur)
		return () => {
			stop({ cancel: false })
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('keydown', onKeyDown, true)
			window.removeEventListener('keyup', onKeyUp, true)
			window.removeEventListener('blur', onBlur)
		}
	}, [editor])

	return isInking ? <div className="ink-hint">Inking: release Option to finish</div> : null
}
