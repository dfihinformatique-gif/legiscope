function getParentElementAcrossShadowBoundary(
	node: Node | null,
): HTMLElement | null {
	if (!node) return null
	if (node instanceof HTMLElement) return node.parentElement
	if (node.parentElement) return node.parentElement
	const root = node.getRootNode()
	return root instanceof ShadowRoot ? (root.host as HTMLElement) : null
}

function isScrollable(element: HTMLElement): boolean {
	const style = window.getComputedStyle(element)
	const overflowY = style.overflowY || style.overflow
	return (
		/(auto|scroll|overlay)/.test(overflowY) &&
		element.scrollHeight > element.clientHeight + 1
	)
}

function findNearestScrollableAncestor(
	element: HTMLElement,
): HTMLElement | null {
	let current: HTMLElement | null = element
	while (current) {
		if (isScrollable(current)) return current
		current = getParentElementAcrossShadowBoundary(current)
	}
	return null
}

export function findFirstProjectedChangeElement(
	container: ParentNode,
): HTMLElement | null {
	return (
		container.querySelector<HTMLElement>(
			".bg-green-50, .bg-red-50, .line-through-diff",
		) ?? null
	)
}

export function scrollElementIntoMiddleView(
	target: HTMLElement,
	behavior: ScrollBehavior = "smooth",
): void {
	const scrollContainer = findNearestScrollableAncestor(target)
	if (!scrollContainer) {
		target.scrollIntoView({ behavior, block: "center" })
		return
	}

	const targetRect = target.getBoundingClientRect()
	const containerRect = scrollContainer.getBoundingClientRect()
	const targetTopWithinContainer =
		targetRect.top - containerRect.top + scrollContainer.scrollTop
	const nextTop =
		targetTopWithinContainer - containerRect.height / 2 + targetRect.height / 2

	scrollContainer.scrollTo({
		top: Math.max(0, nextTop),
		behavior,
	})
}
