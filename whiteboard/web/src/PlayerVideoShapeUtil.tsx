import {
	HTMLContainer,
	stopEventPropagation,
	TLVideoShape,
	useImageOrVideoAsset,
	VideoShapeUtil,
} from 'tldraw'

// Replaces tldraw's built-in video shape (same type, so drops and pastes still create it).
// The built-in one is muted and only shows controls after a double-click; this one is a
// regular player: always-visible controls and sound. The top bar is the handle for
// selecting and moving the shape, since clicks on the video go to the player.
export class PlayerVideoShapeUtil extends VideoShapeUtil {
	override component(shape: TLVideoShape) {
		return <PlayerVideo shape={shape} />
	}
}

function PlayerVideo({ shape }: { shape: TLVideoShape }) {
	const { asset, url } = useImageOrVideoAsset({
		shapeId: shape.id,
		assetId: shape.props.assetId,
		width: shape.props.w,
	})
	const name = (asset?.props as { name?: string } | undefined)?.name ?? 'Video'

	return (
		<HTMLContainer
			className="player-shape"
			style={{ width: shape.props.w, height: shape.props.h }}
		>
			<div className="player-shape__bar">{name}</div>
			{url && (
				<video
					className="player-shape__video"
					src={url}
					controls
					playsInline
					preload="metadata"
					onPointerDown={stopEventPropagation}
					onPointerUp={stopEventPropagation}
					onDoubleClick={stopEventPropagation}
					onWheel={stopEventPropagation}
				/>
			)}
		</HTMLContainer>
	)
}
