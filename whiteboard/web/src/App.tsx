import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { useCallback } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { HoldToInk } from './HoldToInk'
import { postToNative } from './nativeBridge'
import { PlayerVideoShapeUtil } from './PlayerVideoShapeUtil'

const shapeUtils = [PlayerVideoShapeUtil]

// Bundle fonts, icons and translations so the app works offline instead of loading them from a CDN.
const assetUrls = getAssetUrlsByImport()

// tldraw's default limit is 10 MB, too small for video clips.
const MAX_ASSET_SIZE = 1024 * 1024 * 1024

export default function App() {
	const handleMount = useCallback((editor: Editor) => {
		editor.setCurrentTool('draw')
		postToNative({ type: 'ready' })
	}, [])

	return (
		<div className="whiteboard">
			<Tldraw
				persistenceKey="whiteboard"
				licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
				shapeUtils={shapeUtils}
				assetUrls={assetUrls}
				maxAssetSize={MAX_ASSET_SIZE}
				onMount={handleMount}
			>
				<HoldToInk />
			</Tldraw>
		</div>
	)
}
