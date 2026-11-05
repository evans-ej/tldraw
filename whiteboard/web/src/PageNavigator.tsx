import { useEffect } from 'react'
import { Editor, PageRecordType, useEditor, useValue } from 'tldraw'
import { togglePlayback } from './PlayerVideoShapeUtil'

function goToPage(editor: Editor, direction: 1 | -1) {
	const pages = editor.getPages()
	const index = pages.findIndex((p) => p.id === editor.getCurrentPageId())
	const target = index + direction
	if (target < 0) return
	if (target >= pages.length) {
		// Like a board's "next page": past the last page, start a fresh one, but don't pile up blanks.
		if (editor.getCurrentPageShapeIds().size === 0) return
		const id = PageRecordType.createId()
		editor.markHistoryStoppingPoint('new page')
		editor.createPage({ id, name: `Page ${pages.length + 1}` })
		editor.setCurrentPage(id)
		return
	}
	editor.setCurrentPage(pages[target].id)
}

function isTyping(e: KeyboardEvent) {
	const el = e.target as HTMLElement | null
	return !!el?.closest('input, textarea, [contenteditable="true"]')
}

/** Big previous/next page buttons, plus PageUp/PageDown (presentation clickers send these),
 * arrow keys when nothing is selected, and P to play or pause a video. */
export function PageNavigator() {
	const editor = useEditor()
	const { index, count } = useValue(
		'pages',
		() => {
			const pages = editor.getPages()
			return {
				index: pages.findIndex((p) => p.id === editor.getCurrentPageId()),
				count: pages.length,
			}
		},
		[editor]
	)

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (isTyping(e) || editor.getEditingShapeId()) return
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const nothingSelected = editor.getSelectedShapeIds().length === 0
			let handled = true
			if (e.key === 'PageDown' || (e.key === 'ArrowRight' && nothingSelected)) goToPage(editor, 1)
			else if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && nothingSelected)) goToPage(editor, -1)
			else if ((e.key === 'p' || e.key === 'P') && !e.shiftKey) handled = togglePlayback(editor)
			else handled = false
			if (handled) {
				e.preventDefault()
				e.stopPropagation()
			}
		}
		window.addEventListener('keydown', onKeyDown, true)
		return () => window.removeEventListener('keydown', onKeyDown, true)
	}, [editor])

	return (
		<div className="page-nav">
			<button
				className="page-nav__button"
				onClick={() => goToPage(editor, -1)}
				disabled={index <= 0}
				title="Previous page (Page Up or ←)"
			>
				‹
			</button>
			<span className="page-nav__label">
				{index + 1} / {count}
			</span>
			<button
				className="page-nav__button"
				onClick={() => goToPage(editor, 1)}
				title="Next page (Page Down or →). Adds a page after the last one."
			>
				›
			</button>
		</div>
	)
}
