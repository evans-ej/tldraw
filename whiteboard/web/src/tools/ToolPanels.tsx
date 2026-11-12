import { ReactNode, useEffect, useRef } from 'react'
import { DefaultStylePanel, TLUiStylePanelProps, useEditor, useValue } from 'tldraw'
import {
	HIGHLIGHTER_COLORS,
	highlighterSettings,
	LASER_COLORS,
	laserSettings,
	spotlightSettings,
} from './settings'
import { clearSpotlight, getSpotlightTargets } from './SpotlightTool'

/** Shows each new tool's own settings in place of tldraw's style panel while that tool is active. */
export function ToolAwareStylePanel(props: TLUiStylePanelProps) {
	const editor = useEditor()
	const toolId = useValue('tool', () => editor.getCurrentToolId(), [editor])
	if (toolId === 'highlight') return <HighlighterPanel />
	if (toolId === 'laser') return <LaserPanel />
	if (toolId === 'spotlight') return <SpotlightPanel />
	return <DefaultStylePanel {...props} />
}

function Panel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const el = ref.current
		if (!el) return
		// Keep the board from treating slider drags as pointer moves on the canvas.
		const onMove = (e: PointerEvent) => editor.markEventAsHandled(e)
		el.addEventListener('pointermove', onMove)
		return () => el.removeEventListener('pointermove', onMove)
	}, [editor])
	return (
		<div ref={ref} className="tlui-style-panel tlui-style-panel__wrapper tool-panel">
			<div className="tool-panel__title" title={hint}>
				{title}
			</div>
			{children}
		</div>
	)
}

function Slider({
	label,
	value,
	min,
	max,
	step = 1,
	format,
	onChange,
}: {
	label: string
	value: number
	min: number
	max: number
	step?: number
	format: (v: number) => string
	onChange: (v: number) => void
}) {
	return (
		<label className="tool-panel__slider">
			<span className="tool-panel__label">
				{label}
				<span className="tool-panel__value">{format(value)}</span>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.currentTarget.value))}
			/>
		</label>
	)
}

function Swatches({
	colors,
	selected,
	onSelect,
}: {
	colors: { id: string; css: string; label: string }[]
	selected: string
	onSelect: (id: string) => void
}) {
	return (
		<div className="tool-panel__swatches">
			{colors.map((c) => (
				<button
					key={c.id}
					className="tool-panel__swatch"
					data-selected={c.id === selected}
					style={{ background: c.css }}
					title={c.label}
					aria-label={c.label}
					onClick={() => onSelect(c.id)}
				/>
			))}
		</div>
	)
}

function HighlighterPanel() {
	const editor = useEditor()
	const settings = useValue('highlighter settings', () => highlighterSettings.get(), [])
	const colors = useValue(
		'highlighter colors',
		() => {
			const palette = editor.getCurrentTheme().colors[editor.getColorMode()]
			return HIGHLIGHTER_COLORS.map((id) => ({
				id,
				css: palette[id]?.highlightSrgb ?? id,
				label: id.replace('-', ' '),
			}))
		},
		[editor]
	)
	const swatch = colors.find((c) => c.id === settings.color)?.css
	return (
		<Panel title="Highlighter" hint="Shift+D. Hold Option to highlight without pressing.">
			<Swatches
				colors={colors}
				selected={settings.color}
				onSelect={(id) => highlighterSettings.update({ color: id as typeof settings.color })}
			/>
			<Slider
				label="Opacity"
				value={settings.opacity}
				min={0.1}
				max={1}
				step={0.05}
				format={(v) => `${Math.round(v * 100)}%`}
				onChange={(opacity) => highlighterSettings.update({ opacity })}
			/>
			<Slider
				label="Size"
				value={settings.size}
				min={4}
				max={80}
				format={(v) => `${v}px`}
				onChange={(size) => highlighterSettings.update({ size })}
			/>
			<div className="tool-panel__preview">
				<div
					style={{
						height: Math.min(settings.size, 24),
						background: swatch,
						opacity: settings.opacity,
					}}
				/>
			</div>
		</Panel>
	)
}

function LaserPanel() {
	const settings = useValue('laser settings', () => laserSettings.get(), [])
	return (
		<Panel title="Laser pointer" hint="K. Drag to draw a fading trail, or hold Option and glide.">
			<Swatches
				colors={LASER_COLORS.map((c) => ({ id: c, css: c, label: c }))}
				selected={settings.color}
				onSelect={(color) => laserSettings.update({ color })}
			/>
			<Slider
				label="Size"
				value={settings.size}
				min={2}
				max={16}
				format={(v) => `${v}px`}
				onChange={(size) => laserSettings.update({ size })}
			/>
			<Slider
				label="Trail"
				value={settings.trailMs}
				min={200}
				max={5000}
				step={100}
				format={(v) => `${(v / 1000).toFixed(1)}s`}
				onChange={(trailMs) => laserSettings.update({ trailMs })}
			/>
		</Panel>
	)
}

function SpotlightPanel() {
	const editor = useEditor()
	const settings = useValue('spotlight settings', () => spotlightSettings.get(), [])
	const count = useValue('spotlight count', () => getSpotlightTargets(editor).length, [editor])
	return (
		<Panel
			title="Spotlight"
			hint="I. Click an item to spotlight it, Shift-click to add more, drag to light an area. Esc clears."
		>
			<Slider
				label="Dim"
				value={settings.dim}
				min={0.2}
				max={0.95}
				step={0.05}
				format={(v) => `${Math.round(v * 100)}%`}
				onChange={(dim) => spotlightSettings.update({ dim })}
			/>
			<Slider
				label="Torch size"
				value={settings.radius}
				min={60}
				max={400}
				step={10}
				format={(v) => `${v}px`}
				onChange={(radius) => spotlightSettings.update({ radius })}
			/>
			<button className="tool-panel__button" disabled={count === 0} onClick={clearSpotlight}>
				Clear spotlight
			</button>
		</Panel>
	)
}
