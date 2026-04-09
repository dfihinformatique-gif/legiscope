import { buildDirectivesFromPjlBlock } from "$lib/pjl/block_directives"
import {
	buildDirectivePreviewId,
	collectArticleNumsFromText,
} from "$lib/pjl/projection"
import type {
	PjlArticleBlock,
	PjlPreviewMode,
	PjlPreviewRequestEntry,
} from "$lib/pjl/types"

export type PjlActionContext = {
	articleId: string
	href: string
	actionParagraph: Element
	pjlArticleLabel: string
	blockHtml: string
	blockText: string
	blockNodes: Element[]
	articleNum?: string
}

type ElementTextIndex = {
	text: string
	starts: Array<{ node: Text; offset: number }>
	ends: Array<{ node: Text; offset: number }>
}

type TextRangeMatch = {
	element: Element
	start: number
	stop: number
}

type BlockLineInfo = {
	index: number
	text: string
	start: number
	stop: number
	element: Element
}

type PreviewHighlightPart =
	| "target-reference"
	| "action-verb"
	| "source-text"
	| "replacement-text"

type PreviewClickScope = "context-target" | "local-target"

export type PjlPreviewController = {
	previewRequests: Map<string, PjlPreviewRequestEntry>
	activatePreview: (previewId: string, anchorElement: Element) => void
	clearActivePreview: () => void
	cleanup: () => void
}

export function normalizeLineText(value: string | null): string {
	return (value ?? "").replace(/\s+/g, " ").trim()
}

