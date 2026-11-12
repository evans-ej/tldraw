import {
	b64Vecs,
	createShapeId,
	Editor,
	getDisplayValues,
	getIndexAbove,
	getIndexBetween,
	StateNode,
	TLDrawShape,
	TLDrawShapeSegment,
	TLHighlightShape,
	TLShape,
	TLShapePartial,
	Vec,
	VecLike,
	VecModel,
} from 'tldraw'
import { eraserSettings } from './settings'

// Replaces tldraw's eraser (same id, so its toolbar button, E shortcut and the pen's eraser end
// still work). tldraw's eraser deletes any shape it touches, videos and images included. This one
// only touches annotations, and rubs out just the part of a pen or highlighter stroke that falls
// inside the eraser circle, splitting the stroke when you cut through the middle.

/** Strokes the eraser cuts. */
const STROKE_TYPES = new Set(['draw', 'highlight'])
/** Annotations the eraser removes whole when the circle touches them. Media is never erased. */
const WHOLE_TYPES = new Set(['geo', 'arrow', 'line', 'text', 'note'])

type Stroke = TLDrawShape | TLHighlightShape

/** Eraser radius in page units: the setting is a screen size, so the circle looks the same at any zoom. */
export function getEraserPageRadius(editor: Editor) {
	return eraserSettings.get().size / 2 / editor.getZoomLevel()
}

class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		this.parent.transition('erasing')
	}

	override onCancel() {
		const tool = this.parent as WhiteboardEraserTool
		this.editor.setCurrentTool(tool.returnTo ?? 'select')
	}
}

class Erasing extends StateNode {
	static override id = 'erasing'

	private markId = ''

	override onEnter() {
		this.markId = this.editor.markHistoryStoppingPoint('erase')
		const point = this.editor.inputs.getCurrentPagePoint()
		eraseAlong(this.editor, point, point)
	}

	override onPointerMove() {
		eraseAlong(
			this.editor,
			this.editor.inputs.getPreviousPagePoint(),
			this.editor.inputs.getCurrentPagePoint()
		)
	}

	override onPointerUp() {
		this.finish()
	}

	override onComplete() {
		this.finish()
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}

	override onInterrupt() {
		this.finish()
	}

	private finish() {
		this.parent.transition('idle')
		;(this.parent as WhiteboardEraserTool).maybeReturn()
	}
}

export class WhiteboardEraserTool extends StateNode {
	static override id = 'eraser'
	static override initial = 'idle'
	static override isLockable = false
	static override children() {
		return [Idle, Erasing]
	}

	/** Set when the pen's eraser end switched to this tool, so lifting it goes back to the pen. */
	returnTo: string | undefined

	override onEnter(info: { onInteractionEnd?: string } = {}) {
		this.returnTo = info.onInteractionEnd
		if (this.returnTo) this.setCurrentToolIdMask(this.returnTo)
		// The circle drawn in CanvasOverlays is the cursor.
		this.editor.setCursor({ type: 'none', rotation: 0 })
	}

	override onExit() {
		this.setCurrentToolIdMask(undefined)
		this.returnTo = undefined
	}

	maybeReturn() {
		if (this.returnTo) this.editor.setCurrentTool(this.returnTo)
	}
}

/** Erases everything the eraser circle sweeps over while moving from A to B (page space). */
function eraseAlong(editor: Editor, A: VecLike, B: VecLike) {
	const radius = getEraserPageRadius(editor)
	const sweep = {
		minX: Math.min(A.x, B.x) - radius,
		minY: Math.min(A.y, B.y) - radius,
		maxX: Math.max(A.x, B.x) + radius,
		maxY: Math.max(A.y, B.y) + radius,
	}
	const candidates = editor.getCurrentPageShapes().filter((shape) => {
		if (!STROKE_TYPES.has(shape.type) && !WHOLE_TYPES.has(shape.type)) return false
		if (editor.isShapeOrAncestorLocked(shape)) return false
		const b = editor.getShapePageBounds(shape)
		// A stroke's bounds follow its centre line, so pad by half its width to catch the ink's edge.
		const pad = STROKE_TYPES.has(shape.type) ? getStrokeWidth(editor, shape as Stroke) / 2 : 0
		return (
			!!b &&
			b.maxX + pad >= sweep.minX &&
			b.minX - pad <= sweep.maxX &&
			b.maxY + pad >= sweep.minY &&
			b.minY - pad <= sweep.maxY
		)
	})
	if (!candidates.length) return

	const toDelete: TLShape['id'][] = []
	const toUpdate: TLShapePartial[] = []
	const toCreate: TLShapePartial[] = []

	for (const shape of candidates) {
		const toShape = editor.getShapePageTransform(shape).clone().invert()
		const a = toShape.applyToPoint(A)
		const b = toShape.applyToPoint(B)

		if (WHOLE_TYPES.has(shape.type)) {
			const geometry = editor.getShapeGeometry(shape)
			if (geometry.hitTestLineSegment(a, b, radius)) toDelete.push(shape.id)
			continue
		}

		const result = cutStroke(editor, shape as Stroke, a, b, radius)
		if (result === 'untouched') continue
		if (result.length === 0) {
			toDelete.push(shape.id)
			continue
		}
		const [first, ...rest] = result
		toUpdate.push({
			id: shape.id,
			type: shape.type,
			props: pieceProps(shape as Stroke, first),
		} as TLShapePartial)
		// New pieces go right above the original, below whatever was drawn after it.
		const siblings = editor.getSortedChildIdsForParent(shape.parentId)
		const next = siblings[siblings.indexOf(shape.id) + 1]
		const nextIndex = next ? editor.getShape(next)?.index : undefined
		let index = shape.index
		for (const segments of rest) {
			index = nextIndex ? getIndexBetween(index, nextIndex) : getIndexAbove(index)
			toCreate.push({
				...structuredClone(shape),
				id: createShapeId(),
				index,
				props: { ...shape.props, ...pieceProps(shape as Stroke, segments) },
			} as TLShapePartial)
		}
	}

	if (toUpdate.length) editor.updateShapes(toUpdate)
	if (toCreate.length) editor.createShapes(toCreate)
	if (toDelete.length) editor.deleteShapes(toDelete)
}

