import {
	buildArticlePortionTreeFromHtml,
	extractActionDirectivesFromText,
	extractPortionSelectors,
	getExtractedReferences,
	iterIncludedReferences,
	newReverseTransformationsMergedFromPositionsIterator,
	resolvePortionSelector,
	reversePositionsSplitFromPositions,
	simplifyHtml,
	simplifyPlainText,
	TextParserContext,
	type ActionDirective,
	type ArticlePortionAlinea,
	type ArticlePortionMatch,
	type ArticlePortionNode,
	type FragmentPosition,
	type PortionSelector,
	type PortionSelectorStep,
} from "@tricoteuses/tisseuse"

export type ActionDirectiveWithHtml = ActionDirective & {
	replacementHtml?: string
	tableColumnIndex?: number
	tableRowIndex?: number
}

export type ProjectedHtmlResult =
	| { html: string; reason?: undefined; skipDiff?: boolean }
	| { html: null; reason: string }

export type BuildDirectivesResult = {
	directives: ActionDirectiveWithHtml[]
	isAction: boolean
}

export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildNeedleRegExp(
	needle: string,
	global = false,
	relaxRightBoundary = false,
): RegExp {
	const trimmed = needle.trim()
	const startsWithWord = /^[\p{L}\p{N}]/u.test(trimmed)
	const endsWithWord = /[\p{L}\p{N}]$/u.test(trimmed)
	const corePattern = escapeRegExp(needle)
		.replace(/articles?/gi, "article[s]?")
		.replace(/[’']/g, "['’]")
		.replace(/\s+/g, "\\s+")
	const pattern =
		`${startsWithWord ? "(?<![\\p{L}\\p{N}])" : ""}${corePattern}` +
		`${endsWithWord ? (relaxRightBoundary ? "(?:(?![\\p{L}\\p{N}])|(?=[\\p{Ll}]))" : "(?![\\p{L}\\p{N}])") : ""}`
	const flags = `${global ? "g" : ""}u`
	return new RegExp(pattern, flags)
}

function findMatchInSimplifiedText(
	text: string,
	needle: string,
): FragmentPosition | null {
	if (!needle) return null
	let match = buildNeedleRegExp(needle).exec(text)
	if (!match) {
		match = buildNeedleRegExp(needle, false, true).exec(text)
	}
	if (!match || match.index === undefined) return null

	return { start: match.index, stop: match.index + match[0].length }
}

function countMatchesInSimplifiedText(text: string, needle: string): number {
	if (!needle) return 0
	const regex = buildNeedleRegExp(needle, true)
	let match: RegExpExecArray | null
	let count = 0
	while ((match = regex.exec(text)) !== null) {
		count += 1
		if (match[0].length === 0) {
			regex.lastIndex += 1
		}
	}
	return count
}

function findNthMatchInSimplifiedText(
	text: string,
	needle: string,
	occurrenceIndex: number,
): FragmentPosition | null {
	if (!needle) return null
	if (occurrenceIndex <= 1) {
		return findMatchInSimplifiedText(text, needle)
	}
	const regex = buildNeedleRegExp(needle, true)
	let match: RegExpExecArray | null
	let count = 0
	while ((match = regex.exec(text)) !== null) {
		count += 1
		if (count === occurrenceIndex) {
			return { start: match.index, stop: match.index + match[0].length }
		}
		if (match[0].length === 0) {
			regex.lastIndex += 1
		}
	}
	return null
}

function countNeedleMatchesInHtml(html: string, needle: string): number {
	const simplifiedNeedle = simplifyPlainText(needle).output
	if (!simplifiedNeedle) return 0
	const simplified = simplifyHtml()(html)
	return countMatchesInSimplifiedText(simplified.output, simplifiedNeedle)
}

export function findTextPositionInHtml(
	html: string,
	needle: string,
	occurrenceIndex = 1,
): FragmentPosition | null {
	const simplifiedNeedle = simplifyPlainText(needle).output
	const simplified = simplifyHtml()(html)
	const match =
		occurrenceIndex > 1
			? findNthMatchInSimplifiedText(
					simplified.output,
					simplifiedNeedle,
					occurrenceIndex,
				)
			: findMatchInSimplifiedText(simplified.output, simplifiedNeedle)
	if (!match) return null
	const iterator =
		newReverseTransformationsMergedFromPositionsIterator(simplified)
	const reversed = iterator.next(match).value
	if (!reversed) return null
	return reversed.position
}

function findTextPositionInHtmlWithFallback(
	html: string,
	needle: string,
	occurrenceIndex = 1,
): FragmentPosition | null {
	const normalizedOccurrence = occurrenceIndex > 0 ? occurrenceIndex : 1
	let targetPosition = findTextPositionInHtml(
		html,
		needle,
		normalizedOccurrence,
	)
	if (!targetPosition && normalizedOccurrence > 1) {
		const count = countNeedleMatchesInHtml(html, needle)
		if (count === 1) {
			targetPosition = findTextPositionInHtml(html, needle, 1)
		}
	}
	return targetPosition
}

function findPhraseBoundsInHtml(
	html: string,
	phraseIndex: number,
): FragmentPosition | null {
	const simplified = simplifyHtml()(html)
	const text = simplified.output
	if (!text.trim()) return null

	const textBounds: FragmentPosition[] = []
	const separatorRegex = /(?<=[.!?;:])\s+/gu
	let start = 0
	let match: RegExpExecArray | null

	while ((match = separatorRegex.exec(text)) !== null) {
		let segmentStart = start
		let segmentStop = match.index
		while (segmentStart < segmentStop && /\s/u.test(text[segmentStart] ?? "")) {
			segmentStart += 1
		}
		while (
			segmentStop > segmentStart &&
			/\s/u.test(text[segmentStop - 1] ?? "")
		) {
			segmentStop -= 1
		}
		if (segmentStop > segmentStart) {
			textBounds.push({ start: segmentStart, stop: segmentStop })
		}
		start = match.index + match[0].length
	}

	let lastStart = start
	let lastStop = text.length
	while (lastStart < lastStop && /\s/u.test(text[lastStart] ?? "")) {
		lastStart += 1
	}
	while (lastStop > lastStart && /\s/u.test(text[lastStop - 1] ?? "")) {
		lastStop -= 1
	}
	if (lastStop > lastStart) {
		textBounds.push({ start: lastStart, stop: lastStop })
	}

	if (textBounds.length === 0) return null
	const resolvedIndex =
		phraseIndex < 0 ? textBounds.length + phraseIndex + 1 : phraseIndex
	if (resolvedIndex < 1 || resolvedIndex > textBounds.length) return null

	const iterator =
		newReverseTransformationsMergedFromPositionsIterator(simplified)
	const reversed = iterator.next(textBounds[resolvedIndex - 1]).value
	return reversed?.position ?? null
}

function findSelectorPortionBoundsInHtml(
	html: string,
	selector: PortionSelector | undefined,
): FragmentPosition | null {
	if (!selector) return null
	if (selector.kind === "single") {
		const lastStep = selector.steps.at(-1)
		if (lastStep?.type === "phrase" && typeof lastStep.index === "number") {
			return findPhraseBoundsInHtml(html, lastStep.index)
		}
		return null
	}

	const firstStep = selector.first.at(-1)
	const lastStep = selector.last.at(-1)
	if (
		firstStep?.type !== "phrase" ||
		lastStep?.type !== "phrase" ||
		typeof firstStep.index !== "number" ||
		typeof lastStep.index !== "number"
	) {
		return null
	}

	const firstBounds = findPhraseBoundsInHtml(html, firstStep.index)
	const lastBounds = findPhraseBoundsInHtml(html, lastStep.index)
	if (!firstBounds || !lastBounds) return null
	return {
		start: Math.min(firstBounds.start, lastBounds.start),
		stop: Math.max(firstBounds.stop, lastBounds.stop),
	}
}

function findScopedTargetPositionInHtml(
	html: string,
	needle: string,
	selectorSteps: PortionSelectorStep[] | undefined,
	occurrenceIndex = 1,
): FragmentPosition | null {
	const lastStep = selectorSteps?.at(-1)
	if (
		lastStep?.type !== "phrase" ||
		typeof lastStep.index !== "number" ||
		!needle.trim()
	) {
		return findTextPositionInHtmlWithFallback(html, needle, occurrenceIndex)
	}

	const phraseBounds = findPhraseBoundsInHtml(html, lastStep.index)
	if (!phraseBounds) {
		return findTextPositionInHtmlWithFallback(html, needle, occurrenceIndex)
	}

	const phraseHtml = html.slice(phraseBounds.start, phraseBounds.stop)
	const scopedPosition = findTextPositionInHtmlWithFallback(
		phraseHtml,
		needle,
		occurrenceIndex,
	)
	if (scopedPosition) {
		return {
			start: phraseBounds.start + scopedPosition.start,
			stop: phraseBounds.start + scopedPosition.stop,
		}
	}

	return findTextPositionInHtmlWithFallback(html, needle, occurrenceIndex)
}

const NBSP_ENTITY = "&nbsp;"

function skipHtmlWhitespace(html: string, index: number): number {
	let i = index
	while (i < html.length) {
		if (html.startsWith(NBSP_ENTITY, i)) {
			i += NBSP_ENTITY.length
			continue
		}
		if (/\s/.test(html[i] ?? "")) {
			i += 1
			continue
		}
		break
	}
	return i
}

function hasHtmlWhitespaceBefore(html: string, index: number): boolean {
	if (index <= 0) return false
	const previousChar = html[index - 1] ?? ""
	if (/\s/.test(previousChar)) return true
	const start = Math.max(0, index - NBSP_ENTITY.length)
	return html.slice(start, index) === NBSP_ENTITY
}

function peekFirstNonSpaceChar(html: string, index: number): string | null {
	const i = skipHtmlWhitespace(html, index)
	if (i >= html.length) return null
	return html[i] ?? null
}

function isInsideAnchor(html: string, index: number): number | null {
	const lastOpen = html.lastIndexOf("<a", index)
	const lastClose = html.lastIndexOf("</a>", index)
	if (lastOpen !== -1 && (lastClose === -1 || lastClose < lastOpen)) {
		return lastOpen
	}
	return null
}

function getAfterAnchorIndex(html: string, stop: number): number {
	const closeIndex = html.indexOf("</a>", stop)
	if (closeIndex === -1) return stop
	return closeIndex + "</a>".length
}

function buildInsertionText(
	insert: string,
	html: string,
	index: number,
	options: { allowLeadingSpace: boolean },
	highlight = false,
): string {
	const trimmed = insert.trim()
	const leadingSpaceNeeded =
		options.allowLeadingSpace &&
		!hasHtmlWhitespaceBefore(html, index) &&
		!/^[,.;:!?]/.test(trimmed)
	const firstAfter = peekFirstNonSpaceChar(html, index)
	const needsTrailingSpace =
		trimmed.length > 0 &&
		!/\s$/.test(trimmed) &&
		firstAfter !== null &&
		!/[.,;:!?]/.test(firstAfter)
	const core =
		trimmed === ""
			? ""
			: highlight
				? `<span class="rounded-md px-0.5 bg-green-50 text-green-900">${trimmed}</span>`
				: trimmed
	return `${leadingSpaceNeeded ? " " : ""}${core}${
		needsTrailingSpace ? " " : ""
	}`
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
}

function formatReplacementText(value: string): string {
	const escaped = escapeHtml(value)
	return escaped.replace(/\n+/g, "<br>")
}

function stripHtmlToText(value: string): string {
	return value
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

function extractFirstTableHtml(value: string | undefined): string | null {
	if (!value) return null
	const match = /<table\b[\s\S]*?<\/table>/i.exec(value)
	return match?.[0] ?? null
}

export function normalizeActionSource(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
}

function isListBlockIntroLine(line: string): boolean {
	if (!line.trim().endsWith(":")) return false
	const normalized = normalizeActionSource(line)
	return /\bainsi\s+modifie/.test(normalized)
}

export function normalizeLabel(value: string): string {
	return value
		.replace(/\u00a0/g, " ")
		.replace(/[’]/g, "'")
		.replace(/[\u2011\u2013\u2014]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
}

function extractQuotedBlockText(text: string): string | null {
	const lines = text.split("\n")
	const quoted: string[] = []
	for (const line of lines) {
		const match = /^\s*«\s*(.*)$/.exec(line)
		if (!match) continue
		quoted.push(match[1] ?? "")
	}
	if (quoted.length === 0) return null
	const cleaned = quoted
		.map((line, index) =>
			index === quoted.length - 1 ? line.replace(/\s*»\s*;?\s*$/, "") : line,
		)
		.join("\n")
		.trim()
	return cleaned.length > 0 ? cleaned : null
}

function buildSectionReestablishDirective(
	blockText: string,
): ActionDirectiveWithHtml | null {
	const normalized = normalizeActionSource(blockText)
	if (!/\bsection\b/.test(normalized) || !/\bretabl/.test(normalized)) {
		return null
	}
	const insertText = extractQuotedBlockText(blockText)
	if (!insertText) return null
	const context = new TextParserContext(blockText)
	const references = getExtractedReferences(context)
	const reference =
		references.find((ref) => extractPortionSelectors(ref).length > 0) ??
		references[0]
	if (!reference) return null
	const sourcePosition = reference.position ?? { start: 0, stop: 0 }
	return {
		kind: "insert_after",
		targetType: "division",
		reference,
		portionSelectors: extractPortionSelectors(reference),
		targetText: "",
		insertText,
		sourcePosition,
		sourceText: blockText,
	}
}

export function normalizeArticleNum(value: string | null | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9-]/g, "")
}

export function collectArticleNumsFromReference(
	reference: ActionDirectiveWithHtml["reference"],
): string[] {
	const nums = new Set<string>()
	for (const ref of iterIncludedReferences(reference)) {
		if (ref.type !== "article") continue
		const normalized = normalizeArticleNum(ref.num)
		if (normalized) nums.add(normalized)
	}
	return Array.from(nums)
}

function visitReferenceTree(
	reference: ActionDirectiveWithHtml["reference"],
	visit: (reference: ActionDirectiveWithHtml["reference"]) => void,
): void {
	visit(reference)
	switch (reference.type) {
		case "parent-enfant":
			visitReferenceTree(reference.parent, visit)
			visitReferenceTree(reference.child, visit)
			break
		case "bounded-interval":
			visitReferenceTree(reference.first, visit)
			visitReferenceTree(reference.last, visit)
			break
		case "counted-interval":
			visitReferenceTree(reference.first, visit)
			break
		case "enumeration":
		case "exclusion":
			visitReferenceTree(reference.left, visit)
			visitReferenceTree(reference.right, visit)
			break
		case "reference_et_action":
			visitReferenceTree(reference.reference, visit)
			break
	}
}

function specializeDirectiveForArticle(
	directive: ActionDirectiveWithHtml,
	articleNum: string,
): ActionDirectiveWithHtml {
	if (directive.portionSelectors.length === 0) return directive
	const candidates: Array<{
		reference: ActionDirectiveWithHtml["reference"]
		selectors: PortionSelector[]
		articleCount: number
		specificity: number
	}> = []

	visitReferenceTree(directive.reference, (reference) => {
		const articleNums = collectArticleNumsFromReference(reference)
		if (articleNums.length === 0 || !articleNums.includes(articleNum)) return
		const selectors = extractPortionSelectors(reference)
		if (selectors.length === 0) return
		candidates.push({
			reference,
			selectors,
			articleCount: articleNums.length,
			specificity: getSelectorsScore(selectors),
		})
	})

	if (candidates.length === 0) return directive
	const best = candidates.sort((left, right) => {
		if (left.articleCount !== right.articleCount) {
			return left.articleCount - right.articleCount
		}
		return right.specificity - left.specificity
	})[0]
	if (!best) return directive

	return {
		...directive,
		reference: best.reference,
		portionSelectors: best.selectors,
	}
}

export function collectArticleNumsFromText(text: string): string[] {
	if (!text.trim()) return []
	const context = new TextParserContext(text)
	const references = getExtractedReferences(context)
	const nums = new Set<string>()
	for (const reference of references) {
		for (const ref of iterIncludedReferences(reference)) {
			if (ref.type !== "article") continue
			const normalized = normalizeArticleNum(ref.num)
			if (normalized) nums.add(normalized)
		}
	}
	return Array.from(nums)
}

export function filterDirectivesForArticle(
	directives: ActionDirectiveWithHtml[],
	articleNum: string | null | undefined,
): ActionDirectiveWithHtml[] {
	const normalized = normalizeArticleNum(articleNum)
	if (!normalized) return directives
	return directives.flatMap((directive) => {
		const fromReference = collectArticleNumsFromReference(directive.reference)
		if (fromReference.length > 0) {
			return fromReference.includes(normalized)
				? [specializeDirectiveForArticle(directive, normalized)]
				: []
		}
		if (directive.portionSelectors.length > 0) {
			return [directive]
		}
		const candidates = collectArticleNumsFromText(directive.sourceText)
		if (candidates.length === 0) return [directive]
		if (candidates.includes(normalized)) return [directive]
		return candidates.length > 1 ? [directive] : []
	})
}

function isActionLikeText(text: string): boolean {
	const prefix = text.split("«")[0] ?? text
	const normalized = normalizeActionSource(prefix)
	return /\b(insere|ajoute|remplace|supprime|abroge|complete|retabl|modifie)\b/.test(
		normalized,
	)
}

function formatInsertionInline(value: string): string {
	return formatReplacementText(value).trim()
}

function findParagraphBounds(
	html: string,
	paragraphIndex: number,
): { start: number; stop: number } | null {
	let searchFrom = 0
	let count = -1
	const lower = html.toLowerCase()

	while (true) {
		const openIndex = lower.indexOf("<p", searchFrom)
		if (openIndex === -1) return null
		const openEnd = lower.indexOf(">", openIndex)
		if (openEnd === -1) return null
		const closeIndex = lower.indexOf("</p>", openEnd)
		if (closeIndex === -1) return null

		count += 1
		if (count === paragraphIndex) {
			return { start: openEnd + 1, stop: closeIndex }
		}
		searchFrom = closeIndex + 4
	}
}

function listParagraphBounds(
	html: string,
): Array<{ start: number; stop: number }> {
	const bounds: Array<{ start: number; stop: number }> = []
	let searchFrom = 0
	const lower = html.toLowerCase()

	while (true) {
		const openIndex = lower.indexOf("<p", searchFrom)
		if (openIndex === -1) return bounds
		const openEnd = lower.indexOf(">", openIndex)
		if (openEnd === -1) return bounds
		const closeIndex = lower.indexOf("</p>", openEnd)
		if (closeIndex === -1) return bounds
		bounds.push({ start: openEnd + 1, stop: closeIndex })
		searchFrom = closeIndex + 4
	}
}

function findParagraphBoundsBySelectorSteps(
	html: string,
	selectorSteps: PortionSelectorStep[] | undefined,
): { start: number; stop: number } | null {
	const alineaStep = selectorSteps
		? [...selectorSteps]
				.reverse()
				.find(
					(step) => step.type === "alinéa" && typeof step.index === "number",
				)
		: undefined
	if (!alineaStep || typeof alineaStep.index !== "number") return null
	const paragraphs = listParagraphBounds(html)
	if (paragraphs.length === 0) return null
	if (alineaStep.index > 0) {
		return paragraphs[alineaStep.index - 1] ?? null
	}
	const resolvedIndex = paragraphs.length + alineaStep.index
	return resolvedIndex >= 0 ? (paragraphs[resolvedIndex] ?? null) : null
}

function getItemStepLevel(num: string | undefined): number | null {
	const normalized = (num ?? "").trim()
	if (!normalized) return null
	if (/^[IVXLCDM]+(?:\s+\w+)*$/u.test(normalized)) return 1
	if (/^\d+(?:°)?(?:\s+\w+)*$/u.test(normalized)) return 2
	if (/^[a-z](?:\s+\w+)*$/u.test(normalized)) return 3
	if (/^[ivxlcdm]+(?:\s+\w+)*$/u.test(normalized)) return 4
	return null
}

function detectParagraphItemLevel(text: string): number | null {
	const trimmed = text.trim()
	if (
		/^[IVXLCDM]+(?:\s+\w+)*\.\s*(?:[-–—]\s*)?/u.test(trimmed) ||
		/^[IVXLCDM]+(?:\s+\w+)*\s*[):]\s+/u.test(trimmed)
	) {
		return 1
	}
	if (/^\d+°(?:\s+|$)/u.test(trimmed) || /^\d+[.)]\s+/u.test(trimmed)) {
		return 2
	}
	if (/^[a-z](?:\s+\w+)*\)\s+/u.test(trimmed)) {
		return 3
	}
	if (/^[ivxlcdm]+\)\s+/u.test(trimmed)) {
		return 4
	}
	return null
}