function normalizeComparableText(value: string | null): string {
	return normalizeLineText(value)
		.replace(/[’']/g, "'")
		.replace(/[‐‑‒–—]/g, "-")
}

const ACTION_RANGE_PATTERNS = [
	/\b(?:est|sont)\s+remplac(?:é|ée|és|ées)?s?\s+par\b/iu,
	/\b(?:est|sont)\s+complét(?:é|ée|és|ées)?s?\s+par\b/iu,
	/\b(?:est|sont)\s+insér(?:é|ée|és|ées)?s?\b/iu,
	/\b(?:est|sont)\s+supprim(?:é|ée|és|ées)?s?\b/iu,
	/\b(?:est|sont)\s+abrog(?:é|ée|és|ées)?s?\b/iu,
	/\b(?:est|sont)\s+rétabli(?:e|es|s)?\b/iu,
	/\b(?:est|sont)\s+ainsi\s+modifi(?:é|ée|és|ées)?s?\b/iu,
	/\best\s+modifié\b/iu,
]

const LIST_MARKER_RE =
	/^\s*(?:[IVXLCDM]+|[ivxlcdm]+|\d+|[a-zA-Z])\s*(?:°|\.|\)|-|–|—)\s+/u

export function trimBlockTextAtSectionBreak(text: string): string {
	const startsWithLetterMarker =
		/^\s*[A-Z]\s*(?:\.\s*(?:-|–|—)?|[-–—])\s+/u.test(text)
	if (!startsWithLetterMarker) return text
	const sectionMarkerRe = /\n\s*[A-Z]\s*(?:\.\s*(?:-|–|—)?|[-–—])\s+/u
	const match = sectionMarkerRe.exec(text)
	if (!match || match.index <= 0) return text
	return text.slice(0, match.index).trimEnd()
}

function getPjlArticleLabelForLink(link: HTMLAnchorElement): string | null {
	const section = link.closest('div[class^="assnatSection"]')
	if (!section) return null
	const text = normalizeLineText(section.textContent)
	const match = /\bARTICLE\s+([0-9IVXLCDM]+|unique)\b/i.exec(text)
	if (!match) return null
	const raw = match[1] ?? ""
	if (!raw) return null
	if (/^unique$/i.test(raw)) return "Article unique"
	return `Article ${raw.toUpperCase()}`
}

function hasActionVerb(text: string): boolean {
	const withoutQuotes = text
		.split("\n")
		.map((line) => line.replace(/«[^»]*»/g, " "))
		.join(" ")
	const normalized = withoutQuotes
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
	return /\b(insere|ajout|remplac|supprim|abrog|complet|retabl|modifi)/.test(
		normalized,
	)
}

function findDirectiveActionIndex(text: string): number | null {
	const comparableText = normalizeComparableText(text)
	for (const pattern of ACTION_RANGE_PATTERNS) {
		const match = pattern.exec(comparableText)
		if (match?.index !== undefined) {
			return match.index
		}
	}
	return null
}

function stripListMarker(text: string): string {
	return text.replace(LIST_MARKER_RE, "").trim()
}

function trimReferenceSuffix(text: string): string {
	return text.replace(/[,:;]\s*$/u, "").trim()
}

function extractTargetReferenceTextFromLine(line: string): string | null {
	const normalized = normalizeLineText(line)
	if (!normalized || normalized.startsWith("«")) return null
	const withoutMarker = stripListMarker(normalized)
	if (!withoutMarker) return null
	const actionIndex = findDirectiveActionIndex(withoutMarker)
	if (actionIndex !== null) {
		return trimReferenceSuffix(withoutMarker.slice(0, actionIndex))
	}
	if (withoutMarker.endsWith(":")) {
		return trimReferenceSuffix(withoutMarker.slice(0, -1))
	}
	return trimReferenceSuffix(withoutMarker)
}

function isDispositiveElement(node: Element): boolean {
	let current: Element | null = node
	while (current) {
		const className = current.getAttribute("class")
		if (className && className.toLowerCase().includes("projetloi")) {
			return true
		}
		current = current.parentElement
	}
	return false
}

function findActionParagraphForLink(
	nodes: Element[],
	paragraph: Element,
	boundary?: ParentNode,
): Element {
	const paragraphText = normalizeLineText(paragraph.textContent)
	if (!paragraphText.startsWith("«")) return paragraph
	const isInDispositive = isDispositiveElement(paragraph)
	if (!isInDispositive) return paragraph
	const startIndex = nodes.findIndex((node) => node.contains(paragraph))
	if (startIndex === -1) return paragraph
	for (let i = startIndex - 1; i >= 0; i -= 1) {
		const candidate = nodes[i]
		if (boundary instanceof Element && !boundary.contains(candidate)) break
		if (!isDispositiveElement(candidate)) break
		const candidateText = normalizeLineText(candidate.textContent)
		if (!candidateText) continue
		if (candidateText.startsWith("«")) continue
		return candidate
	}
	return paragraph
}

function getElementTextOffsetWithin(
	container: Element,
	target: Element,
): number | null {
	const ownerDocument = container.ownerDocument
	const walker = ownerDocument.createTreeWalker(container, 4)
	let offset = 0
	while (walker.nextNode()) {
		const node = walker.currentNode as Text
		const parent = node.parentElement
		if (parent && target.contains(parent)) {
			return offset
		}
		offset += node.data.length
	}
	return null
}

function isElementInsideFrenchQuotes(
	container: Element,
	target: Element,
): boolean {
	const offset = getElementTextOffsetWithin(container, target)
	if (offset === null) return false
	const before = (container.textContent ?? "").slice(0, offset)
	const openQuotes = (before.match(/«/gu) ?? []).length
	const closeQuotes = (before.match(/»/gu) ?? []).length
	return openQuotes > closeQuotes
}

function getLinkTargets(node: Element): string[] {
	const actionLinks = Array.from(
		node.querySelectorAll<HTMLAnchorElement>("a.law-article-link"),
	)
	return actionLinks
		.filter((actionLink) => !isElementInsideFrenchQuotes(node, actionLink))
		.map((actionLink) => {
			const actionHref = actionLink.getAttribute("href")
			if (!actionHref) return null
			const actionUrl = new URL(actionHref, window.location.origin)
			return actionUrl.searchParams.get("article")
		})
		.filter((value): value is string => Boolean(value))
}

function findContextTargets(
	nodes: Element[],
	startNode: Element,
	boundary?: ParentNode,
): string[] {
	const startIndex = nodes.findIndex((node) => node.contains(startNode))
	if (startIndex === -1) return []
	for (let i = startIndex; i >= 0; i -= 1) {
		const candidate = nodes[i]
		if (boundary instanceof Element && !boundary.contains(candidate)) break
		if (!isDispositiveElement(candidate)) break
		const candidateText = normalizeLineText(candidate.textContent)
		if (!candidateText || candidateText.startsWith("«")) continue
		const targets = getLinkTargets(candidate)
		if (targets.length > 0) return targets
	}
	return []
}

function extractArticleNumFromLinkText(
	text: string | null,
): string | undefined {
	return collectArticleNumsFromText(text ?? "")[0]
}

export function collectPjlActionContexts(
	root: ShadowRoot,
	scope?: ParentNode,
): PjlActionContext[] {
	const contexts: PjlActionContext[] = []
	const seen = new Set<string>()
	const nodes = Array.from(root.querySelectorAll("p, li, table"))
	const links = Array.from(
		(scope ?? root).querySelectorAll<HTMLAnchorElement>("a.law-article-link"),
	)
	const scopeElement = scope instanceof Element ? scope : undefined

	for (const link of links) {
		const href = link.getAttribute("href")
		if (!href) continue
		const lawUrl = new URL(href, window.location.origin)
		const articleId = lawUrl.searchParams.get("article")
		if (!articleId) continue

		const paragraph = link.closest("p, li") ?? link.parentElement
		if (!paragraph || !isDispositiveElement(paragraph)) continue

		const isQuotedLine = normalizeLineText(paragraph.textContent).startsWith(
			"«",
		)
		const actionParagraph = findActionParagraphForLink(
			nodes,
			paragraph,
			scopeElement,
		)
		const actionTargets = getLinkTargets(actionParagraph)
		const contextTargets = findContextTargets(
			nodes,
			actionParagraph,
			scopeElement,
		)
		const targetPool =
			contextTargets.length > 0 ? contextTargets : actionTargets
		if (isQuotedLine && targetPool.length === 0) continue
		if (targetPool.length > 0 && !targetPool.includes(articleId)) continue

		const paragraphText = normalizeLineText(actionParagraph.textContent)
		if (paragraphText.startsWith("«")) continue

		const block = collectPjlBlock(root, actionParagraph)
		const blockText = trimBlockTextAtSectionBreak(block.text)
		if (!blockText || !hasActionVerb(blockText)) continue

		const key = `${articleId}||${blockText}`
		if (seen.has(key)) continue
		seen.add(key)

		contexts.push({
			articleId,
			href,
			actionParagraph,
			pjlArticleLabel: getPjlArticleLabelForLink(link) ?? "Article",
			blockHtml: block.html,
			blockText,
			blockNodes: block.nodes,
			articleNum: extractArticleNumFromLinkText(link.textContent),
		})
	}

	return contexts
}

export function buildPjlArticleBlocks(
	root: ShadowRoot,
): Record<string, PjlArticleBlock[]> {
	const result: Record<string, PjlArticleBlock[]> = {}
	const dedupe = new Map<string, Set<string>>()
	for (const context of collectPjlActionContexts(root)) {
		const key = `${context.pjlArticleLabel}||${context.blockText}`
		const existing = dedupe.get(context.articleId) ?? new Set<string>()
		if (existing.has(key)) continue
		existing.add(key)
		dedupe.set(context.articleId, existing)

		if (!result[context.articleId]) {
			result[context.articleId] = []
		}
		result[context.articleId].push({
			pjlArticleLabel: context.pjlArticleLabel,
			blockHtml: context.blockHtml,
			blockText: context.blockText,
		})
	}
	return result
}

function getListMarkerLevel(text: string): number | null {
	const match =
		/^\s*([IVXLCDM]+|[ivxlcdm]+|\d+|[a-zA-Z])\s*(°|\.|\)|-|–|—)\s+/u.exec(text)
	if (!match) return null
	const marker = match[1] ?? ""
	const separator = match[2] ?? ""
	if (!marker) return null
	if (/^[IVXLCDM]+$/u.test(marker)) return 1
	if (/^[A-Z]$/u.test(marker) && separator !== ")") return 1
	if (
		/^[ivxlcdm]+$/u.test(marker) &&
		(marker.length > 1 || /^[ivx]$/u.test(marker))
	) {
		return 4
	}
	if (/^\d+$/u.test(marker)) return 2
	if (/^[a-zA-Z]$/u.test(marker)) return 3
	return null
}

