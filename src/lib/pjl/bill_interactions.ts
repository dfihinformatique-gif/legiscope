type MinimalSelection = Pick<
	Selection,
	"isCollapsed" | "toString" | "anchorNode" | "focusNode"
>

function getSelectionElement(node: Node | null): Element | null {
	if (!node) return null
	return node instanceof Element ? node : (node.parentElement ?? null)
}

export function hasMeaningfulSelectionWithinRoot(
	selection: MinimalSelection | null | undefined,
	root: ParentNode,
): boolean {
	if (!selection || selection.isCollapsed) return false
	const selectedText = selection.toString().trim()
	if (!selectedText) return false

	const anchorElement = getSelectionElement(selection.anchorNode)
	const focusElement = getSelectionElement(selection.focusNode)

	return Boolean(
		(anchorElement && root.contains(anchorElement)) ||
		(focusElement && root.contains(focusElement)),
	)
}