function listParagraphEntries(
	html: string,
): Array<{ bounds: { start: number; stop: number }; text: string }> {
	return listParagraphBounds(html).map((bounds) => ({
		bounds,
		text: simplifyHtml()(html.slice(bounds.start, bounds.stop)).output.trim(),
	}))
}

function findParagraphBoundsWithinItemScope(
	html: string,
	selectorSteps: PortionSelectorStep[] | undefined,
): { start: number; stop: number } | null {
	const itemStep = selectorSteps
		? [...selectorSteps]
				.reverse()
				.find((step) => step.type === "item" && typeof step.num === "string")
		: undefined
	if (!itemStep?.num) return null

	const entries = listParagraphEntries(html)
	if (entries.length === 0) return null
	const needles = buildItemLabelNeedles(itemStep.num)
	const startIndex = entries.findIndex((entry) =>
		needles.some((needle) =>
			entry.text.toLowerCase().startsWith(needle.trim().toLowerCase()),
		),
	)
	if (startIndex < 0) return null

	const currentLevel = getItemStepLevel(itemStep.num)
	let endIndex = entries.length
	for (let index = startIndex + 1; index < entries.length; index += 1) {
		const level = detectParagraphItemLevel(entries[index]?.text ?? "")
		if (level !== null && currentLevel !== null && level <= currentLevel) {
			endIndex = index
			break
		}
	}

	const alineaStep = selectorSteps
		? [...selectorSteps]
				.reverse()
				.find(
					(step) => step.type === "alinéa" && typeof step.index === "number",
				)
		: undefined
	if (!alineaStep || typeof alineaStep.index !== "number") {
		return entries[startIndex]?.bounds ?? null
	}

	const scopedLength = endIndex - startIndex
	if (scopedLength <= 0) return null
	const resolvedIndex =
		alineaStep.index > 0
			? startIndex + alineaStep.index - 1
			: endIndex + alineaStep.index
	return resolvedIndex >= startIndex && resolvedIndex < endIndex
		? (entries[resolvedIndex]?.bounds ?? null)
		: null
}