export function collectPjlBlock(
	root: ShadowRoot,
	startNode: Element,
): { html: string; text: string; nodes: Element[] } {
	const nodes = Array.from(root.querySelectorAll("p, li, table"))
	const startIndex = nodes.findIndex((node) => node.contains(startNode))
	if (startIndex === -1) {
		return {
			html: startNode.outerHTML,
			text: normalizeLineText(startNode.textContent),
			nodes: [startNode],
		}
	}

	const collected: Element[] = []
	const start = nodes[startIndex]
	const startText = normalizeLineText(start.textContent)
	collected.push(start)

	const startHasOpenQuote = startText.includes("«")
	const startHasCloseQuote = startText.includes("»")
	let inQuoteBlock = startHasOpenQuote && !startHasCloseQuote
	const colonMode = !inQuoteBlock && startText.endsWith(":")
	let listMode = false
	let listRoot: Element | null = null
	let listQuotePending = false
	const listStartLevel = getListMarkerLevel(startText)
	const shouldBreakOnLetterSection = listStartLevel === 3
	const normalizedStart = startText
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
	const allowSameLevelItems =
		/^\s*1\s*(?:°|\.|\))\s+/u.test(startText) &&
		/\bapres\s+le\b/u.test(normalizedStart) &&
		/\binser/.test(normalizedStart)
	if (colonMode && allowSameLevelItems) {
		listMode = true
		listRoot = start.closest("ol, ul")
	}
	if (!inQuoteBlock && !startText.endsWith(":")) {
		if (listStartLevel !== null) {
			let currentLevel = listStartLevel
			const context: Element[] = []
			for (let i = startIndex - 1; i >= 0; i -= 1) {
				const previous = nodes[i]
				const prevText = normalizeLineText(previous.textContent)
				if (!prevText) continue
				const level = getListMarkerLevel(prevText)
				if (level !== null && level < currentLevel) {
					context.unshift(previous)
					currentLevel = level
					if (currentLevel === 1) break
				}
			}
			if (context.length > 0) {
				collected.unshift(...context)
			}
		}
		return {
			html: collected.map((node) => node.outerHTML).join("\n"),
			text: collected
				.map((node) => normalizeLineText(node.textContent))
				.join("\n"),
			nodes: [...collected],
		}
	}

	const listItemRe =
		/^\s*(?:[IVXLCDM]+\s*(?:°|\.|\))|[ivxlcdm]+\s*(?:°|\.|\))|\d+\s*(?:°|\.|\))|[a-zA-Z]\s*\)|[a-zA-Z]\.)\s+/u
	const topLevelLetterRe = /^\s*[A-Z]\s*(?:\.\s*(?:-|–|—)?|[-–—])\s+/u

	for (let i = startIndex + 1; i < nodes.length; i += 1) {
		const node = nodes[i]
		const text = normalizeLineText(node.textContent)
		const hasOpenQuote = text.includes("«")
		const hasCloseQuote = text.includes("»")
		const isMarkerCell = node.closest("td.texte-col-0") !== null
		const isPastille =
			node.classList.contains("pastille") ||
			node.getAttribute("data-pastille") !== null
		const isShortMarker = text.length <= 2 && !/[\p{L}\p{N}]/u.test(text)
		const isSkippableBeforeQuote =
			text.length === 0 || isMarkerCell || isPastille || isShortMarker

		if (
			shouldBreakOnLetterSection &&
			!inQuoteBlock &&
			node !== start &&
			topLevelLetterRe.test(text)
		) {
			break
		}

		if (!inQuoteBlock) {
			if (colonMode && !listMode) {
				if (hasOpenQuote) {
					inQuoteBlock = !hasCloseQuote
					collected.push(node)
					if (!inQuoteBlock) break
					continue
				}
				if (isSkippableBeforeQuote) {
					continue
				}
				if (listItemRe.test(text)) {
					listMode = true
					if (!listRoot) {
						listRoot = node.closest("ol, ul")
					}
					collected.push(node)
					listQuotePending = text.trim().endsWith(":")
					if (hasOpenQuote && !hasCloseQuote) {
						inQuoteBlock = true
						listQuotePending = false
					}
					continue
				}
				break
			}

			if (listMode) {
				if (listRoot && !listRoot.contains(node)) {
					const isNewListItem =
						listItemRe.test(text) || getListMarkerLevel(text) !== null
					if (isNewListItem) {
						listRoot = node.closest("ol, ul")
					} else {
						if (listQuotePending || hasOpenQuote) {
							if (isSkippableBeforeQuote) continue
							collected.push(node)
							if (hasOpenQuote && !hasCloseQuote) {
								inQuoteBlock = true
								listQuotePending = false
							}
							if (hasCloseQuote) listQuotePending = false
							continue
						}
						break
					}
				}
				if (listStartLevel !== null && listItemRe.test(text)) {
					const currentLevel = getListMarkerLevel(text)
					if (currentLevel !== null) {
						if (currentLevel < listStartLevel) break
						if (currentLevel === listStartLevel && !allowSameLevelItems) {
							break
						}
					}
				} else if (listStartLevel !== null && !listItemRe.test(text)) {
					const currentLevel = getListMarkerLevel(text)
					if (currentLevel !== null && currentLevel <= listStartLevel) {
						break
					}
				}
				if (isSkippableBeforeQuote) continue
				collected.push(node)
				if (listItemRe.test(text)) {
					if (hasOpenQuote && !hasCloseQuote) {
						inQuoteBlock = true
						listQuotePending = false
					} else {
						listQuotePending = text.trim().endsWith(":")
					}
				} else if (hasOpenQuote && !hasCloseQuote) {
					inQuoteBlock = true
					listQuotePending = false
				}
				continue
			}

			if (hasOpenQuote) {
				inQuoteBlock = true
			} else if (isSkippableBeforeQuote) {
				continue
			} else {
				break
			}
		}

		if (inQuoteBlock) {
			collected.push(node)
			if (hasCloseQuote) {
				inQuoteBlock = false
				listQuotePending = false
				if (!listMode) break
			}
		}
	}

	if (colonMode) {
		const fallback: Element[] = [start]
		let sawList = false
		let quoteOpen = false
		for (let i = startIndex + 1; i < nodes.length; i += 1) {
			const node = nodes[i]
			const text = normalizeLineText(node.textContent)
			const hasOpenQuote = text.includes("«")
			const hasCloseQuote = text.includes("»")
			const isEmpty = text.length === 0
			const isLi = node.tagName === "LI"
			const markerLevel = getListMarkerLevel(text)
			if (!sawList) {
				if (isEmpty) continue
				if (isLi && markerLevel !== null) {
					sawList = true
					fallback.push(node)
					if (hasOpenQuote && !hasCloseQuote) {
						quoteOpen = true
					}
					continue
				}
				break
			}

			if (isLi) {
				fallback.push(node)
				if (hasOpenQuote && !hasCloseQuote) {
					quoteOpen = true
				}
				if (hasCloseQuote) {
					quoteOpen = false
				}
				continue
			}

			if (quoteOpen) {
				if (!isEmpty) {
					fallback.push(node)
				}
				if (hasCloseQuote) {
					quoteOpen = false
				}
				continue
			}

			if (isEmpty) continue
			break
		}

		if (sawList && fallback.length > collected.length) {
			return {
				html: fallback.map((node) => node.outerHTML).join("\n"),
				text: fallback
					.map((node) => normalizeLineText(node.textContent))
					.join("\n"),
				nodes: [...fallback],
			}
		}
	}

	return {
		html: collected.map((node) => node.outerHTML).join("\n"),
		text: collected
			.map((node) => normalizeLineText(node.textContent))
			.join("\n"),
		nodes: [...collected],
	}
}