function pieceProps(shape: Stroke, segments: TLDrawShapeSegment[]) {
	// A cut draw shape is no longer a closed loop, so it mustn't keep its fill.
	return shape.type === 'draw'
		? { segments, isComplete: true, isClosed: false }
		: { segments, isComplete: true }
}

function getStrokeWidth(editor: Editor, shape: Stroke) {
	const util = editor.getShapeUtil(shape) as unknown as Parameters<typeof getDisplayValues>[0]
	const { strokeWidth } = getDisplayValues(util, shape) as { strokeWidth: number }
	return strokeWidth * shape.props.scale
}

interface Pt extends VecModel {
	z: number
	/** Which original segment this point came from, so pieces keep free vs straight. */
	seg: number
}

/**
 * Removes the part of a stroke within `radius` of the eraser's path a→b (shape space), plus half
 * the stroke's width so the remaining ink's rounded ends stop at the circle's edge.
 * Returns the remaining pieces as segment lists, or 'untouched'.
 */
function cutStroke(editor: Editor, shape: Stroke, a: VecLike, b: VecLike, radius: number) {
	const reach = radius + getStrokeWidth(editor, shape) / 2
	const { scaleX = 1, scaleY = 1 } = shape.props as { scaleX?: number; scaleY?: number }
	const segments = shape.props.segments

	const points: Pt[] = []
	segments.forEach((segment, seg) => {
		for (const p of b64Vecs.decodePoints(segment.path, segment.dim)) {
			points.push({ x: p.x * scaleX, y: p.y * scaleY, z: p.z ?? 0.5, seg })
		}
	})
	if (!points.length) return 'untouched'

	// Densify only the edges the eraser comes near, so the cut lands close to the circle's edge
	// without bloating the rest of the stroke.
	const step = Math.max(reach / 4, 0.5)
	const dense: Pt[] = [points[0]]
	for (let i = 1; i < points.length; i++) {
		const p = points[i - 1]
		const q = points[i]
		if (segmentDistance(p, q, a, b) < reach) {
			const n = Math.ceil(Vec.Dist(p, q) / step)
			for (let k = 1; k < n; k++) {
				const t = k / n
				dense.push({
					x: p.x + (q.x - p.x) * t,
					y: p.y + (q.y - p.y) * t,
					z: p.z + (q.z - p.z) * t,
					seg: q.seg,
				})
			}
		}
		dense.push(q)
	}

	const keep = dense.map((p) => pointSegmentDistance(p, a, b) >= reach)
	if (keep.every(Boolean)) return 'untouched'

	const pieces: TLDrawShapeSegment[][] = []
	let run: Pt[] = []
	const flush = () => {
		// A lone leftover point would show as a stray dot.
		if (run.length > 1) pieces.push(toSegments(run, segments, scaleX, scaleY))
		run = []
	}
	dense.forEach((p, i) => (keep[i] ? run.push(p) : flush()))
	flush()
	return pieces
}

function toSegments(
	run: Pt[],
	original: TLDrawShapeSegment[],
	scaleX: number,
	scaleY: number
): TLDrawShapeSegment[] {
	const out: TLDrawShapeSegment[] = []
	let start = 0
	for (let i = 1; i <= run.length; i++) {
		if (i < run.length && run[i].seg === run[start].seg) continue
		const src = original[run[start].seg]
		// Repeat the previous segment's last point so consecutive segments stay joined.
		const from = start > 0 ? start - 1 : start
		const pts = run.slice(from, i).map((p) => ({ x: p.x / scaleX, y: p.y / scaleY, z: p.z }))
		const dim = src.dim ?? 3
		out.push({ type: src.type, path: b64Vecs.encodePoints(pts, dim), dim })
		start = i
	}
	return out
}

function pointSegmentDistance(p: VecLike, a: VecLike, b: VecLike) {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const len2 = dx * dx + dy * dy
	const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function segmentDistance(p: VecLike, q: VecLike, a: VecLike, b: VecLike) {
	if (segmentsCross(p, q, a, b)) return 0
	return Math.min(
		pointSegmentDistance(p, a, b),
		pointSegmentDistance(q, a, b),
		pointSegmentDistance(a, p, q),
		pointSegmentDistance(b, p, q)
	)
}

function segmentsCross(p: VecLike, q: VecLike, a: VecLike, b: VecLike) {
	const cross = (o: VecLike, u: VecLike, v: VecLike) =>
		(u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x)
	const d1 = cross(a, b, p)
	const d2 = cross(a, b, q)
	const d3 = cross(p, q, a)
	const d4 = cross(p, q, b)
	return d1 * d2 < 0 && d3 * d4 < 0
}