function findParagraphBoundsByScopedSelectorSteps(
	html: string,
	selectorSteps: PortionSelectorStep[] | undefined,
): { start: number; stop: number } | null {
	return (
		findParagraphBoundsWithinItemScope(html, selectorSteps) ??
		findParagraphBoundsBySelectorSteps(html, selectorSteps)
	)
}

function findTableBoundsAfter(
	html: string,
	startIndex: number,
): { start: number; stop: number } | null {
	const lower = html.toLowerCase()
	const tableStart = lower.indexOf("<table", startIndex)
	if (tableStart === -1) return null
	const tableEnd = lower.indexOf("</table>", tableStart)
	if (tableEnd === -1) return null
	return { start: tableStart, stop: tableEnd + "</table>".length }
}

function wrapTableReplacement(oldHtml: string, newHtml: string): string {
	const removed = `<div class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${oldHtml}</div>`
	const added = `<div class="rounded-md px-0.5 bg-green-50 text-green-900">${newHtml}</div>`
	return `${removed}${added}`
}

function findBlockBoundsFromIndex(
	html: string,
	index: number,
): { start: number; stop: number } | null {
	const tags = ["p", "li"]
	let best: { start: number; stop: number } | null = null
	const lower = html.toLowerCase()
	for (const tag of tags) {
		const open = lower.lastIndexOf(`<${tag}`, index)
		if (open === -1) continue
		const close = lower.indexOf(`</${tag}>`, index)
		if (close === -1) continue
		const candidate = { start: open, stop: close + tag.length + 3 }
		if (!best || candidate.start > best.start) {
			best = candidate
		}
	}
	return best
}

function findBlockBoundsForNeedles(
	html: string,
	needles: string[],
): { start: number; stop: number } | null {
	for (const needle of needles) {
		const position = findTextPositionInHtml(html, needle)
		if (!position) continue
		const bounds = findBlockBoundsFromIndex(html, position.start)
		if (bounds) return bounds
	}
	return null
}

function buildItemLabelNeedles(label: string): string[] {
	const normalized = label.trim()
	if (!normalized) return []
	const variants = [
		normalized,
		normalized.toLowerCase(),
		normalized.toUpperCase(),
	].filter((variant, index, array) => array.indexOf(variant) === index)
	return variants.flatMap((variant) => {
		const suffixes = [". ", ") ", ".- ", ". – ", ". — ", " - ", " – ", " — "]
		if (/[°.)]$/.test(variant)) {
			suffixes.push(" ")
		}
		return suffixes
			.filter((suffix, index, array) => array.indexOf(suffix) === index)
			.map((suffix) => `${variant}${suffix}`)
	})
}

function findItemLabelBounds(
	html: string,
	steps: Array<{ type: string; num?: string }> | undefined,
): { start: number; stop: number } | null {
	const lastStep = steps && steps.length > 0 ? steps[steps.length - 1] : null
	if (!lastStep || lastStep.type !== "item" || !lastStep.num) return null
	const needles = buildItemLabelNeedles(lastStep.num)
	return findBlockBoundsForNeedles(html, needles)
}

function getSelectorSteps(
	selector: PortionSelector | undefined,
): PortionSelectorStep[] | undefined {
	if (!selector) return undefined
	if (selector.kind === "single") return selector.steps
	return selector.last.length > 0 ? selector.last : selector.first
}

function buildTableReplacementDirective(
	blockText: string,
	blockHtml: string | undefined,
): ActionDirectiveWithHtml | null {
	const tableHtml = extractFirstTableHtml(blockHtml)
	if (!tableHtml) return null
	const normalized = normalizeActionSource(blockText)
	if (!/\btableau\b/.test(normalized) || !/\bremplac/.test(normalized)) {
		return null
	}
	const actionMatch = /\bremplac(?:e|é|ée|és|ées)\b/i.exec(blockText)
	const actionIndex = actionMatch?.index ?? blockText.length
	const context = new TextParserContext(blockText)
	const references = getExtractedReferences(context)
	const candidates = references
		.filter((reference) => (reference.position?.start ?? 0) <= actionIndex)
		.map((reference) => ({
			reference,
			selectors: extractPortionSelectors(reference),
		}))
		.filter((candidate) => candidate.selectors.length > 0)
	if (candidates.length === 0) return null

	const best = candidates
		.map((candidate) => ({
			...candidate,
			score: getSelectorsScore(candidate.selectors),
		}))
		.sort((a, b) => b.score - a.score)[0]

	if (!best) return null

	return {
		kind: "replace_portion",
		targetType: "portion",
		reference: best.reference,
		portionSelectors: best.selectors,
		replacementText: stripHtmlToText(tableHtml),
		replacementHtml: tableHtml,
		sourcePosition: { start: 0, stop: blockText.length },
		sourceText: blockText,
	}
}

function parseTableOrdinalIndex(token: string): number | null {
	const normalized = normalizeActionSource(token).replace(/\.$/, "")
	if (!normalized) return null
	if (/^\d+$/.test(normalized)) {
		const value = Number.parseInt(normalized, 10)
		return Number.isFinite(value) && value > 0 ? value : null
	}
	const ordinals: Record<string, number> = {
		premier: 1,
		premiere: 1,
		second: 2,
		seconde: 2,
		deuxieme: 2,
		troisieme: 3,
		quatrieme: 4,
		cinquieme: 5,
		sixieme: 6,
		septieme: 7,
		huitieme: 8,
		neuvieme: 9,
		dixieme: 10,
		onzieme: 11,
		douzieme: 12,
		treizieme: 13,
		quatorzieme: 14,
		quinzieme: 15,
		seizieme: 16,
		dixseptieme: 17,
		dixhuitieme: 18,
		dixneuvieme: 19,
		vingtieme: 20,
	}
	return ordinals[normalized] ?? null
}

function findBestReferenceCandidate(blockText: string): {
	reference: ActionDirective["reference"]
	selectors: PortionSelector[]
} | null {
	const context = new TextParserContext(blockText)
	const references = getExtractedReferences(context)
	const candidates = references
		.map((reference) => ({
			reference,
			selectors: extractPortionSelectors(reference),
		}))
		.filter((candidate) => candidate.selectors.length > 0)
	if (candidates.length === 0) return null
	return candidates
		.map((candidate) => ({
			...candidate,
			score: getSelectorsScore(candidate.selectors),
		}))
		.sort((a, b) => b.score - a.score)[0]
}

function buildTableStructuredDirectives(
	blockText: string,
): ActionDirectiveWithHtml[] | null {
	const firstLine = blockText
		.split("\n")
		.map((line) => line.trim())
		.find(Boolean)
	if (!firstLine) return null
	const normalizedFirstLine = normalizeActionSource(firstLine)
	if (!/^(?:\d+°\s+)?au tableau\b/.test(normalizedFirstLine)) {
		return null
	}
	const bestReference = findBestReferenceCandidate(blockText)
	if (!bestReference) return null

	const directives: ActionDirectiveWithHtml[] = []
	const lines = blockText
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
	let activeRowIndex: number | null = null
	let activeColumnIndex: number | null = null

	for (const line of lines) {
		const deleteRowMatch =
			/^[a-z]\)\s+La\s+([0-9A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)\s+ligne\s+est\s+supprimée\s*;?$/iu.exec(
				line,
			)
		if (deleteRowMatch) {
			const rowIndex = parseTableOrdinalIndex(deleteRowMatch[1])
			if (rowIndex) {
				directives.push({
					kind: "delete_portion",
					targetType: "portion",
					reference: bestReference.reference,
					portionSelectors: [],
					sourcePosition: { start: 0, stop: line.length },
					sourceText: line,
					tableRowIndex: rowIndex,
				})
			}
			activeRowIndex = null
			activeColumnIndex = null
			continue
		}

		const cellContextMatch =
			/^[a-z]\)\s+A\s+la\s+([0-9A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)\s+ligne\s+de\s+la\s+([0-9A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)\s+colonne\s*:\s*$/iu.exec(
				line,
			)
		if (cellContextMatch) {
			activeRowIndex = parseTableOrdinalIndex(cellContextMatch[1])
			activeColumnIndex = parseTableOrdinalIndex(cellContextMatch[2])
			continue
		}

		const replacementMatch =
			/^(?:[ivxlcdm]+\)\s+)?Le montant\s*:\s*«\s*(.+?)\s*»\s+est remplacé par le montant\s*:\s*«\s*(.+?)\s*»\s*;?$/iu.exec(
				line,
			)
		if (
			replacementMatch &&
			activeRowIndex &&
			activeColumnIndex &&
			!/\bau\s+1er\s+janvier\b/iu.test(line)
		) {
			directives.push({
				kind: "replace",
				targetType: "portion",
				reference: bestReference.reference,
				portionSelectors: [],
				targetText: replacementMatch[1].trim(),
				replacementText: replacementMatch[2].trim(),
				sourcePosition: { start: 0, stop: line.length },
				sourceText: line,
				tableRowIndex: activeRowIndex,
				tableColumnIndex: activeColumnIndex,
			})
		}
	}

	return directives.length > 0 ? directives : null
}

function findNthTableRowBounds(
	tableHtml: string,
	rowIndex: number,
): { start: number; stop: number } | null {
	if (rowIndex < 1) return null
	const regex = /<tr\b[^>]*>[\s\S]*?<\/tr>/giu
	let match: RegExpExecArray | null
	let currentIndex = 0
	while ((match = regex.exec(tableHtml)) !== null) {
		currentIndex += 1
		if (currentIndex === rowIndex) {
			return {
				start: match.index,
				stop: match.index + match[0].length,
			}
		}
	}
	return null
}