function buildElementTextIndex(element: Element): ElementTextIndex {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
	const starts: Array<{ node: Text; offset: number }> = []
	const ends: Array<{ node: Text; offset: number }> = []
	let text = ""
	let pendingWhitespace:
		| {
				node: Text
				offset: number
		  }
		| undefined

	while (walker.nextNode()) {
		const node = walker.currentNode as Text
		const value = node.data
		for (let i = 0; i < value.length; i += 1) {
			const char = value[i] ?? ""
			if (/\s/u.test(char)) {
				if (text.length > 0 && !pendingWhitespace) {
					pendingWhitespace = { node, offset: i }
				}
				continue
			}
			const normalizedChar =
				char === "’" ? "'" : /[‐‑‒–—]/u.test(char) ? "-" : char
			if (pendingWhitespace) {
				text += " "
				starts.push(pendingWhitespace)
				ends.push({ node, offset: i })
				pendingWhitespace = undefined
			}
			text += normalizedChar
			starts.push({ node, offset: i })
			ends.push({ node, offset: i + 1 })
		}
	}

	while (text.endsWith(" ")) {
		text = text.slice(0, -1)
		starts.pop()
		ends.pop()
	}

	return { text, starts, ends }
}

function findTextRangeInElements(
	elements: Element[],
	needle: string,
): TextRangeMatch | null {
	const comparableNeedle = normalizeComparableText(needle)
	if (!comparableNeedle) return null
	for (const element of elements) {
		const index = buildElementTextIndex(element)
		const start = index.text.indexOf(comparableNeedle)
		if (start === -1) continue
		return {
			element,
			start,
			stop: start + comparableNeedle.length,
		}
	}
	return null
}

function buildBlockLineInfos(context: PjlActionContext): BlockLineInfo[] {
	let offset = 0
	return context.blockNodes.map((element, index) => {
		const text = normalizeLineText(element.textContent)
		const start = offset
		const stop = start + text.length
		offset = stop + 1
		return {
			index,
			text,
			start,
			stop,
			element,
		}
	})
}

function annotatePreviewElement(
	element: Element,
	highlightId: string,
	part: PreviewHighlightPart,
	clickScope?: PreviewClickScope,
): void {
	element.classList.add("pjl-preview-part", `pjl-preview-part-${part}`)
	element.setAttribute("data-preview-highlight-id", highlightId)
	if (clickScope) {
		element.setAttribute("data-preview-click-scope", clickScope)
	}
}

function annotatePreviewClickableElement(
	element: Element,
	previewId: string,
	highlightId: string,
	mode: PjlPreviewMode,
): void {
	element.classList.add("pjl-preview-clickable")
	element.setAttribute("data-preview-id", previewId)
	element.setAttribute("data-preview-highlight-id", highlightId)
	element.setAttribute("data-preview-mode", mode)
	if (element instanceof HTMLElement && element.tabIndex < 0) {
		element.tabIndex = 0
	}
}

