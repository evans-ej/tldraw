import { useEffect } from 'react'
import {
	Box,
	defaultHandleExternalFileContent,
	Editor,
	TLVideoShape,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'

// Screen pixels kept clear between the video and the bars above and below it.
const GAP = 6

/** The part of the window not covered by the top bar (menu, page buttons, style strip) or the
 * bottom toolbar, in screen coordinates. Measured from the DOM, so it follows whatever the bars
 * look like right now. */
export function getFreeScreenArea(editor: Editor) {
	const container = editor.getContainer().getBoundingClientRect()
	const doc = editor.getContainer().ownerDocument
	const rects = (selector: string) =>
		Array.from(doc.querySelectorAll(selector))
			.map((el) => el.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0)

	const top =
		Math.max(
			container.top,
			...rects('.tlui-menu-zone, .tlui-layout__top__center > *, .tlui-style-panel').map(
				(r) => r.bottom
			)
		) + GAP
	const bottom =
		Math.min(
			container.bottom,
			...rects('.tlui-main-toolbar__inner, .tlui-navigation-panel').map((r) => r.top)
		) - GAP

	return new Box(container.left, top, container.width, Math.max(0, bottom - top))
}

/** Stretches a video edge to edge across the free area. The picture keeps its proportions
 * inside the player (letterboxed on black), so only the player's frame changes shape. */
export function fitVideoToScreen(editor: Editor, video: TLVideoShape) {
	const area = getFreeScreenArea(editor)
	if (area.w < 1 || area.h < 1) return
	const topLeft = editor.screenToPage({ x: area.minX, y: area.minY })
	const bottomRight = editor.screenToPage({ x: area.maxX, y: area.maxY })
	const inParent = editor.getPointInParentSpace(video, topLeft)
	editor.updateShape<TLVideoShape>({
		id: video.id,
		type: 'video',
		x: inParent.x,
		y: inParent.y,
		rotation: 0,
		props: { w: bottomRight.x - topLeft.x, h: bottomRight.y - topLeft.y },
	})
}

/** The selected video, else the first video on this page. */
export function getVideoToFit(editor: Editor) {
	const selected = editor.getSelectedShapes().find((s) => s.type === 'video')
	const video = selected ?? editor.getCurrentPageShapesSorted().find((s) => s.type === 'video')
	return video as TLVideoShape | undefined
}

/** Pasted or dropped videos fill the free area right away instead of landing at their file's
 * size. Replaces tldraw's file handler with one that runs the default and then fits the video.
 * Render it inside <Tldraw>: as a child it registers after tldraw's own handlers. */
export function VideoAutoFit({ maxAssetSize }: { maxAssetSize: number }) {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()

	useEffect(() => {
		editor.registerExternalContentHandler('files', async (info) => {
			const before = new Set(editor.getCurrentPageShapeIds())
			await defaultHandleExternalFileContent(editor, info, { maxAssetSize, toasts, msg })
			const added = editor
				.getCurrentPageShapes()
				.filter((s): s is TLVideoShape => s.type === 'video' && !before.has(s.id))
			// Several videos at once would all land on top of each other, so only fit a single one.
			if (added.length === 1) fitVideoToScreen(editor, added[0])
		})
	}, [editor, maxAssetSize, toasts, msg])

	return null
}