function addClassToOpeningTag(tagHtml: string, className: string): string {
	const classMatch = /\bclass=(["'])(.*?)\1/iu.exec(tagHtml)
	if (!classMatch) {
		return tagHtml.replace(/^<([A-Za-z0-9:-]+)/u, `<$1 class="${className}"`)
	}
	const existing = classMatch[2].trim()
	const merged = existing ? `${existing} ${className}` : className
	return (
		tagHtml.slice(0, classMatch.index) +
		`class=${classMatch[1]}${merged}${classMatch[1]}` +
		tagHtml.slice(classMatch.index + classMatch[0].length)
	)
}

function highlightDeletedTableRow(rowHtml: string): string {
	const openTagMatch = /^<tr\b[^>]*>/iu.exec(rowHtml)
	if (!openTagMatch) return rowHtml
	return (
		addClassToOpeningTag(
			openTagMatch[0],
			"bg-red-50 text-red-900 line-through-diff",
		) + rowHtml.slice(openTagMatch[0].length)
	)
}

function applyTableRowDeletionToHtml(
	html: string,
	rowIndex: number,
): ProjectedHtmlResult {
	const tableBounds = findTableBoundsAfter(html, 0)
	if (!tableBounds) {
		return {
			html: null,
			reason:
				"Tableau cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}
	const tableHtml = html.slice(tableBounds.start, tableBounds.stop)
	const rowBounds = findNthTableRowBounds(tableHtml, rowIndex)
	if (!rowBounds) {
		return {
			html: null,
			reason:
				"Ligne cible introuvable dans le tableau pour appliquer la modification.",
		}
	}
	const rowHtml = tableHtml.slice(rowBounds.start, rowBounds.stop)
	const updatedTable =
		tableHtml.slice(0, rowBounds.start) +
		highlightDeletedTableRow(rowHtml) +
		tableHtml.slice(rowBounds.stop)
	return {
		html:
			html.slice(0, tableBounds.start) +
			updatedTable +
			html.slice(tableBounds.stop),
		skipDiff: true,
	}
}

function findNthTableCellContentBounds(
	rowHtml: string,
	columnIndex: number,
): { start: number; stop: number } | null {
	if (columnIndex < 1) return null
	const regex = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/giu
	let match: RegExpExecArray | null
	let currentIndex = 0
	while ((match = regex.exec(rowHtml)) !== null) {
		currentIndex += 1
		if (currentIndex === columnIndex) {
			const openTagLength = match[0].indexOf(">") + 1
			const start = match.index + openTagLength
			const stop = match.index + match[0].length - `</${match[1]}>`.length
			return { start, stop }
		}
	}
	return null
}

function findScopedTargetPositionInTableCell(
	html: string,
	rowIndex: number,
	columnIndex: number,
	targetText: string,
): FragmentPosition | null {
	const tableBounds = findTableBoundsAfter(html, 0)
	if (!tableBounds) return null
	const tableHtml = html.slice(tableBounds.start, tableBounds.stop)
	const rowBounds = findNthTableRowBounds(tableHtml, rowIndex)
	if (!rowBounds) return null
	const rowHtml = tableHtml.slice(rowBounds.start, rowBounds.stop)
	const cellBounds = findNthTableCellContentBounds(rowHtml, columnIndex)
	if (!cellBounds) return null
	const cellHtml = rowHtml.slice(cellBounds.start, cellBounds.stop)
	const targetPosition = findTextPositionInHtmlWithFallback(
		cellHtml,
		targetText,
	)
	if (!targetPosition) return null
	return {
		start:
			tableBounds.start +
			rowBounds.start +
			cellBounds.start +
			targetPosition.start,
		stop:
			tableBounds.start +
			rowBounds.start +
			cellBounds.start +
			targetPosition.stop,
	}
}

function getMatchAlinea(
	match: ArticlePortionMatch,
): ArticlePortionAlinea | null {
	const isAlinea = (node: ArticlePortionNode): node is ArticlePortionAlinea =>
		node.type === "alinéa"

	if ("node" in match && isAlinea(match.node)) {
		return match.node
	}
	const path =
		"path" in match ? match.path : "pathStart" in match ? match.pathStart : []
	for (let i = path.length - 1; i >= 0; i -= 1) {
		const node = path[i]
		if (node.type === "alinéa") return node
	}
	return null
}

function getMatchItem(match: ArticlePortionMatch): ArticlePortionNode | null {
	if ("node" in match && match.node.type === "item") {
		return match.node
	}
	const path =
		"path" in match ? match.path : "pathStart" in match ? match.pathStart : []
	for (let i = path.length - 1; i >= 0; i -= 1) {
		const node = path[i]
		if (node.type === "item") return node
	}
	return null
}

function collectAlineasDeep(node: ArticlePortionNode): ArticlePortionAlinea[] {
	if (node.type === "alinéa") return [node]
	if ("children" in node) {
		return node.children.flatMap((child) => collectAlineasDeep(child))
	}
	return []
}

function resolveReplacementAlinea(
	match: ArticlePortionMatch,
): ArticlePortionAlinea | null {
	const nodes: ArticlePortionNode[] =
		"node" in match ? [match.node] : [match.start]
	for (const node of nodes) {
		const alineaCandidates = collectAlineasDeep(node)
		if (alineaCandidates.length > 0) {
			return alineaCandidates[0]
		}
	}
	return getMatchAlinea(match)
}

function resolveInsertionAlinea(
	match: ArticlePortionMatch,
	kind: "insert_after" | "insert_before",
): ArticlePortionAlinea | null {
	const nodes: ArticlePortionNode[] =
		"node" in match
			? [match.node]
			: [kind === "insert_after" ? match.end : match.start]
	for (const node of nodes) {
		const alineaCandidates = collectAlineasDeep(node)
		if (alineaCandidates.length > 0) {
			return kind === "insert_after"
				? alineaCandidates[alineaCandidates.length - 1]
				: alineaCandidates[0]
		}
	}
	return getMatchAlinea(match)
}

function formatInsertionParagraphs(
	value: string,
	options: { preserveLineBreaks?: boolean; highlight?: boolean } = {},
): string {
	const trimmed = value.trim()
	if (!trimmed) return ""
	const lines = trimmed.split("\n")
	const blocks: string[] = []
	const wrap = (content: string): string =>
		options.highlight
			? `<span class="rounded-md px-0.5 bg-green-50 text-green-900">${content}</span>`
			: content

	if (options.preserveLineBreaks) {
		for (const line of lines) {
			const normalized = line.trim()
			if (normalized) blocks.push(normalized)
		}
	} else {
		let current = ""
		const pushCurrent = (): void => {
			const normalized = current.trim()
			if (normalized) blocks.push(normalized)
			current = ""
		}
		const isMarkerLine = (line: string): boolean => {
			const normalized = line.trim()
			if (!normalized) return false
			return (
				/^(?:\d+°)\s+/.test(normalized) ||
				/^(?:[A-Z]|[IVXLCDM]+|\d+)(?:[.)°])\s+/.test(normalized) ||
				/^(?:[-–—•])\s+/.test(normalized)
			)
		}
		for (const line of lines) {
			if (!line.trim()) {
				pushCurrent()
				continue
			}
			if (!current) {
				current = line.trim()
				continue
			}
			if (isMarkerLine(line)) {
				pushCurrent()
				current = line.trim()
				continue
			}
			current = `${current} ${line.trim()}`
		}
		pushCurrent()
	}

	if (blocks.length === 0) return ""
	return blocks
		.map((block) => `<p>${wrap(formatReplacementText(block))}</p>`)
		.join("")
}

function splitParagraphLines(
	paragraphHtml: string,
): Array<{ text: string; html: string }> {
	const parts = paragraphHtml.split(/<br\s*\/?>/i)
	const lines: Array<{ text: string; html: string }> = []
	for (const part of parts) {
		const simplified = simplifyHtml()(part)
		const text = simplified.output.replace(/\s+/g, " ").trim()
		if (!text) continue
		lines.push({ text, html: part.trim() })
	}
	return lines
}

function wrapParagraphLine(lineHtml: string): string {
	const trimmed = lineHtml.trim()
	if (!trimmed) return ""
	return `<p>${trimmed}</p>`
}

type InlineItemLineContext = {
	bounds: FragmentPosition
	lineIndex: number
	lines: Array<{ text: string; html: string }>
	paragraphHtml: string
}

function findLineIndexByItemLabel(
	lines: Array<{ text: string; html: string }>,
	itemLabel: string,
): number {
	const normalized = itemLabel.trim()
	if (!normalized) return -1
	const needles = buildItemLabelNeedles(normalized)
	return lines.findIndex((line) =>
		needles.some((needle) =>
			line.text.toLowerCase().startsWith(needle.trim().toLowerCase()),
		),
	)
}

function resolveInlineItemLineContext(
	html: string,
	selector: PortionSelector | undefined,
): InlineItemLineContext | null {
	const selectorSteps = getSelectorSteps(selector)
	if (!selectorSteps || selectorSteps.length < 2) return null
	const lastStep = selectorSteps.at(-1)
	if (!lastStep || lastStep.type !== "item" || !lastStep.num) return null

	const article = buildArticlePortionTreeFromHtml(html)
	const parentSelector: PortionSelector = {
		kind: "single",
		steps: selectorSteps.slice(0, -1),
	}
	const parentMatch = resolvePortionSelector(article, parentSelector)
	if (!parentMatch) return null

	const alinea = resolveReplacementAlinea(parentMatch)
	if (!alinea) return null

	const bounds = findParagraphBounds(html, alinea.paragraphIndex)
	if (!bounds) return null

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const lines = splitParagraphLines(paragraphHtml)
	if (lines.length === 0) return null

	const lineIndex = findLineIndexByItemLabel(lines, lastStep.num)
	if (lineIndex < 0) return null

	return {
		bounds,
		lineIndex,
		lines,
		paragraphHtml,
	}
}

function findFallbackScopedTargetInItemBlock(
	html: string,
	selector: PortionSelector | undefined,
	needle: string,
	occurrenceIndex = 1,
): {
	bounds: { start: number; stop: number }
	targetPosition: FragmentPosition
	blockHtml: string
} | null {
	if (!needle.trim()) return null
	const selectorSteps = getSelectorSteps(selector)
	const bounds = findItemLabelBounds(html, selectorSteps)
	if (!bounds) return null
	const blockHtml = html.slice(bounds.start, bounds.stop)
	const targetPosition = findScopedTargetPositionInHtml(
		blockHtml,
		needle,
		selectorSteps,
		occurrenceIndex,
	)
	if (!targetPosition) return null
	return {
		bounds,
		targetPosition,
		blockHtml,
	}
}

function applyReplacePortionActionToHtml(
	html: string,
	action: Extract<ActionDirectiveWithHtml, { kind: "replace_portion" }>,
): ProjectedHtmlResult {
	if (action.portionSelectors.length === 0) {
		return {
			html: null,
			reason:
				"Aucune cible de portion exploitable pour appliquer la modification.",
		}
	}

	const article = buildArticlePortionTreeFromHtml(html)
	let match: ArticlePortionMatch | null = null
	let matchedSelector: PortionSelector | null = null
	for (const selector of action.portionSelectors) {
		match = resolvePortionSelector(article, selector)
		if (match) {
			matchedSelector = selector
			break
		}
	}
	const selectorSteps = getSelectorSteps(
		matchedSelector ?? action.portionSelectors[0],
	)
	if (!match) {
		const fallbackParagraphBounds = findParagraphBoundsByScopedSelectorSteps(
			html,
			selectorSteps,
		)
		if (fallbackParagraphBounds) {
			const paragraphHtml = html.slice(
				fallbackParagraphBounds.start,
				fallbackParagraphBounds.stop,
			)
			const portionBounds = findSelectorPortionBoundsInHtml(
				paragraphHtml,
				matchedSelector ?? action.portionSelectors[0],
			)
			if (portionBounds) {
				const replacementHtml = formatReplacementText(action.replacementText)
				const removedHtml = paragraphHtml.slice(
					portionBounds.start,
					portionBounds.stop,
				)
				return {
					html:
						html.slice(0, fallbackParagraphBounds.start) +
						paragraphHtml.slice(0, portionBounds.start) +
						`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
						`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
						paragraphHtml.slice(portionBounds.stop) +
						html.slice(fallbackParagraphBounds.stop),
					skipDiff: true,
				}
			}
		}
		const bounds = findItemLabelBounds(html, selectorSteps)
		if (bounds) {
			return {
				html: html.slice(0, bounds.start) + html.slice(bounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const alinea = resolveReplacementAlinea(match)
	if (!alinea) {
		const bounds = findItemLabelBounds(html, selectorSteps)
		if (bounds) {
			return {
				html: html.slice(0, bounds.start) + html.slice(bounds.stop),
			}
		}
		return {
			html: null,
			reason: "Disposition non reconnue pour l'instant pour projeter un diff.",
		}
	}

	const bounds = findParagraphBounds(html, alinea.paragraphIndex)
	if (!bounds) {
		const fallbackBounds = findItemLabelBounds(html, selectorSteps)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	if (action.replacementHtml && /<table\b/i.test(action.replacementHtml)) {
		const tableBounds =
			findTableBoundsAfter(html, bounds.stop) ?? findTableBoundsAfter(html, 0)
		if (tableBounds) {
			const existingTable = html.slice(tableBounds.start, tableBounds.stop)
			return {
				html:
					html.slice(0, tableBounds.start) +
					wrapTableReplacement(existingTable, action.replacementHtml) +
					html.slice(tableBounds.stop),
				skipDiff: true,
			}
		}
		return {
			html: null,
			reason:
				"Tableau cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const lastStep = selectorSteps?.at(-1)
	if (lastStep && lastStep.type === "item" && lastStep.num) {
		const label = lastStep.num.toLowerCase()
		if (/^[a-z]$/.test(label)) {
			const normalized = paragraphHtml
				.toLowerCase()
				.replace(/[\s\u00a0]+/g, " ")
			if (!normalized.includes(`${label}.`)) {
				const fallbackBounds = findItemLabelBounds(
					html,
					getSelectorSteps(action.portionSelectors[0]),
				)
				if (fallbackBounds) {
					return {
						html:
							html.slice(0, fallbackBounds.start) +
							html.slice(fallbackBounds.stop),
					}
				}
			}
		}
	}
	const targetText = alinea.text
	let targetPosition: FragmentPosition | null = null

	const matchItem = getMatchItem(match)
	if (matchItem && matchItem.type === "item" && matchItem.num) {
		const itemLabel = matchItem.num
		const labelNeedles = [
			`${itemLabel} ${targetText}`,
			/^\d+$/.test(itemLabel) ? `${itemLabel}° ${targetText}` : null,
			`${itemLabel}) ${targetText}`,
			`${itemLabel}. ${targetText}`,
			`${itemLabel} - ${targetText}`,
			`${itemLabel} – ${targetText}`,
			`${itemLabel} — ${targetText}`,
			`${itemLabel}. - ${targetText}`,
			`${itemLabel}. – ${targetText}`,
			`${itemLabel}. — ${targetText}`,
			`${itemLabel}.- ${targetText}`,
		].filter((needle): needle is string => Boolean(needle))
		for (const needle of labelNeedles) {
			targetPosition = findTextPositionInHtml(paragraphHtml, needle)
			if (targetPosition) break
		}
	}

	if (!targetPosition) {
		targetPosition = findTextPositionInHtml(paragraphHtml, targetText)
	}
	if (!targetPosition) {
		const fallbackBounds = findItemLabelBounds(
			html,
			getSelectorSteps(action.portionSelectors[0]),
		)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const replacementHtml = formatReplacementText(action.replacementText)
	const removedHtml = paragraphHtml.slice(
		targetPosition.start,
		targetPosition.stop,
	)
	const updatedParagraph =
		paragraphHtml.slice(0, targetPosition.start) +
		`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
		`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
		paragraphHtml.slice(targetPosition.stop)

	return {
		html:
			html.slice(0, bounds.start) + updatedParagraph + html.slice(bounds.stop),
		skipDiff: true,
	}
}

function applyDeletePortionActionToHtml(
	html: string,
	action: Extract<ActionDirective, { kind: "delete_portion" }>,
): ProjectedHtmlResult {
	if ("tableRowIndex" in action && typeof action.tableRowIndex === "number") {
		return applyTableRowDeletionToHtml(html, action.tableRowIndex)
	}

	if (action.portionSelectors.length === 0) {
		return {
			html: null,
			reason:
				"Aucune cible de portion exploitable pour appliquer la modification.",
		}
	}

	const article = buildArticlePortionTreeFromHtml(html)
	let match: ArticlePortionMatch | null = null
	let matchedSelector: PortionSelector | null = null
	for (const selector of action.portionSelectors) {
		match = resolvePortionSelector(article, selector)
		if (match) {
			matchedSelector = selector
			break
		}
	}
	const selectorSteps = getSelectorSteps(
		matchedSelector ?? action.portionSelectors[0],
	)
	if (!match) {
		const fallbackBounds = findItemLabelBounds(html, selectorSteps)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const alinea = resolveReplacementAlinea(match)
	if (!alinea) {
		const fallbackBounds = findItemLabelBounds(html, selectorSteps)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason: "Disposition non reconnue pour l'instant pour projeter un diff.",
		}
	}

	const bounds = findParagraphBounds(html, alinea.paragraphIndex)
	if (!bounds) {
		const fallbackBounds = findItemLabelBounds(
			html,
			getSelectorSteps(action.portionSelectors[0]),
		)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const isAlineaOnly =
		selectorSteps?.length === 1 && selectorSteps[0]?.type === "alinéa"
	if (isAlineaOnly) {
		return {
			html: html.slice(0, bounds.start) + html.slice(bounds.stop),
		}
	}

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const targetText = alinea.text
	let targetPosition: FragmentPosition | null = null

	const matchItem = getMatchItem(match)
	if (matchItem && matchItem.type === "item" && matchItem.num) {
		const itemLabel = matchItem.num
		const labelNeedles = [
			`${itemLabel}. ${targetText}`,
			`${itemLabel}. - ${targetText}`,
			`${itemLabel}. – ${targetText}`,
			`${itemLabel}. — ${targetText}`,
			`${itemLabel}.- ${targetText}`,
		]
		for (const needle of labelNeedles) {
			targetPosition = findTextPositionInHtml(paragraphHtml, needle)
			if (targetPosition) break
		}
		const normalizedParagraph = paragraphHtml
			.toLowerCase()
			.replace(/[\s\u00a0]+/g, " ")
		if (
			!targetPosition &&
			/^[a-z]$/i.test(itemLabel) &&
			!normalizedParagraph.includes(`${itemLabel.toLowerCase()}.`)
		) {
			const fallbackBounds = findItemLabelBounds(
				html,
				getSelectorSteps(action.portionSelectors[0]),
			)
			if (fallbackBounds) {
				return {
					html:
						html.slice(0, fallbackBounds.start) +
						html.slice(fallbackBounds.stop),
				}
			}
		}
	}

	if (!targetPosition) {
		targetPosition = findTextPositionInHtml(paragraphHtml, targetText)
	}
	if (!targetPosition) {
		const fallbackBounds = findItemLabelBounds(
			html,
			getSelectorSteps(action.portionSelectors[0]),
		)
		if (fallbackBounds) {
			return {
				html:
					html.slice(0, fallbackBounds.start) + html.slice(fallbackBounds.stop),
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const updatedParagraph =
		paragraphHtml.slice(0, targetPosition.start) +
		paragraphHtml.slice(targetPosition.stop)

	return {
		html:
			html.slice(0, bounds.start) + updatedParagraph + html.slice(bounds.stop),
	}
}

function deleteTextInHtml(
	html: string,
	targetText: string,
	occurrenceIndex = 1,
): ProjectedHtmlResult {
	const targetPosition = findTextPositionInHtmlWithFallback(
		html,
		targetText,
		occurrenceIndex,
	)
	if (!targetPosition) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}
	const removedHtml = html.slice(targetPosition.start, targetPosition.stop)
	if (/<[^>]+>/.test(removedHtml)) {
		return {
			html:
				html.slice(0, targetPosition.start) + html.slice(targetPosition.stop),
		}
	}
	return {
		html:
			html.slice(0, targetPosition.start) +
			`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
			html.slice(targetPosition.stop),
		skipDiff: true,
	}
}

function applyDeletePortionTextActionToHtml(
	html: string,
	action: Extract<ActionDirective, { kind: "delete" }>,
): ProjectedHtmlResult {
	if (action.portionSelectors.length === 0) {
		return {
			html: null,
			reason:
				"Aucune cible de portion exploitable pour appliquer la modification.",
		}
	}
	if (!action.targetText) {
		return {
			html: null,
			reason:
				"Aucune cible textuelle exploitable pour appliquer la modification.",
		}
	}

	const article = buildArticlePortionTreeFromHtml(html)
	let match: ArticlePortionMatch | null = null
	let matchedSelector: PortionSelector | null = null
	for (const selector of action.portionSelectors) {
		match = resolvePortionSelector(article, selector)
		if (match) {
			matchedSelector = selector
			break
		}
	}
	const selectorSteps = getSelectorSteps(
		matchedSelector ?? action.portionSelectors[0],
	)
	if (!match) {
		const fallbackMatch = findFallbackScopedTargetInItemBlock(
			html,
			matchedSelector ?? action.portionSelectors[0],
			action.targetText,
			action.occurrenceIndex ?? 1,
		)
		if (fallbackMatch) {
			const removedHtml = fallbackMatch.blockHtml.slice(
				fallbackMatch.targetPosition.start,
				fallbackMatch.targetPosition.stop,
			)
			if (!/<[^>]+>/.test(removedHtml)) {
				return {
					html:
						html.slice(0, fallbackMatch.bounds.start) +
						fallbackMatch.blockHtml.slice(
							0,
							fallbackMatch.targetPosition.start,
						) +
						`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
						fallbackMatch.blockHtml.slice(fallbackMatch.targetPosition.stop) +
						html.slice(fallbackMatch.bounds.stop),
					skipDiff: true,
				}
			}
		}
		const fallbackBounds = findParagraphBoundsByScopedSelectorSteps(
			html,
			selectorSteps,
		)
		if (!fallbackBounds) {
			return deleteTextInHtml(html, action.targetText)
		}
	}

	const alinea = match ? resolveReplacementAlinea(match) : null
	const bounds = alinea
		? (findParagraphBounds(html, alinea.paragraphIndex) ??
			findParagraphBoundsByScopedSelectorSteps(html, selectorSteps))
		: findParagraphBoundsByScopedSelectorSteps(html, selectorSteps)
	if (!bounds) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const targetPosition = findScopedTargetPositionInHtml(
		paragraphHtml,
		action.targetText,
		selectorSteps,
		action.occurrenceIndex ?? 1,
	)
	if (!targetPosition) {
		const fallbackMatch = findFallbackScopedTargetInItemBlock(
			html,
			matchedSelector ?? action.portionSelectors[0],
			action.targetText,
			action.occurrenceIndex ?? 1,
		)
		if (fallbackMatch) {
			const removedHtml = fallbackMatch.blockHtml.slice(
				fallbackMatch.targetPosition.start,
				fallbackMatch.targetPosition.stop,
			)
			if (!/<[^>]+>/.test(removedHtml)) {
				return {
					html:
						html.slice(0, fallbackMatch.bounds.start) +
						fallbackMatch.blockHtml.slice(
							0,
							fallbackMatch.targetPosition.start,
						) +
						`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
						fallbackMatch.blockHtml.slice(fallbackMatch.targetPosition.stop) +
						html.slice(fallbackMatch.bounds.stop),
					skipDiff: true,
				}
			}
		}
		return deleteTextInHtml(
			html,
			action.targetText,
			action.occurrenceIndex ?? 1,
		)
	}
	const removedHtml = paragraphHtml.slice(
		targetPosition.start,
		targetPosition.stop,
	)
	if (/<[^>]+>/.test(removedHtml)) {
		return deleteTextInHtml(
			html,
			action.targetText,
			action.occurrenceIndex ?? 1,
		)
	}

	const updatedParagraph =
		paragraphHtml.slice(0, targetPosition.start) +
		`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
		paragraphHtml.slice(targetPosition.stop)

	return {
		html:
			html.slice(0, bounds.start) + updatedParagraph + html.slice(bounds.stop),
		skipDiff: true,
	}
}

function applyReplacePortionTextActionToHtml(
	html: string,
	action: Extract<ActionDirective, { kind: "replace" }>,
): ProjectedHtmlResult {
	if (action.portionSelectors.length === 0) {
		return {
			html: null,
			reason:
				"Aucune cible de portion exploitable pour appliquer la modification.",
		}
	}
	if (!action.targetText) {
		return {
			html: null,
			reason:
				"Aucune cible textuelle exploitable pour appliquer la modification.",
		}
	}
	if (!action.replacementText) {
		return {
			html: null,
			reason:
				"Aucune valeur de remplacement trouvée pour appliquer la modification.",
		}
	}

	const article = buildArticlePortionTreeFromHtml(html)
	let match: ArticlePortionMatch | null = null
	let matchedSelector: PortionSelector | null = null
	for (const selector of action.portionSelectors) {
		match = resolvePortionSelector(article, selector)
		if (match) {
			matchedSelector = selector
			break
		}
	}
	const selectorSteps = getSelectorSteps(
		matchedSelector ?? action.portionSelectors[0],
	)
	if (!match) {
		const fallbackMatch = findFallbackScopedTargetInItemBlock(
			html,
			matchedSelector ?? action.portionSelectors[0],
			action.targetText,
		)
		if (fallbackMatch) {
			const replacementHtml = formatReplacementText(action.replacementText)
			const removedHtml = fallbackMatch.blockHtml.slice(
				fallbackMatch.targetPosition.start,
				fallbackMatch.targetPosition.stop,
			)
			return {
				html:
					html.slice(0, fallbackMatch.bounds.start) +
					fallbackMatch.blockHtml.slice(0, fallbackMatch.targetPosition.start) +
					`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
					`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
					fallbackMatch.blockHtml.slice(fallbackMatch.targetPosition.stop) +
					html.slice(fallbackMatch.bounds.stop),
				skipDiff: true,
			}
		}
		const inlineContext = resolveInlineItemLineContext(
			html,
			matchedSelector ?? action.portionSelectors[0],
		)
		if (inlineContext) {
			const line = inlineContext.lines[inlineContext.lineIndex]
			if (line) {
				const targetPosition = findTextPositionInHtmlWithFallback(
					line.html,
					action.targetText,
				)
				if (targetPosition) {
					const replacementHtml = formatReplacementText(action.replacementText)
					const removedHtml = line.html.slice(
						targetPosition.start,
						targetPosition.stop,
					)
					const updatedLineHtml =
						line.html.slice(0, targetPosition.start) +
						`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
						`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
						line.html.slice(targetPosition.stop)
					const updatedParagraph = inlineContext.lines
						.map((currentLine, index) =>
							index === inlineContext.lineIndex
								? updatedLineHtml
								: currentLine.html,
						)
						.join("<br>")
					return {
						html:
							html.slice(0, inlineContext.bounds.start) +
							updatedParagraph +
							html.slice(inlineContext.bounds.stop),
						skipDiff: true,
					}
				}
			}
		}
		const fallbackBounds = findParagraphBoundsByScopedSelectorSteps(
			html,
			selectorSteps,
		)
		if (!fallbackBounds) {
			return {
				html: null,
				reason:
					"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
			}
		}
	}

	const alinea = match ? resolveReplacementAlinea(match) : null
	const bounds = alinea
		? (findParagraphBounds(html, alinea.paragraphIndex) ??
			findParagraphBoundsByScopedSelectorSteps(html, selectorSteps))
		: findParagraphBoundsByScopedSelectorSteps(html, selectorSteps)
	if (!bounds) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const targetPosition = findScopedTargetPositionInHtml(
		paragraphHtml,
		action.targetText,
		selectorSteps,
	)
	if (!targetPosition) {
		const fallbackMatch = findFallbackScopedTargetInItemBlock(
			html,
			matchedSelector ?? action.portionSelectors[0],
			action.targetText,
		)
		if (fallbackMatch) {
			const replacementHtml = formatReplacementText(action.replacementText)
			const removedHtml = fallbackMatch.blockHtml.slice(
				fallbackMatch.targetPosition.start,
				fallbackMatch.targetPosition.stop,
			)
			return {
				html:
					html.slice(0, fallbackMatch.bounds.start) +
					fallbackMatch.blockHtml.slice(0, fallbackMatch.targetPosition.start) +
					`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
					`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
					fallbackMatch.blockHtml.slice(fallbackMatch.targetPosition.stop) +
					html.slice(fallbackMatch.bounds.stop),
				skipDiff: true,
			}
		}
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const removedHtml = paragraphHtml.slice(
		targetPosition.start,
		targetPosition.stop,
	)
	const replacementHtml = formatReplacementText(action.replacementText)
	const updatedParagraph =
		paragraphHtml.slice(0, targetPosition.start) +
		`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
		`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
		paragraphHtml.slice(targetPosition.stop)

	return {
		html:
			html.slice(0, bounds.start) + updatedParagraph + html.slice(bounds.stop),
		skipDiff: true,
	}
}

function applyInsertPortionActionToHtml(
	html: string,
	action: Extract<ActionDirective, { kind: "insert_after" | "insert_before" }>,
): ProjectedHtmlResult {
	if (action.portionSelectors.length === 0) {
		return {
			html: null,
			reason:
				"Aucune cible de portion exploitable pour appliquer la modification.",
		}
	}

	const article = buildArticlePortionTreeFromHtml(html)
	let match: ArticlePortionMatch | null = null
	let matchedSelector: PortionSelector | null = null
	for (const selector of action.portionSelectors) {
		match = resolvePortionSelector(article, selector)
		if (match) {
			matchedSelector = selector
			break
		}
	}
	const alinea = match ? resolveInsertionAlinea(match, action.kind) : null
	const selectorSteps = getSelectorSteps(
		matchedSelector ?? action.portionSelectors[0],
	)
	let bounds = alinea
		? findParagraphBounds(html, alinea.paragraphIndex)
		: findParagraphBoundsByScopedSelectorSteps(html, selectorSteps)
	if (!bounds) {
		bounds = findParagraphBoundsByScopedSelectorSteps(html, selectorSteps)
	}
	if (!bounds) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	const paragraphHtml = html.slice(bounds.start, bounds.stop)
	const fallbackAlineaText = simplifyHtml()(paragraphHtml).output.trim()
	const lastSelectorStep = selectorSteps?.at(-1)
	const phraseBounds =
		!action.targetText &&
		lastSelectorStep?.type === "phrase" &&
		typeof lastSelectorStep.index === "number"
			? findPhraseBoundsInHtml(paragraphHtml, lastSelectorStep.index)
			: null
	const targetPosition = action.targetText
		? findTextPositionInHtml(paragraphHtml, action.targetText)
		: findTextPositionInHtml(paragraphHtml, alinea?.text ?? fallbackAlineaText)

	const shouldInsertAsParagraphs = (): boolean => {
		if (!action.insertText.includes("\n")) return false
		if (!action.targetText || action.targetText.trim() === "") return true
		const normalized = action.sourceText
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
		return /\bainsi\s+redig/.test(normalized)
	}

	const preserveLineBreaks = shouldInsertAsParagraphs()

	const shouldInlineCompletion = (sourceText: string): boolean => {
		const normalized = sourceText
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
		return /\bcomplet/.test(normalized)
	}

	const findCompletionInsertionIndex = (): number | null => {
		if (!alinea) return null
		const simplifiedParagraph = simplifyHtml()(paragraphHtml)
		const simplifiedAlinea = simplifyPlainText(alinea.text)
		const match = findMatchInSimplifiedText(
			simplifiedParagraph.output,
			simplifiedAlinea.output,
		)
		if (match) {
			const trailingPunctuation = /[.;:!?]\s*$/.exec(simplifiedAlinea.output)
			const insertionOffset =
				trailingPunctuation && trailingPunctuation.index >= 0
					? trailingPunctuation.index
					: simplifiedAlinea.output.length
			const insertionPosition = match.start + insertionOffset
			const reversedPositions = reversePositionsSplitFromPositions(
				simplifiedParagraph,
				[{ start: insertionPosition, stop: insertionPosition }],
			)
			const firstPosition = reversedPositions[0]?.[0]
			return firstPosition ? bounds.start + firstPosition.start : null
		}

		const trimmedParagraph = simplifiedParagraph.output.replace(/\s+$/g, "")
		if (!trimmedParagraph) return null
		const lastChar = trimmedParagraph[trimmedParagraph.length - 1] ?? ""
		if (!/[.;:!?]/.test(lastChar)) return null

		const insertionPosition = trimmedParagraph.length - 1
		const reversedPositions = reversePositionsSplitFromPositions(
			simplifiedParagraph,
			[{ start: insertionPosition, stop: insertionPosition }],
		)
		const firstPosition = reversedPositions[0]?.[0]
		return firstPosition ? bounds.start + firstPosition.start : null
	}

	const insertInlineAtIndex = (
		index: number,
		highlight: boolean,
	): ProjectedHtmlResult => {
		const insertionText = buildInsertionText(
			action.insertText,
			html,
			index,
			{ allowLeadingSpace: true },
			highlight,
		)
		return {
			html: html.slice(0, index) + insertionText + html.slice(index),
			...(highlight ? { skipDiff: true } : {}),
		}
	}

	if (phraseBounds) {
		const absoluteTargetStart = bounds.start + phraseBounds.start
		const absoluteTargetStop = bounds.start + phraseBounds.stop
		const anchorStart = isInsideAnchor(
			html,
			action.kind === "insert_before"
				? absoluteTargetStart
				: absoluteTargetStop,
		)
		const insertionIndex =
			action.kind === "insert_before"
				? (anchorStart ?? absoluteTargetStart)
				: skipHtmlWhitespace(
						html,
						anchorStart !== null
							? getAfterAnchorIndex(html, absoluteTargetStop)
							: absoluteTargetStop,
					)
		return insertInlineAtIndex(insertionIndex, true)
	}

	if (action.targetText && !targetPosition) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	if (preserveLineBreaks) {
		const insertionHtml = formatInsertionParagraphs(action.insertText, {
			preserveLineBreaks: true,
			highlight: true,
		})
		if (!insertionHtml) {
			return {
				html: null,
				reason:
					"Aucune valeur d'insertion trouvée pour appliquer la modification.",
			}
		}

		const lastStep = selectorSteps?.at(-1)
		const itemLabel =
			lastStep && lastStep.type === "item" ? lastStep.num : undefined
		const lines = splitParagraphLines(paragraphHtml)
		if (lines.length > 1) {
			const lineNeedle = action.targetText || alinea?.text || ""
			const lineIndexByLabel =
				itemLabel && itemLabel.trim()
					? findLineIndexByItemLabel(lines, itemLabel)
					: -1
			const romanMatch =
				itemLabel && itemLabel.trim()
					? new RegExp(`^\\s*${escapeRegExp(itemLabel)}\\b`, "i").exec(
							action.insertText,
						)
					: null
			const insertLabel = romanMatch ? romanMatch[0].trim() : undefined
			const lineIndexByInsertLabel =
				insertLabel && insertLabel !== itemLabel
					? findLineIndexByItemLabel(lines, insertLabel)
					: -1
			const simplifiedNeedle = lineNeedle
				? simplifyPlainText(lineNeedle).output
				: ""
			const lineIndexByNeedle = simplifiedNeedle
				? lines.findIndex((line) => {
						const simplifiedLine = simplifyPlainText(line.text).output
						return Boolean(
							findMatchInSimplifiedText(simplifiedLine, simplifiedNeedle),
						)
					})
				: -1
			const lineIndex =
				lineIndexByLabel >= 0
					? lineIndexByLabel
					: lineIndexByInsertLabel >= 0
						? lineIndexByInsertLabel
						: lineIndexByNeedle
			if (lineIndex >= 0) {
				const insertAt =
					action.kind === "insert_before" ? lineIndex : lineIndex + 1
				const beforeHtml = lines
					.slice(0, insertAt)
					.map((line) => wrapParagraphLine(line.html))
					.filter(Boolean)
					.join("")
				const afterHtml = lines
					.slice(insertAt)
					.map((line) => wrapParagraphLine(line.html))
					.filter(Boolean)
					.join("")
				const replacementHtml = `${beforeHtml}${insertionHtml}${afterHtml}`
				const blockBounds = findBlockBoundsFromIndex(html, bounds.start)
				if (blockBounds) {
					return {
						html:
							html.slice(0, blockBounds.start) +
							replacementHtml +
							html.slice(blockBounds.stop),
						skipDiff: true,
					}
				}
			}
		}

		const insertionIndex =
			action.kind === "insert_before" ? bounds.start : bounds.stop + 4
		return {
			html:
				html.slice(0, insertionIndex) +
				insertionHtml +
				html.slice(insertionIndex),
			skipDiff: true,
		}
	}

	if (targetPosition) {
		const formatted = formatInsertionInline(action.insertText)
		if (!formatted) {
			return {
				html: null,
				reason:
					"Aucune valeur d'insertion trouvée pour appliquer la modification.",
			}
		}

		if (!action.targetText && shouldInlineCompletion(action.sourceText)) {
			const completionIndex = findCompletionInsertionIndex()
			if (completionIndex !== null) {
				return insertInlineAtIndex(completionIndex, true)
			}
		}

		const absoluteTargetStart = bounds.start + targetPosition.start
		const absoluteTargetStop = bounds.start + targetPosition.stop
		const anchorStart = isInsideAnchor(html, absoluteTargetStart)
		let insertionIndex =
			action.kind === "insert_before"
				? (anchorStart ?? absoluteTargetStart)
				: anchorStart !== null
					? getAfterAnchorIndex(html, absoluteTargetStop)
					: absoluteTargetStop

		let skippedComma = false
		if (action.kind === "insert_after") {
			let nextIndex = skipHtmlWhitespace(html, insertionIndex)
			if ((html[nextIndex] ?? "") === ",") {
				nextIndex += 1
				nextIndex = skipHtmlWhitespace(html, nextIndex)
				insertionIndex = nextIndex
				skippedComma = true
			}
		}

		const highlightInsertion = action.insertText.trim() !== ""
		const insertionText = buildInsertionText(
			action.insertText,
			html,
			insertionIndex,
			{ allowLeadingSpace: action.kind === "insert_before" || !skippedComma },
			highlightInsertion,
		)

		return {
			html:
				html.slice(0, insertionIndex) +
				insertionText +
				html.slice(insertionIndex),
			...(highlightInsertion ? { skipDiff: true } : {}),
		}
	}

	const insertionHtml = formatInsertionParagraphs(action.insertText, {
		preserveLineBreaks,
	})
	if (!insertionHtml) {
		return {
			html: null,
			reason:
				"Aucune valeur d'insertion trouvée pour appliquer la modification.",
		}
	}

	const insertionIndex =
		action.kind === "insert_before" ? bounds.start : bounds.stop + 4

	return {
		html:
			html.slice(0, insertionIndex) +
			insertionHtml +
			html.slice(insertionIndex),
	}
}

function applyProjectActionToHtml(
	html: string,
	action: ActionDirectiveWithHtml,
): ProjectedHtmlResult {
	if (action.kind === "replace_portion") {
		return applyReplacePortionActionToHtml(html, action)
	}
	if (action.kind === "delete_portion") {
		return applyDeletePortionActionToHtml(html, action)
	}
	if (action.kind === "delete_article") {
		return { html: "" }
	}
	if (action.kind === "delete" && action.portionSelectors.length > 0) {
		return applyDeletePortionTextActionToHtml(html, action)
	}
	if (action.kind === "replace" && action.portionSelectors.length > 0) {
		return applyReplacePortionTextActionToHtml(html, action)
	}

	if (action.kind === "insert_after" || action.kind === "insert_before") {
		if (!action.targetText && html.trim() === "") {
			const insertionHtml = formatInsertionParagraphs(action.insertText, {
				preserveLineBreaks: action.insertText.includes("\n"),
				highlight: true,
			})
			if (!insertionHtml) {
				return {
					html: null,
					reason:
						"Aucune valeur d'insertion trouvée pour appliquer la modification.",
				}
			}
			return {
				html: insertionHtml,
				skipDiff: true,
			}
		}
		if (action.portionSelectors.length > 0) {
			const result = applyInsertPortionActionToHtml(html, action)
			if (result.html !== null) return result
		}
	}

	if (
		(action.kind === "insert_after" || action.kind === "insert_before") &&
		(!action.targetText || action.targetText.trim() === "")
	) {
		const normalized = action.sourceText
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
		if (
			/\bcomplet/.test(normalized) ||
			/\bajout/.test(normalized) ||
			/\bretabl/.test(normalized)
		) {
			const insertionHtml = formatInsertionParagraphs(action.insertText, {
				preserveLineBreaks: action.insertText.includes("\n"),
				highlight: true,
			})
			if (!insertionHtml) {
				return {
					html: null,
					reason:
						"Aucune valeur d'insertion trouvée pour appliquer la modification.",
				}
			}
			return {
				html: html + insertionHtml,
				skipDiff: true,
			}
		}
	}

	const target =
		action.kind === "insert_after" || action.kind === "insert_before"
			? action.targetText
			: action.kind === "replace" || action.kind === "delete"
				? action.targetText
				: undefined
	if (!target) {
		return {
			html: null,
			reason:
				"Aucune cible textuelle exploitable pour appliquer la modification.",
		}
	}
	const occurrenceIndex =
		action.kind === "delete" ? (action.occurrenceIndex ?? 1) : 1
	let targetPosition =
		action.kind === "replace" &&
		typeof action.tableRowIndex === "number" &&
		typeof action.tableColumnIndex === "number"
			? findScopedTargetPositionInTableCell(
					html,
					action.tableRowIndex,
					action.tableColumnIndex,
					target,
				)
			: null
	if (!targetPosition) {
		targetPosition = findTextPositionInHtml(html, target, occurrenceIndex)
	}
	if (!targetPosition) {
		targetPosition = findTextPositionInHtml(
			html,
			normalizeLabel(target),
			occurrenceIndex,
		)
	}
	if (!targetPosition) {
		return {
			html: null,
			reason:
				"Cible introuvable dans l'article en vigueur pour appliquer la modification.",
		}
	}

	if (action.kind === "replace") {
		if (!action.replacementText) {
			return {
				html: null,
				reason:
					"Aucune valeur de remplacement trouvée pour appliquer la modification.",
			}
		}
		const replacementHtml = formatReplacementText(action.replacementText)
		const removedHtml = html.slice(targetPosition.start, targetPosition.stop)
		return {
			html:
				html.slice(0, targetPosition.start) +
				`<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${removedHtml}</span>` +
				`<span class="rounded-md px-0.5 bg-green-50 text-green-900">${replacementHtml}</span>` +
				html.slice(targetPosition.stop),
			skipDiff: true,
		}
	}

	if (action.kind === "delete") {
		return {
			html:
				html.slice(0, targetPosition.start) + html.slice(targetPosition.stop),
		}
	}

	const anchorStart = isInsideAnchor(html, targetPosition.start)
	let insertionIndex =
		action.kind === "insert_before"
			? (anchorStart ?? targetPosition.start)
			: anchorStart !== null
				? getAfterAnchorIndex(html, targetPosition.stop)
				: targetPosition.stop

	let skippedComma = false
	if (action.kind === "insert_after") {
		let nextIndex = skipHtmlWhitespace(html, insertionIndex)
		if ((html[nextIndex] ?? "") === ",") {
			nextIndex += 1
			nextIndex = skipHtmlWhitespace(html, nextIndex)
			insertionIndex = nextIndex
			skippedComma = true
		}
	}

	const insertionText = buildInsertionText(
		action.insertText,
		html,
		insertionIndex,
		{ allowLeadingSpace: action.kind === "insert_before" || !skippedComma },
	)

	return {
		html:
			html.slice(0, insertionIndex) +
			insertionText +
			html.slice(insertionIndex),
	}
}

export function applyProjectActionsToHtml(
	html: string,
	directives: ActionDirectiveWithHtml[],
): ProjectedHtmlResult {
	let currentHtml = html
	let skipDiff = true
	const ordered = [...directives].sort((a, b) => {
		const aOccurrence =
			a.kind === "delete" && typeof a.occurrenceIndex === "number"
				? a.occurrenceIndex
				: 0
		const bOccurrence =
			b.kind === "delete" && typeof b.occurrenceIndex === "number"
				? b.occurrenceIndex
				: 0
		const aHasOccurrence = a.kind === "delete" && aOccurrence > 1
		const bHasOccurrence = b.kind === "delete" && bOccurrence > 1
		if (aHasOccurrence !== bHasOccurrence) {
			return bHasOccurrence ? 1 : -1
		}
		if (aHasOccurrence && bHasOccurrence && aOccurrence !== bOccurrence) {
			return bOccurrence - aOccurrence
		}
		const positionDiff = a.sourcePosition.start - b.sourcePosition.start
		if (positionDiff !== 0) return positionDiff
		return 0
	})
	const grouped: Array<{ key: string; directives: ActionDirectiveWithHtml[] }> =
		[]
	for (const directive of ordered) {
		const key = getDirectiveKey(directive)
		const last = grouped[grouped.length - 1]
		if (last && last.key === key) {
			last.directives.push(directive)
		} else {
			grouped.push({ key, directives: [directive] })
		}
	}

	for (const group of grouped) {
		const candidates = [...group.directives].sort(
			(a, b) => getDirectiveSpecificity(b) - getDirectiveSpecificity(a),
		)
		let applied = false
		let lastError: ProjectedHtmlResult | null = null
		for (const directive of candidates) {
			const result = applyProjectActionToHtml(currentHtml, directive)
			if (result.html === null) {
				lastError = result
				continue
			}
			skipDiff = skipDiff && result.skipDiff === true
			currentHtml = result.html
			applied = true
			break
		}
		if (!applied) {
			return (
				lastError ?? {
					html: null,
					reason:
						"Disposition non reconnue pour l'instant pour projeter un diff.",
				}
			)
		}
	}
	return skipDiff
		? { html: currentHtml, skipDiff: true }
		: { html: currentHtml }
}

function getSelectorScore(selector: PortionSelector): number {
	if (selector.kind === "single") return selector.steps.length
	const firstLength = selector.first.length
	const lastLength = selector.last.length
	return Math.max(firstLength, lastLength)
}

function getSelectorsScore(selectors: PortionSelector[]): number {
	if (selectors.length === 0) return 0
	return Math.max(0, ...selectors.map(getSelectorScore))
}

function getDirectiveSpecificity(directive: ActionDirectiveWithHtml): number {
	if (directive.portionSelectors.length === 0) return 0
	const scores = directive.portionSelectors.map(getSelectorScore)
	const best = Math.max(0, ...scores)
	return 100 + best
}

export function getDirectiveKey(directive: ActionDirectiveWithHtml): string {
	const insertText =
		"insertText" in directive && directive.insertText
			? directive.insertText
			: ""
	const targetText =
		"targetText" in directive && directive.targetText
			? directive.targetText
			: ""
	const replacementText =
		"replacementText" in directive && directive.replacementText
			? directive.replacementText
			: ""
	const replacementHtml =
		"replacementHtml" in directive && directive.replacementHtml
			? directive.replacementHtml
			: ""
	return [
		directive.kind,
		targetText,
		insertText,
		replacementText,
		replacementHtml,
	].join("|")
}

export function buildDirectivePreviewId(
	directive: ActionDirectiveWithHtml,
): string {
	return `${directive.sourcePosition.start}:${directive.sourcePosition.stop}:${getDirectiveKey(directive)}`
}

export function splitActionSourceBlocks(sourceText: string): string[] {
	const lines = sourceText.split("\n")
	const markerRe =
		/^\s*(?!«)([IVXLCDM]+|[ivxlcdm]+|\d+|[a-zA-Z])\s*(°|\.|\))\s+/u
	const getMarkerLevel = (line: string): number | null => {
		const match = markerRe.exec(line)
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

	const prelude: string[] = []
	const contextByLevel = new Map<number, string>()
	const blocks: string[] = []
	let current: string[] = []
	let sawMarker = false

	for (const line of lines) {
		const level = getMarkerLevel(line)
		if (level === null) {
			if (!sawMarker) {
				if (line.trim()) prelude.push(line)
			} else if (current.length > 0) {
				current.push(line)
			}
			continue
		}

		sawMarker = true
		const parentContext = level > 1 ? contextByLevel.get(level - 1) : undefined
		const shouldKeepSiblingItemsTogether =
			level === 3 &&
			parentContext !== undefined &&
			isListBlockIntroLine(parentContext)
		if (current.length > 0 && !shouldKeepSiblingItemsTogether) {
			blocks.push(current.join("\n"))
		}
		if (shouldKeepSiblingItemsTogether) {
			current.push(line)
			contextByLevel.set(level, line)
			for (const key of Array.from(contextByLevel.keys())) {
				if (key > level) contextByLevel.delete(key)
			}
			continue
		}
		const prefix: string[] = []
		for (const lineItem of prelude) prefix.push(lineItem)
		for (let i = 1; i < level; i += 1) {
			const context = contextByLevel.get(i)
			if (context) prefix.push(context)
		}
		current = [...prefix, line]
		contextByLevel.set(level, line)
		for (const key of Array.from(contextByLevel.keys())) {
			if (key > level) contextByLevel.delete(key)
		}
	}

	if (current.length > 0) {
		blocks.push(current.join("\n"))
	}
	if (!sawMarker) return [sourceText]
	return blocks
		.map((block) => block.split("\n").filter((line) => line.trim() !== ""))
		.map((block) => block.join("\n"))
		.filter(Boolean)
}

function hasBarePhraseOnlyDirective(
	directives: ActionDirectiveWithHtml[],
): boolean {
	return directives.some((directive) =>
		directive.portionSelectors.some((selector) => {
			const steps = getSelectorSteps(selector)
			return steps?.length === 1 && steps[0]?.type === "phrase"
		}),
	)
}

function getDirectivesTotalSpecificity(
	directives: ActionDirectiveWithHtml[],
): number {
	return directives.reduce(
		(total, directive) => total + getDirectiveSpecificity(directive),
		0,
	)
}

function collectSplitBlockContextSteps(
	blockText: string,
): PortionSelectorStep[] {
	const lines = blockText
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
	const contextSteps: PortionSelectorStep[] = []

	for (const line of lines) {
		if (extractActionDirectivesFromText(line).length > 0) {
			break
		}
		const context = new TextParserContext(line)
		const selectors = getExtractedReferences(context)
			.flatMap((reference) => extractPortionSelectors(reference))
			.filter(
				(selector): selector is Extract<PortionSelector, { kind: "single" }> =>
					selector.kind === "single" && selector.steps.length > 0,
			)
		if (selectors.length === 0) continue
		const best = selectors.sort(
			(a, b) => getSelectorScore(b) - getSelectorScore(a),
		)[0]
		if (!best) continue
		contextSteps.push(...best.steps)
	}

	return contextSteps
}

function mergeSelectorWithContext(
	selector: PortionSelector,
	contextSteps: PortionSelectorStep[],
): PortionSelector {
	if (selector.kind !== "single" || contextSteps.length === 0) return selector
	let sharedPrefixLength = 0
	while (
		sharedPrefixLength < contextSteps.length &&
		sharedPrefixLength < selector.steps.length
	) {
		const contextStep = contextSteps[sharedPrefixLength]
		const selectorStep = selector.steps[sharedPrefixLength]
		if (
			contextStep?.type !== selectorStep?.type ||
			contextStep?.index !== selectorStep?.index ||
			contextStep?.num !== selectorStep?.num
		) {
			break
		}
		sharedPrefixLength += 1
	}
	return {
		...selector,
		steps: [...contextSteps, ...selector.steps.slice(sharedPrefixLength)],
	}
}

function enrichDirectivesWithSplitBlockContext(
	blockText: string,
	directives: ActionDirectiveWithHtml[],
): ActionDirectiveWithHtml[] {
	const contextSteps = collectSplitBlockContextSteps(blockText)
	if (contextSteps.length === 0) return directives
	return directives.map((directive) => {
		if (directive.portionSelectors.length === 0) return directive
		return {
			...directive,
			portionSelectors: directive.portionSelectors.map((selector) =>
				mergeSelectorWithContext(selector, contextSteps),
			),
		}
	})
}

export function buildDirectivesFromSourceBlock(
	blockText: string,
	blockHtml: string | undefined,
	articleNum?: string | null,
): BuildDirectivesResult {
	const sectionDirective = buildSectionReestablishDirective(blockText)
	if (sectionDirective) {
		return { directives: [sectionDirective], isAction: true }
	}
	const tableStructuredDirectives = buildTableStructuredDirectives(blockText)
	if (tableStructuredDirectives) {
		return { directives: tableStructuredDirectives, isAction: true }
	}
	const finalizeScopedDirectives = (
		scopedDirectives: ActionDirectiveWithHtml[],
	): BuildDirectivesResult | null => {
		if (scopedDirectives.length === 0) return null
		const hasNonDeleteArticle = scopedDirectives.some(
			(directive) => directive.kind !== "delete_article",
		)
		const directives = hasNonDeleteArticle
			? scopedDirectives.filter((directive) => {
					if (directive.kind !== "delete_article") return true
					const text = directive.sourceText.toLowerCase()
					if (text.includes(":")) return false
					if (
						text.includes("a l'article") ||
						text.includes("à l'article") ||
						text.includes("au article")
					) {
						return false
					}
					return true
				})
			: scopedDirectives
		return { directives, isAction: true }
	}

	const fullBlockScopedDirectives = filterDirectivesForArticle(
		extractActionDirectivesFromText(blockText),
		articleNum,
	)
	const fullBlockResult = finalizeScopedDirectives(fullBlockScopedDirectives)

	const sourceBlocks = splitActionSourceBlocks(blockText)
	const rawDirectives = sourceBlocks.flatMap((block) =>
		enrichDirectivesWithSplitBlockContext(
			block,
			extractActionDirectivesFromText(block),
		),
	)
	const scopedDirectives = filterDirectivesForArticle(rawDirectives, articleNum)
	const splitBlockResult = finalizeScopedDirectives(scopedDirectives)
	if (splitBlockResult && fullBlockResult) {
		const splitSpecificity = getDirectivesTotalSpecificity(
			splitBlockResult.directives,
		)
		const fullSpecificity = getDirectivesTotalSpecificity(
			fullBlockResult.directives,
		)
		if (
			hasBarePhraseOnlyDirective(fullBlockResult.directives) &&
			splitSpecificity >= fullSpecificity
		) {
			return splitBlockResult
		}
	}
	if (fullBlockResult) {
		return fullBlockResult
	}
	if (splitBlockResult) {
		return splitBlockResult
	}
	if (rawDirectives.length > 0) {
		return { directives: [], isAction: false }
	}

	const tableDirective = buildTableReplacementDirective(blockText, blockHtml)
	if (tableDirective) {
		return { directives: [tableDirective], isAction: true }
	}
	const isAction = isActionLikeText(blockText)
	return { directives: [], isAction }
}