function wrapPreviewRangeInElement(
	element: Element,
	start: number,
	stop: number,
	highlightId: string,
	part: PreviewHighlightPart,
	clickScope?: PreviewClickScope,
): boolean {
	const index = buildElementTextIndex(element)
	if (
		start < 0 ||
		stop <= start ||
		stop > index.text.length ||
		start >= index.starts.length ||
		stop - 1 >= index.ends.length
	) {
		return false
	}
	const startBoundary = index.starts[start]
	const endBoundary = index.ends[stop - 1]
	if (!startBoundary || !endBoundary) return false

	const range = document.createRange()
	range.setStart(startBoundary.node, startBoundary.offset)
	range.setEnd(endBoundary.node, endBoundary.offset)
	const span = document.createElement("span")
	annotatePreviewElement(span, highlightId, part, clickScope)
	try {
		range.surroundContents(span)
		return true
	} catch {
		try {
			const fragment = range.extractContents()
			span.append(fragment)
			range.insertNode(span)
			return true
		} catch {
			return false
		}
	}
}

function markElementRange(
	nodes: Element[],
	first: Element,
	last: Element,
	highlightId: string,
	part: PreviewHighlightPart,
	clickScope?: PreviewClickScope,
): void {
	let inside = false
	for (const node of nodes) {
		if (node === first) inside = true
		if (!inside) continue
		annotatePreviewElement(node, highlightId, part, clickScope)
		if (node === last) break
	}
}

function findDirectiveActionRange(
	elements: Element[],
	sourceText: string,
): TextRangeMatch | null {
	const comparableSource = normalizeComparableText(sourceText)
	for (const pattern of ACTION_RANGE_PATTERNS) {
		const match = pattern.exec(comparableSource)
		if (!match || match.index === undefined) continue
		const matchedText = match[0] ?? ""
		if (!matchedText) continue
		const found = findTextRangeInElements(elements, matchedText)
		if (found) return found
	}
	return null
}

function getLineAtTextOffset(text: string, offset: number): string {
	const clampedOffset = Math.max(0, Math.min(offset, text.length))
	const lineStart = text.lastIndexOf("\n", clampedOffset - 1) + 1
	const lineEnd = text.indexOf("\n", clampedOffset)
	return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)
}

function findBlockLineInfoAtOffset(
	lineInfos: BlockLineInfo[],
	offset: number,
): BlockLineInfo | undefined {
	return lineInfos.find(
		(lineInfo) => offset >= lineInfo.start && offset <= lineInfo.stop,
	)
}

function getDirectiveSourceLineInfo(
	context: PjlActionContext,
	directive: ReturnType<
		typeof buildDirectivesFromPjlBlock
	>["directives"][number],
): BlockLineInfo | undefined {
	const lineInfos = buildBlockLineInfos(context)
	return (
		findBlockLineInfoAtOffset(lineInfos, directive.sourcePosition.start) ??
		lineInfos.find(
			(lineInfo) =>
				lineInfo.text ===
				normalizeLineText(
					getLineAtTextOffset(
						context.blockText,
						directive.sourcePosition.start,
					),
				),
		)
	)
}

function findQuoteNodeBounds(
	nodes: Element[],
): { first: Element; last: Element } | null {
	let first: Element | null = null
	let last: Element | null = null
	let openSeen = false
	for (const node of nodes) {
		const text = normalizeLineText(node.textContent)
		if (!openSeen && text.includes("«")) {
			first = node
			openSeen = true
		}
		if (openSeen) {
			last = node
			if (text.includes("»")) {
				break
			}
		}
	}
	return first && last ? { first, last } : null
}

function collectDirectiveReferenceSegments(
	context: PjlActionContext,
	directive: ReturnType<
		typeof buildDirectivesFromPjlBlock
	>["directives"][number],
): Array<{
	text: string
	clickScope: PreviewClickScope
	lineInfo?: BlockLineInfo
}> {
	const lineInfos = buildBlockLineInfos(context)
	const segments: Array<{
		text: string
		clickScope: PreviewClickScope
		lineInfo?: BlockLineInfo
	}> = []
	const seen = new Set<string>()
	const pushSegment = (
		text: string | null,
		clickScope: PreviewClickScope,
		lineInfo?: BlockLineInfo,
	): void => {
		const normalized = normalizeComparableText(text)
		if (!normalized || seen.has(normalized)) return
		seen.add(normalized)
		segments.push({ text: text!.trim(), clickScope, lineInfo })
	}

	const sourceLineInfo = getDirectiveSourceLineInfo(context, directive)
	const sourceLine =
		sourceLineInfo?.text || (directive.sourceText.split("\n")[0] ?? "")
	let currentLevel = getListMarkerLevel(sourceLine) ?? Number.POSITIVE_INFINITY

	const contextSegments: Array<{ text: string; lineInfo: BlockLineInfo }> = []
	for (
		let i = (sourceLineInfo?.index ?? lineInfos.length) - 1;
		i >= 0;
		i -= 1
	) {
		const lineInfo = lineInfos[i]
		if (!lineInfo) continue
		const line = lineInfo.text
		const referenceText = extractTargetReferenceTextFromLine(line)
		if (!referenceText) continue

		const level = getListMarkerLevel(line)
		if (level !== null) {
			if (level < currentLevel) {
				contextSegments.push({ text: referenceText, lineInfo })
				currentLevel = level
			}
			continue
		}

		if (line.endsWith(":")) {
			contextSegments.push({ text: referenceText, lineInfo })
		}
	}

	for (const segment of contextSegments.reverse()) {
		pushSegment(segment.text, "context-target", segment.lineInfo)
	}

	pushSegment(
		extractTargetReferenceTextFromLine(sourceLine),
		"local-target",
		sourceLineInfo,
	)
	return segments
}

