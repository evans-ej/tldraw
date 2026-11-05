import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Editor,
	HTMLContainer,
	stopEventPropagation,
	TLShapeId,
	TLVideoShape,
	useEditor,
	useImageOrVideoAsset,
	useValue,
	VideoShapeUtil,
} from 'tldraw'

// Screen-pixel sizes; divided by the zoom level so the bars stay usable when zoomed out.
const TITLE_HEIGHT = 24
const CONTROLS_HEIGHT = 56

// Replaces tldraw's built-in video shape (same type, so drops and pastes still create it).
// Differences: sound on, a large controls strip below the picture instead of the browser's
// overlay (which darkens the whole video on hover), the playback position is kept when the
// shape unmounts (switching pages), and the picture ignores the pointer so you can draw on it.
export class PlayerVideoShapeUtil extends VideoShapeUtil {
	override component(shape: TLVideoShape) {
		return <PlayerVideo shape={shape} />
	}
}

const videoElements = new Map<TLShapeId, HTMLVideoElement>()
let lastActiveVideo: TLShapeId | null = null

/** Plays or pauses the selected video, else the last one used on this page, else the first one. */
export function togglePlayback(editor: Editor) {
	const onPage = editor
		.getCurrentPageShapesSorted()
		.filter((s) => s.type === 'video' && videoElements.has(s.id))
		.map((s) => s.id)
	if (!onPage.length) return false
	const selected = editor.getSelectedShapeIds().find((id) => onPage.includes(id))
	const id =
		selected ?? (lastActiveVideo && onPage.includes(lastActiveVideo) ? lastActiveVideo : onPage[0])
	const video = videoElements.get(id)!
	lastActiveVideo = id
	if (video.paused) void video.play()
	else video.pause()
	return true
}

function saveTime(editor: Editor, id: TLShapeId, time: number) {
	const shape = editor.getShape<TLVideoShape>(id)
	if (!shape || Math.abs(shape.props.time - time) < 0.05) return
	// Playback position isn't an edit, so keep it out of undo/redo.
	editor.run(() => editor.updateShape<TLVideoShape>({ id, type: 'video', props: { time } }), {
		history: 'ignore',
	})
}

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds)) return '0:00'
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

function PlayerVideo({ shape }: { shape: TLVideoShape }) {
	const editor = useEditor()
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
	const { asset, url } = useImageOrVideoAsset({
		shapeId: shape.id,
		assetId: shape.props.assetId,
		width: shape.props.w,
	})
	const name = (asset?.props as { name?: string } | undefined)?.name ?? 'Video'

	const videoRef = useRef<HTMLVideoElement>(null)
	const [playing, setPlaying] = useState(false)
	const [time, setTime] = useState(shape.props.time)
	const [duration, setDuration] = useState(0)
	const [muted, setMuted] = useState(false)
	const lastSaved = useRef(0)
	const initialTime = useRef(shape.props.time)

	useEffect(() => {
		const video = videoRef.current
		if (!video) return
		videoElements.set(shape.id, video)
		return () => {
			videoElements.delete(shape.id)
			saveTime(editor, shape.id, video.currentTime)
		}
	}, [editor, shape.id, url])

	const handleLoadedMetadata = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		setDuration(video.duration)
		if (initialTime.current > 0 && initialTime.current < video.duration) {
			video.currentTime = initialTime.current
		}
	}, [])

	const handleTimeUpdate = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		setTime(video.currentTime)
		const now = Date.now()
		if (now - lastSaved.current > 2000) {
			lastSaved.current = now
			saveTime(editor, shape.id, video.currentTime)
		}
	}, [editor, shape.id])

	const handlePause = useCallback(() => {
		setPlaying(false)
		if (videoRef.current) saveTime(editor, shape.id, videoRef.current.currentTime)
	}, [editor, shape.id])

	const toggle = () => {
		const video = videoRef.current
		if (!video) return
		lastActiveVideo = shape.id
		if (video.paused) void video.play()
		else video.pause()
	}

	const skip = (seconds: number) => {
		const video = videoRef.current
		if (!video) return
		lastActiveVideo = shape.id
		video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
	}

	const titleHeight = TITLE_HEIGHT / zoom
	const controlsHeight = CONTROLS_HEIGHT / zoom

	return (
		<HTMLContainer className="player-shape" style={{ width: shape.props.w, height: shape.props.h }}>
			<div className="player-shape__title" style={{ height: titleHeight }}>
				<span style={{ fontSize: 12 / zoom, padding: `0 ${10 / zoom}px` }}>{name}</span>
			</div>
			{url && (
				<video
					ref={videoRef}
					className="player-shape__video"
					src={url}
					playsInline
					preload="metadata"
					onLoadedMetadata={handleLoadedMetadata}
					onTimeUpdate={handleTimeUpdate}
					onPlay={() => setPlaying(true)}
					onPause={handlePause}
					onVolumeChange={() => setMuted(!!videoRef.current?.muted)}
				/>
			)}
			<div
				className="player-shape__controls-slot"
				style={{ height: controlsHeight }}
				onPointerDown={stopEventPropagation}
				onPointerUp={stopEventPropagation}
				onDoubleClick={stopEventPropagation}
			>
				<div
					className="player-controls"
					style={{
						width: shape.props.w * zoom,
						height: CONTROLS_HEIGHT,
						transform: `scale(${1 / zoom})`,
					}}
				>
					<button className="player-controls__button" onClick={() => skip(-10)} title="Back 10 seconds">
						↺ 10
					</button>
					<button
						className="player-controls__button player-controls__play"
						onClick={toggle}
						title="Play or pause (P)"
					>
						{playing ? '❚❚' : '▶'}
					</button>
					<button className="player-controls__button" onClick={() => skip(10)} title="Forward 10 seconds">
						10 ↻
					</button>
					<span className="player-controls__time">{formatTime(time)}</span>
					<input
						className="player-controls__scrubber"
						type="range"
						min={0}
						max={duration || 0}
						step={0.1}
						value={time}
						onChange={(e) => {
							const video = videoRef.current
							if (video) video.currentTime = Number(e.currentTarget.value)
						}}
					/>
					<span className="player-controls__time">{formatTime(duration)}</span>
					<button
						className="player-controls__button"
						onClick={() => {
							if (videoRef.current) videoRef.current.muted = !videoRef.current.muted
						}}
						title="Mute"
					>
						{muted ? '🔇' : '🔊'}
					</button>
				</div>
			</div>
		</HTMLContainer>
	)
}
