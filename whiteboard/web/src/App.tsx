import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { useCallback } from 'react'
import { Editor, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { HoldToInk } from './HoldToInk'
import { postToNative } from './nativeBridge'
import { PageNavigator } from './PageNavigator'
import { PlayerVideoShapeUtil } from './PlayerVideoShapeUtil'

const shapeUtils = [PlayerVideoShapeUtil]

const components: TLComponents = { TopPanel: PageNavigator }

// Bundle fonts, icons and translations so the app works offline instead of loading them from a CDN.
// Keep the URLs as Vite resolved them. tldraw's default formatter only treats http(s) and data:
// URLs as absolute, so in the app it turned `whiteboard://app/assets/x` into
// `whiteboard://app/whiteboard://app/assets/x`, and every icon and font failed to load.
const assetUrls = getAssetUrlsByImport((url) => url)

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
				components={components}
				assetUrls={assetUrls}
				maxAssetSize={MAX_ASSET_SIZE}
				onMount={handleMount}
			>
				<HoldToInk />
			</Tldraw>
		</div>
	)
}