function markDirectivePreviewHighlights(
	context: PjlActionContext,
	highlightId: string,
	directive: ReturnType<
		typeof buildDirectivesFromPjlBlock
	>["directives"][number],
): void {
	const sourceLineInfo = getDirectiveSourceLineInfo(context, directive)
	for (const segment of collectDirectiveReferenceSegments(context, directive)) {
		const referenceMatch =
			(segment.lineInfo
				? findTextRangeInElements([segment.lineInfo.element], segment.text)
				: null) ?? findTextRangeInElements(context.blockNodes, segment.text)
		if (!referenceMatch) continue
		wrapPreviewRangeInElement(
			referenceMatch.element,
			referenceMatch.start,
			referenceMatch.stop,
			highlightId,
			"target-reference",
			segment.clickScope,
		)
	}

	const actionMatch =
		(sourceLineInfo
			? findDirectiveActionRange([sourceLineInfo.element], directive.sourceText)
			: null) ??
		findDirectiveActionRange(context.blockNodes, directive.sourceText)
	if (actionMatch) {
		wrapPreviewRangeInElement(
			actionMatch.element,
			actionMatch.start,
			actionMatch.stop,
			highlightId,
			"action-verb",
		)
	}

	const targetText =
		"targetText" in directive ? directive.targetText : undefined
	if (targetText) {
		const targetMatch =
			(sourceLineInfo
				? findTextRangeInElements([sourceLineInfo.element], targetText)
				: null) ?? findTextRangeInElements(context.blockNodes, targetText)
		if (targetMatch) {
			wrapPreviewRangeInElement(
				targetMatch.element,
				targetMatch.start,
				targetMatch.stop,
				highlightId,
				"source-text",
			)
		}
	}

	const replacementText =
		"replacementText" in directive
			? directive.replacementText
			: "insertText" in directive
				? directive.insertText
				: undefined
	if (!replacementText) return
	const replacementMatch =
		(sourceLineInfo
			? findTextRangeInElements([sourceLineInfo.element], replacementText)
			: null) ?? findTextRangeInElements(context.blockNodes, replacementText)
	if (replacementMatch) {
		wrapPreviewRangeInElement(
			replacementMatch.element,
			replacementMatch.start,
			replacementMatch.stop,
			highlightId,
			"replacement-text",
		)
		return
	}

	const quoteBounds = findQuoteNodeBounds(context.blockNodes)
	if (!quoteBounds) return
	markElementRange(
		context.blockNodes,
		quoteBounds.first,
		quoteBounds.last,
		highlightId,
		"replacement-text",
	)
}

function collectPreviewPartElements(
	nodes: Element[],
	highlightId: string,
	part: PreviewHighlightPart,
	clickScope?: PreviewClickScope,
): Element[] {
	const selector = `.pjl-preview-part-${part}[data-preview-highlight-id="${CSS.escape(highlightId)}"]`
	const seen = new Set<Element>()
	const result: Element[] = []

	for (const node of nodes) {
		if (
			node.matches(selector) &&
			(!clickScope ||
				node.getAttribute("data-preview-click-scope") === clickScope) &&
			!seen.has(node)
		) {
			seen.add(node)
			result.push(node)
		}
		for (const nested of node.querySelectorAll(selector)) {
			if (
				clickScope &&
				nested.getAttribute("data-preview-click-scope") !== clickScope
			) {
				continue
			}
			if (seen.has(nested)) continue
			seen.add(nested)
			result.push(nested)
		}
	}

	return result
}

function markPreviewClickableElements(
	elements: Element[],
	previewId: string,
	highlightId: string,
	mode: PjlPreviewMode,
): boolean {
	if (elements.length === 0) return false
	for (const element of elements) {
		annotatePreviewClickableElement(element, previewId, highlightId, mode)
	}
	return true
}

function decoratePjlPreviewButtons(
	root: ShadowRoot,
	previewRequests: Map<string, PjlPreviewRequestEntry>,
	scope?: ParentNode,
): void {
	const decoratedDirectives = new Set<string>()

	for (const context of collectPjlActionContexts(root, scope)) {
		const { directives } = buildDirectivesFromPjlBlock(
			{
				blockText: context.blockText,
				blockHtml: context.blockHtml,
			},
			context.articleNum,
		)
		if (directives.length === 0) continue

		const quoteBounds = findQuoteNodeBounds(context.blockNodes)
		for (const directive of directives) {
			const directiveId = buildDirectivePreviewId(directive)
			const highlightId = `${context.articleId}::highlight::${directiveId}`

			markDirectivePreviewHighlights(context, highlightId, directive)

			const requestId = `${context.articleId}::single::${directiveId}`
			if (decoratedDirectives.has(requestId)) continue
			previewRequests.set(requestId, {
				articleId: context.articleId,
				href: context.href,
				mode: "single_action_diff",
				blockText: context.blockText,
				blockHtml: context.blockHtml,
				directiveId,
			})

			const clickableElements = [
				...collectPreviewPartElements(
					context.blockNodes,
					highlightId,
					"target-reference",
					"local-target",
				),
				...collectPreviewPartElements(
					context.blockNodes,
					highlightId,
					"action-verb",
				),
				...collectPreviewPartElements(
					context.blockNodes,
					highlightId,
					"replacement-text",
				),
				...collectPreviewPartElements(
					context.blockNodes,
					highlightId,
					"source-text",
				),
			]

			if (
				!markPreviewClickableElements(
					clickableElements,
					requestId,
					highlightId,
					"single_action_diff",
				)
			) {
				if (quoteBounds) {
					markPreviewClickableElements(
						[quoteBounds.first, quoteBounds.last],
						requestId,
						highlightId,
						"single_action_diff",
					)
				} else {
					annotatePreviewClickableElement(
						context.actionParagraph,
						requestId,
						highlightId,
						"single_action_diff",
					)
				}
			}
			decoratedDirectives.add(requestId)
		}
	}
}

