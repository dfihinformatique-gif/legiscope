<script lang="ts">
	import { goto } from "$app/navigation"
	import { page } from "$app/state"
	import {
		historyDataToHistoryByText,
		type ArticleInfo,
		type VersionArticle,
	} from "$lib/db_data_types"
	import {
		decodeParametersToVariables,
		encodeParametersToVariables,
		findVariablesByParameter,
		getParameter,
		getSimplifiedCoordOfValuesToHighlight,
		parameterReferences,
		rootParameter,
		variablesSummaries,
	} from "$lib/openfisca_parameters"
	import {
		formatDateFr,
		formatDateFrNumerique,
		shared,
	} from "$lib/shared.svelte"
	import type { ScaleParameter, ValueParameter } from "@openfisca/json-model"
	import {
		assertNever,
		newReverseTransformationsMergedFromPositionsIterator,
		reversePositionsSplitFromPositions,
		simplifyHtml,
		type FragmentPosition,
		type FragmentReverseTransformation,
	} from "@tricoteuses/tisseuse"
	import { diffArrays, diffSentences, type ChangeObject } from "diff"
	import { onMount } from "svelte"
	import ArticleCitations from "./article_citations/ArticleCitations.svelte"
	import ArticleHistory from "./ArticleHistory.svelte"
	import ArticleSummary from "./ArticleSummary.svelte"
	import ParameterLinkModal from "./ParameterLinkModal.svelte"
	import InformationMessage from "./ui_transverse_components/InformationMessage.svelte"

	interface Props {
		articleInfo: ArticleInfo
		pjlDate: string
		showParameterModal: boolean
		parametersToVariables: Record<string, string[]> | null
	}
	let {
		articleInfo,
		pjlDate,
		showParameterModal,
		parametersToVariables = $bindable(),
	}: Props = $props()

	let parameterSimulatorlinksOpen = $state(false)
	let selectedParameter = $state<string | null>(null)
	let clickedParameterButtons = $state<HTMLButtonElement[]>([])

	interface MergeOptions {
		countThreshold?: number
	}

	class LegiSegmenter {
		private segmenter: Intl.Segmenter

		constructor() {
			this.segmenter = new Intl.Segmenter("fr", { granularity: "word" })
		}

		*segment(text: string): Iterable<Intl.SegmentData> {
			const segments = Array.from(this.segmenter.segment(text))
			const result = []

			let i = 0
			while (i < segments.length) {
				const current = segments[i]

				// Vérifier si c'est un segment qui commence une séquence numérique avec espaces
				if (this.isStartOfNumberSequence(segments, i)) {
					const merged = this.mergeNumberSequence(segments, i)
					result.push(merged.segment)
					i = merged.newIndex
				} else {
					result.push(current)
					i++
				}
			}

			for (const seg of result) {
				yield seg
			}
		}

		segmentToArray(text: string): string[] {
			return Array.from(this.segment(text)).map((seg) => seg.segment)
		}

		private isStartOfNumberSequence(
			segments: Intl.SegmentData[],
			index: number,
		): boolean {
			const current = segments[index]
			// Doit être un segment word-like contenant uniquement des chiffres
			return (current.isWordLike && /^\d+$/.test(current.segment)) ?? false
		}

		private mergeNumberSequence(
			segments: Intl.SegmentData[],
			startIndex: number,
		): { segment: Intl.SegmentData; newIndex: number } {
			let i = startIndex
			const numberParts = [segments[i].segment]

			// Continuer tant qu'on a un pattern: nombre + espace + nombre
			while (i + 2 < segments.length) {
				const spaceSegment = segments[i + 1]
				const nextSegment = segments[i + 2]

				// Vérifier les conditions strictes pour la fusion
				const isSpace = spaceSegment.segment === " " && !spaceSegment.isWordLike
				const isNextNumber =
					nextSegment.isWordLike && /^\d+$/.test(nextSegment.segment)

				if (isSpace && isNextNumber) {
					numberParts.push(nextSegment.segment)
					i += 2 // Avancer de 2 (espace + nombre)
				} else {
					break
				}
			}

			if (numberParts.length > 1) {
				// Fusionner avec des espaces
				const mergedSegment = {
					segment: numberParts.join(" "),
					index: segments[startIndex].index,
					isWordLike: true,
					input: segments[startIndex].input,
				}
				return { segment: mergedSegment, newIndex: i + 1 }
			} else {
				// Pas de fusion nécessaire
				return { segment: segments[startIndex], newIndex: startIndex + 1 }
			}
		}

		resolvedOptions(): Intl.ResolvedSegmenterOptions {
			return this.segmenter.resolvedOptions()
		}
	}
	const segmenter = new LegiSegmenter()

	function addEventListenersOnHighlighted() {
		const baseBg = "#ccd3e7" /* Fond bleu clair */
		const hoverBg =
			"rgba(127, 122, 9, 0.5)" /* Fond vert translucide au hover + actif */
		document
			.querySelectorAll<HTMLButtonElement>("button.highlighted")
			.forEach((button) => {
				const buttonInnerText = simplifyHtml({ removeAWithHref: true })(
					button.innerHTML,
				).output.replace(" ", "")
				button.addEventListener("mouseenter", () => {
					if (!showParameterModal) {
						button.style.setProperty("background-color", hoverBg, "important")
						Array.from(
							document.querySelectorAll<HTMLButtonElement>(
								"button.highlighted",
							),
						).forEach((btn) => {
							const btnInnerText = simplifyHtml({ removeAWithHref: true })(
								btn.innerHTML,
							).output.replace(" ", "")

							if (
								btn.dataset.params === button.dataset.params &&
								btnInnerText === buttonInnerText
							)
								btn.style.setProperty("background-color", hoverBg, "important")
						})
					}
				})
				button.addEventListener("mouseleave", () => {
					if (!showParameterModal) {
						button.style.setProperty("background-color", baseBg, "important")
						Array.from(
							document.querySelectorAll<HTMLButtonElement>(
								"button.highlighted",
							),
						).forEach((btn) => {
							if (btn.dataset.params === button.dataset.params)
								btn.style.setProperty("background-color", baseBg, "important")
						})
					}
				})

				button.addEventListener("click", (e: Event) => {
					button.classList.add("bg-le-vert-500/50")
					parametersToVariables = button.dataset.params
						? decodeParametersToVariables(button.dataset.params)
						: {}
					showParameterModal = true
					clickedParameterButtons.push(button)
				})
			})
	}

	// si parametersToVariables change et que le param sélectionné n'existe plus -> reset
	$effect(() => {
		if (
			parametersToVariables &&
			selectedParameter &&
			!(selectedParameter in parametersToVariables)
		) {
			selectedParameter = null
		}
	})

	$effect(() => {
		if (showDiff === false) addEventListenersOnHighlighted()
	})

	function isSmallChange(
		change: ChangeObject<string[]>,
		threshold: number,
	): boolean {
		return (change.count ?? change.value.length) < threshold
	}

	export function mergeSmallChanges(
		diff: ChangeObject<string[]>[],
		options: MergeOptions = {},
	): ChangeObject<string[]>[] {
		const { countThreshold = 8 } = options

		if (diff.length === 0) return diff

		const result: ChangeObject<string[]>[] = []
		let i = 0

		while (i < diff.length) {
			// Chercher une séquence de petits éléments consécutifs
			const sequenceEnd = findSmallSequenceEnd(diff, i, countThreshold)

			if (sequenceEnd === i) {
				// Pas de petite séquence, on garde l'élément tel quel
				result.push(diff[i])
				i++
			} else {
				// On a une séquence de petits éléments, on les fusionne
				const merged = mergeSequence(diff, i, sequenceEnd)
				result.push(...merged)
				i = sequenceEnd
			}
		}

		return result
	}

	function findSmallSequenceEnd(
		diff: ChangeObject<string[]>[],
		start: number,
		threshold: number,
	): number {
		let i = start
		while (i < diff.length && isSmallChange(diff[i], threshold)) {
			i++
		}
		return i
	}

	function mergeSequence(
		diff: ChangeObject<string[]>[],
		start: number,
		end: number,
	): ChangeObject<string[]>[] {
		const sequence = diff.slice(start, end)
		const result: ChangeObject<string[]>[] = []

		// Collecter tous les removed et unchanged
		const removedTokens: string[] = []
		let hasRemoved = false

		for (const item of sequence) {
			if (item.removed) {
				removedTokens.push(...item.value)
				hasRemoved = true
			} else if (!item.added && !item.removed) {
				// Les unchanged sont intercalés dans les removed
				removedTokens.push(...item.value)
			}
		}
		const addedTokens: string[] = []
		let hasAdded = false

		for (const item of sequence) {
			if (item.added) {
				addedTokens.push(...item.value)
				hasAdded = true
			} else if (!item.added && !item.removed) {
				// Les unchanged sont intercalés dans les added
				addedTokens.push(...item.value)
			}
		}

		// Ajouter le bloc removed fusionné s'il existe
		if (hasRemoved) {
			result.push({
				added: false,
				removed: true,
				value: removedTokens,
				count: removedTokens.length,
			})
		}

		// Ajouter le bloc added fusionné s'il existe
		if (hasAdded) {
			result.push({
				added: true,
				removed: false,
				value: addedTokens,
				count: addedTokens.length,
			})
		}

		// Si la séquence ne contient que des unchanged, on les garde tels quels
		if (!hasRemoved && !hasAdded) {
			result.push({
				added: false,
				removed: false,
				value: addedTokens, // ou removedTokens, c'est la même chose
				count: addedTokens.length,
			})
		}

		return result
	}

	// !!! ATTENTION !!!
	// Il faut impérativement que la chaine générée pour currentBlockTextuel soit *exactement* la même que pour previousBlocTextuel
	const currentBlocTextuel = articleInfo.article?.bloc_textuel
		? articleInfo.article.bloc_textuel.replace(
				/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
				(_match, p1, p2) => {
					const lawArticle = p1.replace(".md", "")
					return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem]" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
				},
			)
		: undefined
	// !!! ATTENTION !!!
	// Il faut impérativement que la chaine générée pour currentBlockTextuel soit *exactement* la même que pour previousBlocTextuel
	const previousBlocTextuel = articleInfo.articlePreviousVersion?.bloc_textuel
		? articleInfo.articlePreviousVersion?.bloc_textuel.replace(
				/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
				(_match, p1, p2) => {
					const lawArticle = p1.replace(".md", "")
					return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem]" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
				},
			)
		: undefined

	let showDiff = $state(false)
	const generateHtmlSplitDiff = (
		previousHtml: string,
		currentHtml: string,
	): string => {
		const ATOMIC_SPACE_MARKER = "_"

		const protectLinks = (html: string): string => {
			return html.replace(
				/(<a\b[^>]*>)(.*?)(<\/a>)/gis,
				(match, startTag, content, endTag) => {
					let protectedContent = content

					protectedContent = protectedContent.replace(
						/&nbsp;/gi,
						ATOMIC_SPACE_MARKER,
					)

					protectedContent = protectedContent.replace(
						/\s+/g,
						ATOMIC_SPACE_MARKER,
					)

					protectedContent = protectedContent.replace(
						/[\.\,\-\'’°]/g,
						ATOMIC_SPACE_MARKER,
					)

					return `${startTag}${protectedContent}${endTag}`
				},
			)
		}

		const currentTransformation = simplifyHtml()(currentHtml)
		const currentText = currentTransformation.output

		const previousTransformation = simplifyHtml()(previousHtml)
		const previousText = previousTransformation.output

		const protectedCurrentHtml = protectLinks(currentHtml)
		const protectedPreviousHtml = protectLinks(previousHtml)

		const protectedCurrentText = simplifyHtml()(protectedCurrentHtml).output
		const protectedPreviousText = simplifyHtml()(protectedPreviousHtml).output

		const sentenceChanges = diffSentences(
			protectedPreviousText,
			protectedCurrentText,
		)

		const reworkedChanges: Array<{
			value: string
			added?: boolean
			removed?: boolean
		}> = []

		for (const sentenceChange of sentenceChanges) {
			if (!sentenceChange.added && !sentenceChange.removed) {
				reworkedChanges.push(sentenceChange)
			} else {
				if (sentenceChange.added) {
					const prevIndex = reworkedChanges.length - 1
					if (prevIndex >= 0 && reworkedChanges[prevIndex].removed) {
						const removedSentence = reworkedChanges[prevIndex].value
						const addedSentence = sentenceChange.value

						const tokensRemoved = segmenter.segmentToArray(removedSentence)
						const tokensAdded = segmenter.segmentToArray(addedSentence)

						const arrayChanges = mergeSmallChanges(
							diffArrays(tokensRemoved, tokensAdded),
						)

						const wordChanges = arrayChanges.flatMap((change) => {
							return {
								...change,
								value: change.value.join(""),
							}
						})

						let changedChars = 0
						let totalChars = 0
						for (const wc of wordChanges) {
							totalChars += wc.value.length
							if (wc.added || wc.removed) {
								changedChars += wc.value.length
							}
						}
						const changeRatio = totalChars > 0 ? changedChars / totalChars : 0

						if (changeRatio < 0.4) {
							reworkedChanges.pop()
							reworkedChanges.push(...wordChanges)
						} else {
							reworkedChanges.push(sentenceChange)
						}
					} else {
						reworkedChanges.push(sentenceChange)
					}
				} else if (sentenceChange.removed) {
					reworkedChanges.push(sentenceChange)
				}
			}
		}

		const changes = reworkedChanges.map((change) => ({
			...change,
			value: change.value.replaceAll(ATOMIC_SPACE_MARKER, " "),
		}))

		let currentTextIndex = 0
		let previousTextIndex = 0
		const textPositions: Array<
			| {
					currentPosition: FragmentPosition
					previousIndex: number
					source: "current"
			  }
			| {
					currentIndex: number
					previousPosition: FragmentPosition
					source: "previous"
			  }
		> = []

		for (const change of changes) {
			const changeLength = change.value.length
			if (change.added) {
				const changeStop = currentTextIndex + changeLength
				let start = currentTextIndex
				for (let i = currentTextIndex; i < changeStop; i++) {
					if (currentText[i] === "\n") {
						if (i > start) {
							textPositions.push({
								currentPosition: {
									start,
									stop: i,
								},
								previousIndex: previousTextIndex,
								source: "current",
							})
						}
						textPositions.push({
							currentPosition: {
								start: i,
								stop: i + 1,
							},
							previousIndex: previousTextIndex,
							source: "current",
						})
						start = i + 1
					}
				}
				if (start < changeStop) {
					textPositions.push({
						currentPosition: {
							start,
							stop: changeStop,
						},
						previousIndex: previousTextIndex,
						source: "current",
					})
				}
				currentTextIndex += changeLength
			} else if (change.removed) {
				const changeStop = previousTextIndex + changeLength
				let start = previousTextIndex
				for (let i = previousTextIndex; i < changeStop; i++) {
					if (previousText[i] === "\n") {
						if (i > start) {
							textPositions.push({
								currentIndex: currentTextIndex,
								previousPosition: {
									start,
									stop: i,
								},
								source: "previous",
							})
						}
						textPositions.push({
							currentIndex: currentTextIndex,
							previousPosition: {
								start: i,
								stop: i + 1,
							},
							source: "previous",
						})
						start = i + 1
					}
				}
				if (start < changeStop) {
					textPositions.push({
						currentIndex: currentTextIndex,
						previousPosition: {
							start,
							stop: changeStop,
						},
						source: "previous",
					})
				}
				previousTextIndex += changeLength
			} else {
				previousTextIndex += changeLength
				currentTextIndex += changeLength
			}
		}

		const currentHtmlPositions = reversePositionsSplitFromPositions(
			currentTransformation,
			textPositions.map((textPositionForChange) =>
				textPositionForChange.source === "previous"
					? {
							start: textPositionForChange.currentIndex,
							stop: textPositionForChange.currentIndex,
						}
					: textPositionForChange.currentPosition,
			),
		)
		const previousHtmlPositions = reversePositionsSplitFromPositions(
			previousTransformation,
			textPositions.map((textPositionForChange) =>
				textPositionForChange.source === "current"
					? {
							start: textPositionForChange.previousIndex,
							stop: textPositionForChange.previousIndex,
						}
					: textPositionForChange.previousPosition,
			),
		)
		let currentHtmlIndex = 0
		const htmlFragments: string[] = []
		let previousHtmlIndex = 0
		for (const [
			changeIndex,
			textPositionForChange,
		] of textPositions.entries()) {
			switch (textPositionForChange.source) {
				case "current": {
					const previousHtmlPosition = previousHtmlPositions[changeIndex][0]
					if (previousHtmlPosition.start > previousHtmlIndex) {
						htmlFragments.push(
							previousHtml.slice(previousHtmlIndex, previousHtmlPosition.start),
						)
						previousHtmlIndex += previousHtmlPosition.start - previousHtmlIndex
					}
					const lineBreak =
						currentText.slice(
							textPositionForChange.currentPosition.start,
							textPositionForChange.currentPosition.stop,
						) === "\n"
					for (const [i, currentHtmlPosition] of currentHtmlPositions[
						changeIndex
					].entries()) {
						if (i > 0 && currentHtmlPosition.start > currentHtmlIndex) {
							htmlFragments.push(
								currentHtml.slice(currentHtmlIndex, currentHtmlPosition.start),
							)
						}
						const currentOriginalHtmlFragment = currentHtml.slice(
							currentHtmlPosition.start,
							currentHtmlPosition.stop,
						)
						const currentModifiedHtmlFragment = lineBreak
							? currentOriginalHtmlFragment
							: `<span class="rounded-md px-0.5 bg-green-50 text-green-900">${currentOriginalHtmlFragment}</span>`
						htmlFragments.push(currentModifiedHtmlFragment)
						currentHtmlIndex = currentHtmlPosition.stop
					}
					break
				}

				case "previous": {
					const currentHtmlPosition = currentHtmlPositions[changeIndex][0]
					if (currentHtmlPosition.start > currentHtmlIndex) {
						currentHtmlIndex += currentHtmlPosition.start - currentHtmlIndex
					}
					const lineBreak =
						previousText.slice(
							textPositionForChange.previousPosition.start,
							textPositionForChange.previousPosition.stop,
						) === "\n"
					for (const previousHtmlPosition of previousHtmlPositions[
						changeIndex
					]) {
						if (previousHtmlPosition.start > previousHtmlIndex) {
							htmlFragments.push(
								previousHtml.slice(
									previousHtmlIndex,
									previousHtmlPosition.start,
								),
							)
						}
						const previousOriginalHtmlFragment = previousHtml.slice(
							previousHtmlPosition.start,
							previousHtmlPosition.stop,
						)
						const previousModifiedHtmlFragment = lineBreak
							? previousOriginalHtmlFragment
							: `<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${previousOriginalHtmlFragment}</span>`
						htmlFragments.push(previousModifiedHtmlFragment)
						previousHtmlIndex = previousHtmlPosition.stop
					}
					break
				}

				default: {
					assertNever(
						"HtmlDiffInline textPositionsForChange.source",
						textPositionForChange,
					)
				}
			}
		}
		if (previousHtmlIndex < previousHtml.length) {
			htmlFragments.push(previousHtml.slice(previousHtmlIndex))
		}

		return htmlFragments.join("")
	}

	const diffContent = $derived.by(() => {
		if (showDiff === true && currentBlocTextuel && previousBlocTextuel) {
			return generateHtmlSplitDiff(previousBlocTextuel, currentBlocTextuel)
		}
		return `<div class="font-sans text-sm text-le-gris-dispositif-dark py-4 text-center ">Il n'y a pas de version précédente à comparer</div>`
	})

	onMount(() => {
		addEventListenersOnHighlighted()
	})

	function injectHighlightsIntoHtml(
		html: string,
		coordsToHighlight: Map<
			{
				simplifiedStart: number
				simplifiedStop: number
				originalStart: number
				originalStop: number
				innerPrefix?: string
				innerSuffix?: string
				outerPrefix?: string
				outerSuffix?: string
			},
			{ parameters: string[] }
		>,
	): string {
		const highlights = Array.from(coordsToHighlight.entries()).sort(
			([a], [b]) => b.originalStart - a.originalStart,
		)

		let result = html

		for (const [coords, { parameters }] of highlights) {
			const { originalStart, originalStop } = coords
			const before = result.slice(0, originalStart)
			const target = result.slice(originalStart, originalStop)
			const after = result.slice(originalStop)

			const title = parameters.join(", ")
			const parametersToVariables: Record<string, string[]> = {}

			for (const parameter of parameters) {
				// const possibleVariables = findVariablesByParameter(parameter)
				parametersToVariables[parameter] = findVariablesByParameter(parameter)
			}

			result = `${before}${coords.outerPrefix ?? ""}<button class="px-1 hover:bg-le-vert-500/50 highlighted cursor-pointer bg-le-gris-dispositif-light [&>*]:!bg-transparent" data-params="${encodeParametersToVariables(parametersToVariables)}">${coords.innerPrefix ?? ""}${target}${coords.innerSuffix ?? ""}</button>${coords.outerSuffix ?? ""}${after}`
		}

		return result
	}

	function generateMiddleDate(startDate: string, endDate: string): string {
		const start = new Date(startDate + "T00:00:00")
		const end = new Date(endDate + "T00:00:00")

		const middleTimestamp =
			start.getTime() + (end.getTime() - start.getTime()) / 2

		const middleDate = new Date(middleTimestamp)

		return middleDate.toISOString().split("T")[0]
	}

	function highlightParameterValuesInArticleHTML(
		articleParameterReferences: Array<ValueParameter | ScaleParameter>,
	): string {
		const articleText = currentBlocTextuel ?? ""

		const simplified = simplifyHtml({ removeAWithHref: true })(articleText)
		const textPlain = simplified.output
		let processedHtml = articleText

		const simplifiedCoordWithParameters: Map<
			{ start: number; stop: number },
			Array<string>
		> = new Map()

		const coordsToHighlight: Map<
			{
				simplifiedStart: number
				simplifiedStop: number
				originalStart: number
				originalStop: number
				innerPrefix?: string
				innerSuffix?: string
				outerPrefix?: string
				outerSuffix?: string
			},
			{ parameters: Array<string> }
		> = new Map()

		const dateForParameterValuesSearch = generateMiddleDate(
			articleInfo.article?.date_debut!,
			articleInfo.article?.date_fin!,
		)

		articleParameterReferences.forEach((param) => {
			const simplifiedCoordToHighlight = getSimplifiedCoordOfValuesToHighlight(
				textPlain,
				param,
				dateForParameterValuesSearch,
			)
			if (simplifiedCoordToHighlight.length > 0) {
				simplifiedCoordToHighlight.forEach(
					(coord: { start: number; stop: number }) => {
						let existingKey = null
						for (const [key] of simplifiedCoordWithParameters) {
							if (key.start === coord.start && key.stop === coord.stop) {
								existingKey = key
								break
							}
						}

						if (
							existingKey &&
							!simplifiedCoordWithParameters
								.get(existingKey)!
								.includes(param.name!)
						) {
							simplifiedCoordWithParameters.get(existingKey)!.push(param.name!)
						} else {
							simplifiedCoordWithParameters.set(coord, [param.name!])
						}
					},
				)
			}
		})

		const sortedSimplifiedCoord = simplifiedCoordWithParameters
			.keys()
			.toArray()
			.filter(
				(item, index, self) =>
					index ===
					self.findIndex((r) => r.start === item.start && r.stop === item.stop),
			)
			.sort((a, b) => a.start - b.start)
		const originalPositionsIterator =
			newReverseTransformationsMergedFromPositionsIterator(simplified)
		const coordsInOriginal: FragmentReverseTransformation[] = []
		for (const simplifiedCoord of sortedSimplifiedCoord) {
			const result = originalPositionsIterator.next(simplifiedCoord)
			coordsInOriginal.push(result.value!)
		}

		if (sortedSimplifiedCoord.length > 0) {
			sortedSimplifiedCoord.forEach((coord, index) => {
				coordsToHighlight.set(
					{
						simplifiedStart: coord.start,
						simplifiedStop: coord.stop,
						originalStart: coordsInOriginal[index].position.start,
						originalStop: coordsInOriginal[index].position.stop,
						innerPrefix: coordsInOriginal[index].innerPrefix,
						outerPrefix: coordsInOriginal[index].outerPrefix,
						innerSuffix: coordsInOriginal[index].innerSuffix,
						outerSuffix: coordsInOriginal[index].outerSuffix,
					},
					{ parameters: simplifiedCoordWithParameters.get(coord)! },
				)
			})
		}
		if (coordsToHighlight.size > 0) {
			processedHtml = injectHighlightsIntoHtml(articleText, coordsToHighlight)
		}

		return processedHtml
	}

	let selectedVersion: VersionArticle | undefined = $state(undefined)

	const dateForSelect = page.url.searchParams.get("date") ?? shared.pjlDate

	const ongletsArticle = [
		{ id: "content", label: "Texte" },
		{ id: "history", label: "Historique" },
		{ id: "citations", label: "Articles citant cet article" },
	]
	let activeTab = $state("content")
	let tabsContainer = $state<HTMLElement | undefined>(undefined)
	let showRightScrollShadow = $state(false)
	// Pour rendre les onglets scrollables à l'horizontal
	function checkScroll() {
		if (!tabsContainer) return
		const { scrollLeft, scrollWidth, clientWidth } = tabsContainer
		showRightScrollShadow = scrollLeft + clientWidth < scrollWidth - 1
	}

	$effect(() => {
		if (tabsContainer) {
			checkScroll()
			const resizeObserver = new ResizeObserver(() => checkScroll())
			resizeObserver.observe(tabsContainer)
			return () => resizeObserver.disconnect()
		}
	})

	const allVersions =
		articleInfo.versions !== undefined && articleInfo.versions.length > 1
			? new Set(articleInfo.versions.map((article) => article.legi_id_lien))
			: new Set(articleInfo.article?.legi_id)

	const articleParameterReferences = Array.from(
		new Set(
			Array.from(parameterReferences.entries())
				.filter(([key]) => allVersions.has(key))
				.flatMap(([, values]) => values),
		),
	)

	const historyByText = articleInfo.historyLinks
		? historyDataToHistoryByText(articleInfo.historyLinks)
		: undefined
</script>

{#if articleInfo.article}
	<!--En-tête-->
	{#if articleInfo.article}
		{@const articleFromUrl = page.url.searchParams.get("article") ?? ""}

		{#if articleFromUrl.startsWith("LEGITEXT") || articleFromUrl.startsWith("JORFTEXT") || articleFromUrl.startsWith("LEGISCTA") || articleFromUrl.startsWith("JORFSCTA")}
			{@const originLabel =
				articleFromUrl.startsWith("LEGITEXT") ||
				articleFromUrl.startsWith("JORFTEXT")
					? articleInfo.textTitle
					: articleInfo.sectionTitle}
			<InformationMessage
				>Vous êtes sur le premier article de la section {#if originLabel}
					« {originLabel} ».
				{:else}.{/if}</InformationMessage
			>
		{/if}
	{/if}
	<!--Titre-->
	<header
		class="my-5 flex flex-col justify-between gap-x-5 px-4 md:flex-row md:items-center lg:px-0"
	>
		<h1 class="flex-wrap text-left font-sans text-2xl text-neutral-900">
			<iconify-icon
				class="align-[-0.2rem] text-2xl"
				icon="ri:book-marked-fill"
				aria-hidden="true"
			>
			</iconify-icon>
			{#if articleInfo.article.num !== undefined}
				<span class="text-nowrap">Article {articleInfo.article.num}</span>
			{/if} <span aria-hidden="true">·</span>
			<span class="">{articleInfo.textTitle?.replaceAll("\\n", " ")}</span>
		</h1>
		<a
			class="lx-link-simple self-end text-sm text-nowrap text-gray-500 md:self-auto"
			href="https://www.legifrance.gouv.fr/loda/id/{articleInfo.article
				.legi_id}"
			target="_blank"
			>Légifrance<iconify-icon
				class="ml-0.5 align-[-0.15rem] text-sm"
				icon="ri:external-link-line"
			></iconify-icon></a
		>
	</header>

	<nav class="relative" aria-label="Navigation de l’article">
		<div
			bind:this={tabsContainer}
			onscroll={checkScroll}
			class="scrollbar-hide flex items-end gap-x-1 overflow-x-auto pr-1 whitespace-nowrap"
		>
			{#each ongletsArticle as tab}
				<button
					class="rounded-t-xs px-4 py-2 font-sans transition-colors"
					class:bg-blue-50={activeTab === tab.id}
					class:bg-[#C9D7ED]={activeTab !== tab.id}
					class:cursor-pointer={activeTab !== tab.id}
					class:text-neutral-700={activeTab === tab.id}
					class:text-le-gris-dispositif={activeTab !== tab.id}
					class:hover:text-le-gris-dispositif-dark={activeTab !== tab.id}
					class:shrink-0={true}
					onclick={() => {
						activeTab = tab.id
					}}
				>
					{tab.label}
				</button>
			{/each}
		</div>
		{#if showRightScrollShadow}
			<div
				class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-blue-900/10 to-transparent"
			></div>
		{/if}
	</nav>

	<div
		class="mb-20 h-fit w-full max-w-6xl min-w-0 bg-blue-50 p-4 pb-20 text-justify shadow-md"
		class:md:p-16={!shared.showBillDesktop}
		style="transform: translateZ(0); backface-visibility: hidden; will-change: transform;"
	>
		{#if activeTab === "content"}
			<!--Version : selection et contexte-->
			<section class="mb-8 flex flex-col gap-y-5">
				<h2 class="sr-only">Version de l'article</h2>
				{#if articleInfo.versions}
					<div class="hidden @sm/section-article:flex">
						<select
							name="versions"
							class="border-le-gris-dispositif w-full grow cursor-pointer truncate overflow-x-hidden rounded-t-sm border-b-3 bg-white p-2 text-left font-serif text-black italic @md/section-article:text-lg"
							onchange={() => {
								const urlToNavigate = new URL(page.url)
								urlToNavigate.searchParams.set(
									"article",
									selectedVersion!.legi_id_lien,
								)
								urlToNavigate.searchParams.set(
									"date",
									new Date(selectedVersion!.debut).toISOString().split("T")[0],
								)
								goto(urlToNavigate, { replaceState: false })
							}}
							bind:value={selectedVersion}
						>
							{#each articleInfo.versions as version (version.legi_id_lien)}
								<option
									value={version}
									selected={articleInfo.article.legi_id ===
										version.legi_id_lien}
								>
									{#if version.debut}
										{#if version.legi_id_lien.startsWith("JORF")}Journal
											officiel du {formatDateFr(articleInfo.jorfTextDatePubli!)}
										{:else if version.debut === "2999-01-01"}
											Version de versement
										{:else if version.fin === "2999-01-01"}
											{#if version.debut === "2222-02-22"}
												Version en vigueur différée ou article mort-né
											{:else}
												Version en vigueur depuis le {formatDateFr(
													version.debut,
												)}
											{/if}
										{:else}
											Version du {formatDateFr(version.debut)}
											au {formatDateFr(version.fin)}
										{/if}
									{/if}
								</option>
							{/each}
						</select>
					</div>
					<div class="@sm/section-article:hidden">
						<select
							name="versions"
							class="border-le-gris-dispositif w-full grow cursor-pointer truncate overflow-x-hidden rounded-t-sm border-b-3 bg-white p-2 text-left font-serif text-base text-black italic @xs/section-article:text-lg"
							onchange={() => {
								const urlToNavigate = new URL(page.url)
								urlToNavigate.searchParams.set(
									"article",
									selectedVersion!.legi_id_lien,
								)
								urlToNavigate.searchParams.set(
									"date",
									new Date(selectedVersion!.debut).toISOString().split("T")[0],
								)
								goto(urlToNavigate, { replaceState: false })
							}}
							bind:value={selectedVersion}
						>
							{#each articleInfo.versions as version (version.legi_id_lien)}
								<option
									value={version}
									selected={articleInfo.article.legi_id ===
										version.legi_id_lien}
								>
									{#if version.debut}
										{#if version.legi_id_lien.startsWith("JORF")}J0 du {formatDateFrNumerique(
												articleInfo.jorfTextDatePubli!,
											)}
										{:else if version.debut === "2999-01-01"}
											Version de versement
										{:else if version.fin === "2999-01-01"}
											{#if version.debut === "2222-02-22"}
												Version en vigueur différée ou article mort-né
											{:else}
												Version en vigueur depuis le {formatDateFrNumerique(
													version.debut,
												)}
											{/if}
										{:else}
											Version du {formatDateFrNumerique(version.debut)}
											au {formatDateFrNumerique(version.fin)}
										{/if}
									{/if}
								</option>
							{/each}
						</select>
					</div>
				{/if}
				{#if historyByText && historyByText.length > 0}
					<ul>
						{#each historyByText as historyText}
							<li
								class="line-clamp-2 pb-1 text-left text-xs text-neutral-600 italic"
							>
								<span
									class="cursor-default rounded-md border border-neutral-300 bg-neutral-100 px-1"
									>Suite à {historyText.typelien} par</span
								>
								{historyText.titre_texte} (
								{#if historyText.articles_jorf && historyText.articles_jorf.length > 0}
									{#each historyText.articles_jorf as historyArticle, index}
										{@const urlToNavigate = new URL(page.url)}
										{urlToNavigate.searchParams.set(
											"article",
											historyArticle.id,
										)}
										<a class="lx-link-text" href={urlToNavigate.href}>
											{#if historyArticle.num !== undefined}
												art. {historyArticle.num}
											{/if}
										</a>
										{#if index < historyText.articles_jorf.length - 1}
											,
										{/if}
									{/each}
								{:else}
									{@const urlToNavigate = new URL(page.url)}
									{urlToNavigate.searchParams.set(
										"article",
										historyText.cidtexte,
									)}
									<a class="lx-link-text" href={urlToNavigate.href}>texte</a>
								{/if}
								)
							</li>
						{/each}
					</ul>
				{/if}
				<!--Sommaire-->
				<ArticleSummary {articleInfo} date={dateForSelect}></ArticleSummary>
			</section>

			<!--Texte de la version-->
			<section>
				<h2 class="sr-only">Texte de l’article</h2>
				{#if articleInfo.versions}
					<div class="my-4 flex w-full justify-end text-left">
						<label class="inline-flex cursor-pointer items-center">
							<input
								class="peer sr-only"
								type="checkbox"
								bind:checked={showDiff}
							/>
							{#if articleInfo.versions.length > 1}
								<div
									class="peer peer-checked:bg-le-gris-dispositif-dark relative h-6 w-11 shrink-0 rounded-full bg-gray-400 peer-focus:ring-0 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
								></div>
								<span class="ms-3 text-xs font-medium text-gray-900 sm:text-sm">
									Voir les changements apportés <br /> à la version précédente
								</span>
							{/if}
						</label>
					</div>
				{/if}

				{#if showDiff === true}
					<div class="-mt-2 rounded-md bg-blue-100 px-2 pt-1">
						<span class="font-serif text-lg leading-8 md:text-left">
							{@html diffContent}
						</span>
					</div>
				{:else if showDiff === false && currentBlocTextuel !== undefined && currentBlocTextuel !== null}
					<span class="font-serif text-lg leading-8 md:text-left"
						>{@html highlightParameterValuesInArticleHTML(
							articleParameterReferences,
						)}</span
					>
				{/if}
			</section>
		{:else if activeTab === "history"}
			<ArticleHistory {articleInfo}></ArticleHistory>
		{:else if activeTab === "citations"}
			<ArticleCitations {articleInfo}></ArticleCitations>
			<AlertDatabaseMessage>
				<b
					>Certaines versions ne citent pas cet article ? Il manque des
					citations ?</b
				>
				Le Légiscope s'appuie sur la liste des citations mise à disposition par Légifrance.
				Cette liste peut contenir des erreurs ou des manques.
			</AlertDatabaseMessage>
		{/if}
	</div>
{:else}
	<div class="flex h-screen w-full flex-col justify-center">
		<iconify-icon class="text-8xl text-gray-300" icon="ri:book-marked-fill"
		></iconify-icon>
		<p class="text-center font-medium text-gray-500 uppercase">Cet article</p>
		<p class="text-center font-medium text-gray-500 uppercase">
			est introuvable
		</p>

		<iconify-icon class="text-8xl text-gray-300" icon="ri:question-mark"
		></iconify-icon>
	</div>
{/if}

<ParameterLinkModal
	bind:showParameterModal
	{clickedParameterButtons}
	bind:parametersToVariables
>
	{#if parametersToVariables !== null}
		{@const parameterCount = Object.keys(parametersToVariables).length}

		{#if parameterCount === 0}
			<p>Aucun paramètre associé.</p>
		{:else if parameterCount === 1}
			<!-- Cas 1 : un seul paramètre → afficher directement les dispositifs -->
			{@const onlyEntry = Object.entries(parametersToVariables)[0]}
			{@const onlyParameter = onlyEntry[0]}
			{@const variables = onlyEntry[1] ?? []}
			{@const parameterLabel =
				getParameter(rootParameter, onlyParameter)?.short_label ??
				onlyParameter}

			{@const variableCount = variables.length}

			{#if variableCount > 1}
				<p class="">
					Le paramètre <span
						class="bg-le-gris-dispositif-ultralight text-le-gris-dispositif-dark rounded-sm px-2 font-serif italic"
						>{parameterLabel}</span
					>
					intervient dans plusieurs dispositifs.
					<strong>Choisissez en un pour débuter votre évaluation :</strong>
				</p>

				<ul class="mt-4 ml-4 list-disc">
					{#each variables as variable}
						{@const variableLabel =
							variablesSummaries[variable]?.label ?? variable}
						{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(onlyParameter)}`}
						<li class="mb-4">
							<p>
								<a
									href={linkHref}
									target="_blank"
									rel="noopener"
									class="lx-link-text text-le-jaune-very-dark"
									aria-label={`Amender et évaluer ${variableLabel}`}
								>
									<span class="font-bold">{variableLabel}</span> | Amender et
									évaluer
									<iconify-icon
										class="align-[-0.3rem] text-xl"
										icon="ri-arrow-right-line"
									></iconify-icon>
								</a>
							</p>
						</li>
					{/each}
				</ul>
			{:else if variableCount === 1}
				<p class="">
					Le paramètre <span
						class="bg-le-gris-dispositif-ultralight text-le-gris-dispositif-dark rounded-sm px-2 font-serif italic"
						>{parameterLabel}</span
					> intervient dans le dispositif suivant :
				</p>
				<div class="mt-4">
					{#each variables as variable}
						{@const variableLabel =
							variablesSummaries[variable]?.label ?? variable}
						{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(onlyParameter)}`}
						<div class="mb-2">
							<p>
								<a
									href={linkHref}
									target="_blank"
									rel="noopener"
									class="lx-link-text text-le-jaune-very-dark"
									aria-label={`Amender et évaluer ${variableLabel}`}
									><span class="font-bold">{variableLabel}</span> | Amender et
									évaluer
									<iconify-icon
										class="align-[-0.3rem] text-xl"
										icon="ri-arrow-right-line"
									></iconify-icon>
								</a>
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<p>Aucun dispositif trouvé pour ce paramètre.</p>
			{/if}
		{:else}
			<!-- Cas 2 : plusieurs paramètres → deux étapes (liste des paramètres → choix du dispositif) -->
			{#if selectedParameter === null}
				<!-- Étape 1 : liste des paramètres -->

				<p>
					Cette valeur semble correspondre à {parameterCount} paramètres dans le
					simulateur LexImpact.
					<strong>Choisissez celui que vous souhaitez examiner :</strong>
				</p>

				<ul class="mt-4 ml-4 list-disc">
					{#each Object.entries(parametersToVariables) as [parameter, variables]}
						{@const parameterLabel =
							getParameter(rootParameter, parameter)?.short_label ?? parameter}
						<li class="mb-3">
							<button
								class="lx-link-simple bg-le-gris-dispositif-ultralight rounded-sm px-2 text-left"
								onclick={() => (selectedParameter = parameter)}
								aria-label={`Voir dispositifs pour ${parameterLabel}`}
							>
								<span class=" font-serif italic">{parameterLabel}</span>
							</button>
						</li>
					{/each}
				</ul>

				<!-- Liens directs optionnels -->
				<div class="mt-4 rounded-md bg-neutral-100">
					<button
						type="button"
						class="flex h-10 w-full items-center justify-between gap-3 px-4 text-sm"
						class:bg-neutral-50={parameterSimulatorlinksOpen}
						onclick={() =>
							(parameterSimulatorlinksOpen = !parameterSimulatorlinksOpen)}
						aria-expanded={parameterSimulatorlinksOpen}
					>
						<span class:font-bold={parameterSimulatorlinksOpen}
							>Voir directement tous les liens vers le simulateur</span
						>

						<iconify-icon
							class="text-lg transition-transform duration-150"
							class:rotate-180={parameterSimulatorlinksOpen}
							icon="ri:arrow-down-s-line"
							aria-hidden="true"
						></iconify-icon>
					</button>

					{#if parameterSimulatorlinksOpen}
						<div class="space-y-2 p-4">
							<ul class="ml-4 list-disc">
								{#each Object.entries(parametersToVariables) as [parameter, variables]}
									{#each variables as variable}
										{@const variableLabel =
											variablesSummaries[variable]?.label ?? variable}
										{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(parameter)}`}
										<li class="mb-2">
											<a
												href={linkHref}
												target="_blank"
												rel="noopener"
												class="lx-link-text text-le-jaune-very-dark text-sm"
											>
												<span
													class=" text-le-gris-dispositif-dark rounded-sm font-serif italic"
													>{getParameter(rootParameter, parameter)
														?.short_label ?? parameter}</span
												>
												| {variableLabel}<iconify-icon
													class="ml-1 align-[-0.3rem] text-xl"
													icon="ri-arrow-right-line"
												></iconify-icon>
											</a>
										</li>
									{/each}
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Étape 2 : détails du paramètre sélectionné -->
				{@const variables = parametersToVariables[selectedParameter] ?? []}
				{@const parameterLabel =
					getParameter(rootParameter, selectedParameter)?.short_label ??
					selectedParameter}
				{@const variableCount = variables.length}

				<button
					class="lx-link-uppercase mb-4"
					onclick={() => (selectedParameter = null)}
					aria-label="Retour à la liste des paramètres"
				>
					<iconify-icon
						class="mr-1 align-[-0.3rem] text-xl"
						icon="ri-arrow-left-line"
					></iconify-icon> Retour
				</button>

				{#if variableCount > 1}
					<p class="">
						Le paramètre <span
							class="bg-le-gris-dispositif-ultralight text-le-gris-dispositif-dark rounded-sm px-2 font-serif italic"
							>{parameterLabel}</span
						>
						intervient dans plusieurs dispositifs.
						<strong>Choisissez en un pour débuter votre évaluation :</strong>
					</p>

					<ul class="mt-4 ml-4 list-disc">
						{#each variables as variable}
							{@const variableLabel =
								variablesSummaries[variable]?.label ?? variable}
							{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(selectedParameter)}`}
							<li class="mb-4">
								<p>
									<a
										href={linkHref}
										target="_blank"
										rel="noopener"
										class="lx-link-text text-le-jaune-very-dark"
										aria-label={`Amender et évaluer ${variableLabel}`}
										><span class="font-bold">{variableLabel}</span> | Amender et
										évaluer
										<iconify-icon
											class="align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</p>
							</li>
						{/each}
					</ul>
				{:else if variableCount === 1}
					<p class="">
						Le paramètre <span
							class="bg-le-gris-dispositif-ultralight text-le-gris-dispositif-dark rounded-sm px-2 font-serif italic"
							>{parameterLabel}</span
						> intervient dans le dispositif suivant :
					</p>
					<div class="mt-4">
						{#each variables as variable}
							{@const variableLabel =
								variablesSummaries[variable]?.label ?? variable}
							{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(selectedParameter)}`}
							<div class="mb-2">
								<p>
									<a
										href={linkHref}
										target="_blank"
										rel="noopener"
										class="lx-link-text text-le-jaune-very-dark"
										aria-label={`Amender et évaluer ${variableLabel}`}
									>
										<span class="font-bold">{variableLabel}</span> | Amender et
										évaluer
										<iconify-icon
											class="align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</p>
							</div>
						{/each}
					</div>
				{:else}
					<p>Aucun dispositif trouvé pour ce paramètre.</p>
				{/if}
			{/if}
		{/if}
	{/if}
</ParameterLinkModal>
