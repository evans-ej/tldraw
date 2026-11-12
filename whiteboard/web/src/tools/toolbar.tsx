import {
	ArrowDownToolbarItem,
	ArrowLeftToolbarItem,
	ArrowRightToolbarItem,
	ArrowToolbarItem,
	ArrowUpToolbarItem,
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	EllipseToolbarItem,
	EraserToolbarItem,
	FrameToolbarItem,
	HandToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	LineToolbarItem,
	NoteToolbarItem,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TldrawUiMenuToolItem,
	TLUiOverrides,
	TriangleToolbarItem,
	useIsToolSelected,
	useTools,
	XBoxToolbarItem,
} from 'tldraw'

const SPOTLIGHT_ICON_SVG = `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="15" cy="15" r="6" stroke="black" stroke-width="2"/>
<path d="M15 3v3M15 24v3M3 15h3M24 15h3M6.5 6.5l2.1 2.1M21.4 21.4l2.1 2.1M6.5 23.5l2.1-2.1M21.4 8.6l2.1-2.1" stroke="black" stroke-width="2" stroke-linecap="round"/>
</svg>`

export const SPOTLIGHT_ICON_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SPOTLIGHT_ICON_SVG)}`

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.spotlight = {
			id: 'spotlight',
			label: 'tool.spotlight',
			icon: 'tool-spotlight',
			kbd: 'i',
			readonlyOk: true,
			onSelect() {
				editor.setCurrentTool('spotlight')
			},
		}
		return tools
	},
	translations: {
		en: { 'tool.spotlight': 'Spotlight', 'tool.highlight': 'Highlighter', 'tool.laser': 'Laser pointer' },
	},
}

function SpotlightToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools.spotlight)
	return <TldrawUiMenuToolItem toolId="spotlight" isSelected={isSelected} />
}

/** tldraw's toolbar with the presenting tools moved up next to the pen, so they don't hide in the overflow. */
export function WhiteboardToolbar() {
	return (
		<DefaultToolbar>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<HighlightToolbarItem />
			<LaserToolbarItem />
			<SpotlightToolbarItem />
			<EraserToolbarItem />
			<TextToolbarItem />
			<ArrowToolbarItem />
			<NoteToolbarItem />
			<AssetToolbarItem />

			<RectangleToolbarItem />
			<EllipseToolbarItem />
			<TriangleToolbarItem />
			<DiamondToolbarItem />
			<HexagonToolbarItem />
			<OvalToolbarItem />
			<RhombusToolbarItem />
			<StarToolbarItem />
			<CloudToolbarItem />
			<HeartToolbarItem />
			<XBoxToolbarItem />
			<CheckBoxToolbarItem />
			<ArrowLeftToolbarItem />
			<ArrowUpToolbarItem />
			<ArrowDownToolbarItem />
			<ArrowRightToolbarItem />
			<LineToolbarItem />
			<FrameToolbarItem />
		</DefaultToolbar>
	)
}