function ensurePjlPreviewStyles(root: ShadowRoot): void {
	if (root.getElementById("pjl-preview-style")) return
	const style = document.createElement("style")
	style.id = "pjl-preview-style"
	style.textContent = `
		.pjl-preview-clickable {
			cursor: text;
			transition:
				box-shadow 0.12s ease,
				background-color 0.12s ease,
				color 0.12s ease;
		}
		.pjl-preview-clickable:focus-visible {
			outline: 1px solid rgba(217, 119, 6, 0.4);
			outline-offset: 2px;
		}
		.pjl-preview-clickable.is-preview-active {
			background-color: #fef3c7;
			box-shadow: 0 0 0 4px #fef3c7;
			border-radius: 4px;
			text-decoration-color: rgba(146, 64, 14, 0.95);
		}
		.pjl-preview-part {
			border-radius: 0.2rem;
			transition:
				background-color 0.12s ease,
				box-shadow 0.12s ease,
				color 0.12s ease;
		}
		.pjl-preview-part.is-preview-active.pjl-preview-part-target-reference {
			background: rgba(186, 230, 253, 0.9);
			box-shadow: inset 0 0 0 1px rgba(14, 116, 144, 0.22);
		}
		.pjl-preview-part.is-preview-active.pjl-preview-part-action-verb {
			background: rgba(253, 230, 138, 0.85);
			box-shadow: inset 0 0 0 1px rgba(180, 83, 9, 0.2);
		}
		.pjl-preview-part.is-preview-active.pjl-preview-part-source-text {
			background: rgba(254, 202, 202, 0.75);
			box-shadow: inset 0 0 0 1px rgba(185, 28, 28, 0.16);
		}
		.pjl-preview-part.is-preview-active.pjl-preview-part-replacement-text {
			background: rgba(187, 247, 208, 0.85);
			box-shadow: inset 0 0 0 1px rgba(22, 101, 52, 0.16);
		}
		.pjl-preview-popover {
			position: fixed;
			z-index: 40;
			display: flex;
			align-items: center;
			border: 1px solid rgba(226, 232, 240, 0.95);
			border-radius: 0.5rem;
			background: rgba(255, 255, 255, 0.98);
			box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
			padding: 0.2rem;
		}
		.pjl-preview-popover[hidden] {
			display: none;
		}
		.pjl-preview-popover-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 0.95rem;
			height: 0.95rem;
			flex: 0 0 auto;
		}
		.pjl-preview-popover-action {
			appearance: none;
			display: inline-flex;
			align-items: center;
			gap: 0.38rem;
			border: 0;
			border-radius: 0.375rem;
			background: #27272a;
			color: #fff;
			cursor: pointer;
			font: 600 0.76rem/1.15 Marianne, sans-serif;
			padding: 0.36rem 0.58rem;
			white-space: nowrap;
			transition: background-color 0.12s ease, transform 0.12s ease;
		}
		.pjl-preview-popover-action:hover {
			background: #27272a;
		}
		.pjl-preview-popover-action:focus-visible {
			outline: 1px solid rgba(63, 63, 70, 0.55);
			outline-offset: 2px;
		}
	`
	root.prepend(style)
}

function createActivePreviewHighlighter(root: ShadowRoot): {
	setActiveHighlight: (highlightId: string | undefined) => void
	cleanup: () => void
} {
	let activePreviewHighlightId: string | undefined

	const setActiveHighlight = (highlightId: string | undefined): void => {
		if (activePreviewHighlightId === highlightId) return
		if (activePreviewHighlightId) {
			const previousSelector = `[data-preview-highlight-id="${CSS.escape(activePreviewHighlightId)}"]`
			for (const element of root.querySelectorAll<HTMLElement>(
				previousSelector,
			)) {
				element.classList.remove("is-preview-active")
			}
		}
		activePreviewHighlightId = highlightId
		if (!highlightId) return
		const selector = `[data-preview-highlight-id="${CSS.escape(highlightId)}"]`
		for (const element of root.querySelectorAll<HTMLElement>(selector)) {
			element.classList.add("is-preview-active")
		}
	}

	return {
		setActiveHighlight,
		cleanup() {
			setActiveHighlight(undefined)
		},
	}
}

function createPreviewPopover(
	root: ShadowRoot,
	previewRequests: Map<string, PjlPreviewRequestEntry>,
): {
	show: (previewId: string, anchorElement: Element) => void
	hide: () => void
	panel: HTMLDivElement
} {
	const panel = document.createElement("div")
	panel.className = "pjl-preview-popover"
	panel.hidden = true

	const actionButton = document.createElement("button")
	actionButton.type = "button"
	actionButton.className = "pjl-preview-popover-action"
	actionButton.dataset.previewPopoverAction = "true"
	const icon = document.createElement("span")
	icon.className = "pjl-preview-popover-icon"
	icon.innerHTML = `
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
			<circle cx="12" cy="12" r="3"></circle>
		</svg>
	`
	const actionLabel = document.createElement("span")

	actionButton.append(icon, actionLabel)
	panel.append(actionButton)
	root.append(panel)

	const hide = (): void => {
		panel.hidden = true
		actionButton.removeAttribute("data-preview-id")
	}

	const show = (previewId: string, anchorElement: Element): void => {
		const request = previewRequests.get(previewId)
		if (!request) {
			hide()
			return
		}
		actionButton.dataset.previewId = previewId
		actionLabel.textContent = "voir le droit projeté"

		panel.hidden = false
		const rect = anchorElement.getBoundingClientRect()
		const margin = 12
		panel.style.width = "auto"
		panel.style.left = `${margin}px`
		panel.style.top = `${margin}px`

		const panelRect = panel.getBoundingClientRect()
		const preferredLeft = rect.left + rect.width / 2 - panelRect.width / 2
		const preferredTop = rect.bottom + 14
		const left = Math.max(
			margin,
			Math.min(preferredLeft, window.innerWidth - panelRect.width - margin),
		)
		const topCandidate =
			preferredTop <= window.innerHeight - panelRect.height - margin
				? preferredTop
				: Math.max(margin, rect.top - panelRect.height - 14)
		const top = Math.max(margin, topCandidate)
		panel.style.left = `${left}px`
		panel.style.top = `${top}px`
	}

	return {
		show,
		hide,
		panel,
	}
}

