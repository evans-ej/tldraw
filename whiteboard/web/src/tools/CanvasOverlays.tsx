import { useEffect, useState } from 'react'
import { Box, useEditor, useValue } from 'tldraw'
import { eraserSettings, highlighterSettings, laserSettings, spotlightSettings } from './settings'
import { getSpotlightTargets, spotlightState } from './SpotlightTool'

/** Room left around a spotlighted item, in screen pixels. */
const SPOTLIGHT_PADDING = 14

/** Drawn in front of the board: the spotlight's dimmed layer and the laser's glowing dot. */
export function CanvasOverlays() {
	return (
		<>
			<SpotlightOverlay />
			<LaserDot />
			<SizeCursor />
		</>
	)
}

function usePointerOnBoard() {
	const editor = useEditor()
	const [onBoard, setOnBoard] = useState(true)
	useEffect(() => {
		const container = editor.getContainer()
		const enter = () => setOnBoard(true)
		const leave = () => setOnBoard(false)
		container.addEventListener('pointerenter', enter)
		container.addEventListener('pointerleave', leave)
		return () => {
			container.removeEventListener('pointerenter', enter)
			container.removeEventListener('pointerleave', leave)
		}
	}, [editor])
	return onBoard
}

function SpotlightOverlay() {
	const editor = useEditor()
	const onBoard = usePointerOnBoard()

	const view = useValue(
		'spotlight overlay',
		() => {
			const isActive = editor.getCurrentToolId() === 'spotlight'
			const targets = getSpotlightTargets(editor)
			const { draft } = spotlightState.get()
			const { radius, dim } = spotlightSettings.get()
			const viewport = editor.getViewportScreenBounds()

			const toScreen = (page: Box) => {
				const a = editor.pageToViewport(page.point)
				const b = editor.pageToViewport({ x: page.maxX, y: page.maxY })
				return Box.FromPoints([a, b]).expandBy(SPOTLIGHT_PADDING)
			}

			const rects: Box[] = []
			for (const t of targets) {
				const page = t.kind === 'area' ? t.box : editor.getShapePageBounds(t.id)
				if (page) rects.push(toScreen(page))
			}
			if (draft) rects.push(toScreen(draft))

			// With nothing picked, the spotlight follows the pointer like a torch.
			const pointer =
				isActive && rects.length === 0 && !editor.inputs.getIsPointing()
					? editor.inputs.getCurrentScreenPoint()
					: null

			return { isActive, rects, pointer, radius, dim, width: viewport.w, height: viewport.h }
		},
		[editor]
	)

	const circle = view.pointer && onBoard ? view.pointer : null
	const visible = view.rects.length > 0 || circle !== null

	return (
		<svg
			className="spotlight-overlay"
			data-visible={visible}
			width={view.width}
			height={view.height}
			aria-hidden
		>
			<defs>
				<mask id="spotlight-holes">
					<rect width="100%" height="100%" fill="white" />
					{view.rects.map((r, i) => (
						<rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={16} fill="black" />
					))}
					{circle && (
						<circle cx={circle.x} cy={circle.y} r={view.radius} fill="url(#spotlight-soft)" />
					)}
				</mask>
				<radialGradient id="spotlight-soft">
					<stop offset="80%" stopColor="black" />
					<stop offset="100%" stopColor="white" />
				</radialGradient>
			</defs>
			<rect
				width="100%"
				height="100%"
				fill="black"
				opacity={visible ? view.dim : 0}
				mask="url(#spotlight-holes)"
			/>
			{view.rects.map((r, i) => (
				<rect
					key={i}
					className="spotlight-overlay__ring"
					x={r.x}
					y={r.y}
					width={r.w}
					height={r.h}
					rx={16}
				/>
			))}
		</svg>
	)
}

function LaserDot() {
	const editor = useEditor()
	const onBoard = usePointerOnBoard()
	const dot = useValue(
		'laser dot',
		() => {
			if (editor.getCurrentToolId() !== 'laser') return null
			const { color, size } = laserSettings.get()
			return { point: editor.inputs.getCurrentScreenPoint(), color, size }
		},
		[editor]
	)
	if (!dot || !onBoard) return null
	const diameter = Math.max(10, dot.size * 2.2)
	return (
		<div
			className="laser-dot"
			style={{
				width: diameter,
				height: diameter,
				transform: `translate(${dot.point.x - diameter / 2}px, ${dot.point.y - diameter / 2}px)`,
				background: dot.color,
				boxShadow: `0 0 ${diameter}px ${diameter / 2}px ${dot.color}88`,
			}}
		/>
	)
}

/** A circle at the pointer showing how wide the eraser or highlighter reaches. */
function SizeCursor() {
	const editor = useEditor()
	const onBoard = usePointerOnBoard()
	const ring = useValue(
		'size cursor',
		() => {
			const tool = editor.getCurrentToolId()
			let diameter: number
			if (tool === 'eraser') {
				diameter = eraserSettings.get().size
			} else if (tool === 'highlight') {
				// Highlighter strokes have a fixed width on the page (unless dynamic size is on), so
				// the ring grows and shrinks with the zoom like the ink does.
				const zoom = editor.getZoomLevel()
				const scale = editor.user.getIsDynamicResizeMode() ? 1 / zoom : 1
				diameter = highlighterSettings.get().size * scale * zoom
			} else {
				return null
			}
			return { tool, diameter, point: editor.inputs.getCurrentScreenPoint() }
		},
		[editor]
	)
	if (!ring || !onBoard) return null
	const d = Math.max(4, ring.diameter)
	return (
		<div
			className="size-cursor"
			data-tool={ring.tool}
			style={{
				width: d,
				height: d,
				transform: `translate(${ring.point.x - d / 2}px, ${ring.point.y - d / 2}px)`,
			}}
		/>
	)
}