function setupLazyPjlPreviewDecoration(
	root: ShadowRoot,
	previewRequests: Map<string, PjlPreviewRequestEntry>,
): () => void {
	const host = root.host as HTMLElement
	const sections = Array.from(
		root.querySelectorAll<HTMLElement>('div[class^="assnatSection"]'),
	)
	const decoratedSections = new Set<HTMLElement>()

	const decorateSection = (section: HTMLElement): void => {
		if (decoratedSections.has(section)) return
		decoratedSections.add(section)
		decoratePjlPreviewButtons(root, previewRequests, section)
	}

	const decorateHashSection = (): void => {
		const hash = window.location.hash
		if (!hash) return
		const target = root.getElementById(hash.slice(1))
		const section = target?.closest('div[class^="assnatSection"]')
		if (!(section instanceof HTMLElement)) return
		decorateSection(section)
		const index = sections.indexOf(section)
		for (const neighbor of sections.slice(Math.max(0, index - 1), index + 2)) {
			decorateSection(neighbor)
		}
	}

	const decorateCurrentArticleSections = (): void => {
		const articleId = new URL(window.location.href).searchParams.get("article")
		if (!articleId) return
		for (const section of sections) {
			if (
				section.querySelector(
					`a.law-article-link[href*="article=${CSS.escape(articleId)}"]`,
				)
			) {
				decorateSection(section)
			}
		}
	}

	for (const section of sections.slice(0, 2)) {
		decorateSection(section)
	}
	decorateHashSection()
	decorateCurrentArticleSections()

	let scrollFrame = 0
	const decorateVisibleSections = (): void => {
		scrollFrame = 0
		const hostRect = host.getBoundingClientRect()
		for (const section of sections) {
			if (decoratedSections.has(section)) continue
			const rect = section.getBoundingClientRect()
			if (
				rect.bottom >= hostRect.top - 800 &&
				rect.top <= hostRect.bottom + 800
			) {
				decorateSection(section)
			}
		}
	}

	const scheduleVisibleDecoration = (): void => {
		if (scrollFrame !== 0) return
		scrollFrame = requestAnimationFrame(decorateVisibleSections)
	}

	scheduleVisibleDecoration()
	const delayedDecoration = window.setTimeout(scheduleVisibleDecoration, 250)

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					decorateSection(entry.target as HTMLElement)
					observer.unobserve(entry.target)
				}
			}
		},
		{
			root: host,
			rootMargin: "500px 0px",
			threshold: 0,
		},
	)

	for (const section of sections) {
		if (!decoratedSections.has(section)) {
			observer.observe(section)
		}
	}

	host.addEventListener("scroll", scheduleVisibleDecoration, { passive: true })

	return () => {
		window.clearTimeout(delayedDecoration)
		if (scrollFrame !== 0) {
			cancelAnimationFrame(scrollFrame)
		}
		host.removeEventListener("scroll", scheduleVisibleDecoration)
		observer.disconnect()
	}
}

export function createPjlPreviewController(
	root: ShadowRoot,
): PjlPreviewController {
	const previewRequests = new Map<string, PjlPreviewRequestEntry>()
	ensurePjlPreviewStyles(root)
	const highlighter = createActivePreviewHighlighter(root)
	const cleanupDecoration = setupLazyPjlPreviewDecoration(root, previewRequests)
	const popover = createPreviewPopover(root, previewRequests)
	let activePreviewId: string | undefined

	const clearActivePreview = (): void => {
		activePreviewId = undefined
		highlighter.setActiveHighlight(undefined)
		popover.hide()
	}

	const activatePreview = (previewId: string, anchorElement: Element): void => {
		const request = previewRequests.get(previewId)
		if (!request) {
			clearActivePreview()
			return
		}
		activePreviewId = previewId
		const highlightId =
			anchorElement.getAttribute("data-preview-highlight-id") ?? undefined
		highlighter.setActiveHighlight(highlightId)
		popover.show(previewId, anchorElement)
	}

	const handleDocumentPointerDown = (event: PointerEvent): void => {
		if (!activePreviewId) return
		const path = event.composedPath()
		if (path.includes(root.host) || path.includes(popover.panel)) return
		clearActivePreview()
	}

	const handleEscape = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			clearActivePreview()
		}
	}

	const handleHostScroll = (): void => {
		if (activePreviewId) {
			clearActivePreview()
		}
	}

	document.addEventListener("pointerdown", handleDocumentPointerDown, true)
	window.addEventListener("keydown", handleEscape)
	;(root.host as HTMLElement).addEventListener("scroll", handleHostScroll, {
		passive: true,
	})

	return {
		previewRequests,
		activatePreview,
		clearActivePreview,
		cleanup() {
			document.removeEventListener(
				"pointerdown",
				handleDocumentPointerDown,
				true,
			)
			window.removeEventListener("keydown", handleEscape)
			;(root.host as HTMLElement).removeEventListener(
				"scroll",
				handleHostScroll,
			)
			clearActivePreview()
			cleanupDecoration()
			highlighter.cleanup()
			popover.panel.remove()
		},
	}
}
