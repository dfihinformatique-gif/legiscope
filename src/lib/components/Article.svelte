<script lang="ts">
	import { goto } from "$app/navigation"
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import Popover from "$lib/components/ui_transverse_components/Popover.svelte"
	import {
		historyDataToHistoryByText,
		type ArticleInfo,
		type Legiarti,
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
	import { Diff, diffArrays, type Change, type ChangeObject } from "diff"
	import { onMount } from "svelte"
	import { SvelteMap } from "svelte/reactivity"
	import ArticleCitations from "./article_citations/ArticleCitations.svelte"
	import ArticleHistory from "./ArticleHistory.svelte"
	import ArticlesModificateurs from "./ArticlesModificateurs.svelte"
	import ParameterLinkModal from "./ParameterLinkModal.svelte"
	import InformationMessage from "./ui_transverse_components/InformationMessage.svelte"

	interface Props {
		articleInfo: ArticleInfo
		showParameterModal: boolean
		parametersToVariables: Record<string, string[]> | null
	}
	let {
		articleInfo,
		showParameterModal,
		parametersToVariables = $bindable(),
	}: Props = $props()

	let parameterSimulatorlinksOpen = $state(false)
	let selectedParameter = $state<string | null>(null)
	let clickedParameterButtons = $state<HTMLButtonElement[]>([])

	interface MergeOptions {
		countThreshold?: number
	}

	class SentenceDiff extends Diff<string, string, string> {
		constructor() {
			super()
		}

		tokenize(value: string): string[] {
			const sentences: string[] = []
			let current = ""
			const delimiters = [".", "!", "?", ";", ":"]
			const whitespace = [" ", "\n", "\r", "\t"]

			for (let i = 0; i < value.length; i++) {
				current += value[i]

				if (
					delimiters.includes(value[i]) &&
					whitespace.includes(value[i + 1])
				) {
					const beforeDelimiter = current.slice(-2, -1)
					const isExceptionCase =
						value[i] === "." &&
						(beforeDelimiter === "L" || beforeDelimiter === "R")

					if (!isExceptionCase) {
						current += value[i + 1]
						sentences.push(current)
						current = ""
						i++
					}
				}
			}

			if (current) {
				sentences.push(current)
			}

			return sentences.length > 0 ? sentences : [value]
		}
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

				// Vérifier si c'est le début d'une référence légale
				if (this.isStartOfLegalReference(segments, i)) {
					const merged = this.mergeLegalReference(segments, i)
					result.push(merged.segment)
					i = merged.newIndex
				}
				// Vérifier si c'est un segment qui commence une séquence numérique avec espaces
				else if (this.isStartOfNumberSequence(segments, i)) {
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

		private isStartOfLegalReference(
			segments: Intl.SegmentData[],
			index: number,
		): boolean {
			const current = segments[index]
			// Doit commencer par L ou R (majuscule)
			return current.isWordLike === true && /^[LR]$/.test(current.segment)
		}

		private mergeLegalReference(
			segments: Intl.SegmentData[],
			startIndex: number,
		): { segment: Intl.SegmentData; newIndex: number } {
			let i = startIndex
			const parts = [segments[i].segment] // L ou R

			// Vérifier si suivi par un point et éventuellement un espace
			if (i + 1 < segments.length && segments[i + 1].segment === ".") {
				parts.push(".")
				i += 1

				// Espace optionnel après le point
				if (i + 1 < segments.length && segments[i + 1].segment === " ") {
					parts.push(" ")
					i += 1
				}
			}
			// Sinon, continuer directement avec les chiffres (ex: L5125-1-1)

			// Maintenant, capturer la séquence de chiffres, tirets et espaces
			while (i + 1 < segments.length) {
				const next = segments[i + 1]

				// Accepter les chiffres
				if (next.isWordLike && /^\d+$/.test(next.segment)) {
					parts.push(next.segment)
					i += 1
				}
				// Accepter les tirets
				else if (next.segment === "-") {
					parts.push(next.segment)
					i += 1
				}
				// Accepter les espaces seulement s'ils sont suivis de chiffres ou de lettres (pour le suffixe A, B, etc.)
				else if (next.segment === " " && i + 2 < segments.length) {
					const afterSpace = segments[i + 2]
					if (
						(afterSpace.isWordLike && /^\d+$/.test(afterSpace.segment)) ||
						(afterSpace.isWordLike && /^[A-Z]$/.test(afterSpace.segment))
					) {
						parts.push(next.segment)
						i += 1
					} else {
						break
					}
				}
				// Accepter une lettre majuscule finale (A, B, etc.)
				else if (
					next.isWordLike &&
					/^[A-Z]$/.test(next.segment) &&
					parts.length > 2
				) {
					parts.push(next.segment)
					i += 1
					break // Une lettre finale termine la référence
				} else {
					break
				}
			}

			// Vérifier qu'on a bien une référence légale complète (au moins L/R + . + chiffres ou L/R + chiffres)
			const merged = parts.join("")
			if (/^[LR]\.?\s?\d+[\d\s-]*[A-Z]?$/.test(merged)) {
				const mergedSegment = {
					segment: merged,
					index: segments[startIndex].index,
					isWordLike: true,
					input: segments[startIndex].input,
				}
				return { segment: mergedSegment, newIndex: i + 1 }
			} else {
				// Pas une référence légale valide, retourner juste le premier segment
				return { segment: segments[startIndex], newIndex: startIndex + 1 }
			}
		}

		private isStartOfNumberSequence(
			segments: Intl.SegmentData[],
			index: number,
		): boolean {
			const current = segments[index]
			// Doit être un segment word-like contenant uniquement des chiffres
			// ET ne pas être le début d'une référence légale
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

				button.addEventListener("click", () => {
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
	const currentBlocTextuel = $derived(
		articleInfo.article?.bloc_textuel
			? articleInfo.article.bloc_textuel.replace(
					/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
					(_match, p1, p2) => {
						const lawArticle = p1.replace(".md", "")
						return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] hover:text-le-gris-dispositif-dark hover:!decoration-le-gris-dispositif-dark" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
					},
				)
			: undefined,
	)
	// !!! ATTENTION !!!
	// Il faut impérativement que la chaine générée pour currentBlockTextuel soit *exactement* la même que pour previousBlocTextuel
	const previousBlocTextuel = $derived(
		articleInfo.articlePreviousVersion?.bloc_textuel
			? articleInfo.articlePreviousVersion?.bloc_textuel.replace(
					/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
					(_match, p1, p2) => {
						const lawArticle = p1.replace(".md", "")
						return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] hover:text-le-gris-dispositif-dark hover:!decoration-le-gris-dispositif-dark" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
					},
				)
			: undefined,
	)

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
						/[.,\-'’°]/g,
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

		const sentenceDiff = new SentenceDiff()

		const sentenceChanges: Change[] = sentenceDiff.diff(
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
		> = new SvelteMap()

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
		> = new SvelteMap()

		const dateForParameterValuesSearch = generateMiddleDate(
			articleInfo.article?.date_debut ?? new Date().toISOString().split("T")[0],
			articleInfo.article?.date_fin ?? new Date().toISOString().split("T")[0],
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

	const ongletsArticle = [
		{ id: "content", label: "Texte" },
		{ id: "history", label: "Sources" },
		{ id: "citations", label: "Citations" },
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

	const allVersions = $derived(
		articleInfo.versions !== undefined && articleInfo.versions.length > 1
			? new Set(articleInfo.versions.map((article) => article.legi_id_lien))
			: new Set(articleInfo.article?.legi_id),
	)

	const articleParameterReferences = Array.from(
		new Set(
			Array.from(parameterReferences.entries())
				.filter(([key]) => allVersions.has(key))
				.flatMap(([, values]) => values),
		),
	)

	const historyByText = $derived(
		articleInfo.historyLinks
			? historyDataToHistoryByText(articleInfo.historyLinks)
			: undefined,
	)

	function getVersionLabel(
		version: VersionArticle | Legiarti | undefined | null,
		options: { dateNumerique?: boolean } = {},
	): string {
		const { dateNumerique = false } = options

		if (!version) return ""

		const id =
			"legi_id_lien" in version
				? version.legi_id_lien
				: version.id === undefined
					? ""
					: (version as Legiarti).legi_id
		const debut =
			"debut" in version ? version.debut : (version as Legiarti).date_debut
		const fin = "fin" in version ? version.fin : (version as Legiarti).date_fin

		if (!debut || !id) return ""
		const format = dateNumerique ? formatDateFrNumerique : formatDateFr

		if (id.startsWith("JORF")) {
			return (
				(dateNumerique ? "J0 du " : "Journal officiel du ") +
				format(articleInfo.jorfTextDatePubli!)
			)
		}
		if (debut === "2999-01-01") return "Version de versement"
		if (fin === "2999-01-01") {
			if (debut === "2222-02-22")
				return "Version en vigueur différée ou article mort-né"
			return "Version en vigueur depuis le " + format(debut)
		}
		return "Version du " + format(debut) + " au " + format(fin)
	}
</script>

{#if articleInfo.article}
	<!--Message si affichage de l'article après clic sur section ou sur texte -->
	{@const articleFromUrl = page.url.searchParams.get("article") ?? ""}
	<div class="px-4 lg:px-0">
		{#if articleFromUrl.startsWith("LEGITEXT") || articleFromUrl.startsWith("JORFTEXT") || articleFromUrl.startsWith("LEGISCTA") || articleFromUrl.startsWith("JORFSCTA")}
			{@const sectionOrTextTitle =
				articleFromUrl.startsWith("LEGITEXT") ||
				articleFromUrl.startsWith("JORFTEXT")
					? articleInfo.textTitle
					: articleInfo.sectionTitle}
			<InformationMessage
				>Vous êtes sur le premier article de {#if articleFromUrl.startsWith("LEGISCTA") || articleFromUrl.startsWith("JORFSCTA")}
					la section
				{/if}
				{#if sectionOrTextTitle}
					«&nbsp;{sectionOrTextTitle}&nbsp;».
				{:else}.{/if}</InformationMessage
			>
		{/if}
	</div>
	<!--En-tête-->

	<header
		class="my-5 flex flex-col justify-between gap-x-5 px-4 md:flex-row md:items-center lg:px-0"
	>
		<!--Titre-->
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
			{#each ongletsArticle as tab (tab.id)}
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
				class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-blue-900/10 to-transparent"
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
								goto(
									resolve(
										`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname & {},
									),
									{ replaceState: false },
								)
							}}
							bind:value={selectedVersion}
						>
							{#each articleInfo.versions as version (version.legi_id_lien)}
								<option
									value={version}
									selected={articleInfo.article.legi_id ===
										version.legi_id_lien}
								>
									{getVersionLabel(version)}
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
								goto(
									resolve(
										`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname & {},
									),
									{ replaceState: false },
								)
							}}
							bind:value={selectedVersion}
						>
							{#each articleInfo.versions as version (version.legi_id_lien)}
								<option
									value={version}
									selected={articleInfo.article.legi_id ===
										version.legi_id_lien}
								>
									{getVersionLabel(version, { dateNumerique: true })}
								</option>
							{/each}
						</select>
					</div>
				{/if}
				{#if historyByText && historyByText.length > 0}
					<ArticlesModificateurs {historyByText}></ArticlesModificateurs>
				{/if}
				<!--Sommaire-->

				<div class="flex flex-col items-center justify-center justify-self-end">
					{#if articleInfo.sectionTitle}
						<p class="mx-4 text-center text-xs text-neutral-500">
							Section de l'article :
						</p>
						<p
							class="mx-4 border-b pb-1 text-center font-serif text-neutral-600 @md/section-article:mx-10"
						>
							<span class=" italic">
								{articleInfo.sectionTitle?.replaceAll("\\n", " ") ??
									articleInfo.textTitle?.replaceAll("\\n", " ")}
							</span>
						</p>
					{/if}
					<button
						class="lx-link-uppercase mt-2 font-sans text-sm text-nowrap text-gray-500"
						onclick={() => {
							const url = new URL(page.url)
							if (url.searchParams.has("summary")) {
								url.searchParams.delete("summary")
							} else {
								url.searchParams.set("summary", "true")
								url.searchParams.delete("citant")
								shared.activePanelMobile = "summary"
								shared.showSummaryDesktop = true
								shared.showCitingDesktop = false
								if (!shared.showLawDesktop) shared.showLawDesktop = true
							}

							goto(resolve(`${url.pathname}${url.search}` as Pathname & {}), {
								replaceState: false,
								noScroll: true,
							})
						}}
					>
						<iconify-icon
							class="align-[-0.3rem] text-xl"
							icon={page.url.searchParams.has("summary")
								? "ri:menu-fold-3-line"
								: "ri:menu-unfold-3-line"}
						>
						</iconify-icon>
						{#if !page.url.searchParams.has("summary")}
							sommaire {#if !articleInfo.sectionTitle}
								du texte{/if}
						{:else}Fermer le sommaire
						{/if}
					</button>
				</div>
			</section>

			<!--Texte de la version-->
			<section>
				<h2 class="sr-only">Texte de l’article</h2>
				{#if articleInfo.versions && articleInfo.versions.length > 1}
					<div class="my-4 flex w-full justify-end text-left">
						<label class="inline-flex cursor-pointer items-center">
							<input
								class="peer sr-only"
								type="checkbox"
								bind:checked={showDiff}
							/>

							<div
								class="peer peer-checked:bg-le-gris-dispositif-dark relative h-6 w-11 shrink-0 rounded-full bg-gray-400 peer-focus:ring-0 peer-focus:outline-none after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
							></div>
							<span class="ms-3 text-xs font-medium text-gray-900 sm:text-sm">
								Voir les changements apportés <br /> à la version précédente
							</span>
						</label>
					</div>
				{/if}

				{#if showDiff === true}
					{#if showDiff === true && currentBlocTextuel && previousBlocTextuel}
						<div
							class="rounded-t-md bg-[#C9D7ED] px-5 py-2 text-left text-sm text-neutral-700"
						>
							Changements apportés par <Popover
								widthClass="max-w-[80vw]"
								side="top"
							>
								<span
									class="cursor-pointer font-normal underline decoration-dotted hover:text-black"
									>cette version</span
								>
								{#snippet content()}
									<div class="text-start text-sm font-normal">
										{getVersionLabel(articleInfo.article)}
									</div>
								{/snippet}
							</Popover>
							sur la
							<span class="font-serif text-neutral-700 lowercase italic"
								>{getVersionLabel(articleInfo.articlePreviousVersion)}.</span
							>
						</div>
					{/if}

					<div
						class="rounded-b-md bg-blue-100 px-5 py-4 font-serif text-lg leading-8 md:text-left"
					>
						<!--
							Le warning eslint porte sur le risque de XSS.
							Ici, on maîtrise ce qui arrive dans dffiContent
							-->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html diffContent}
					</div>
				{:else if showDiff === false && currentBlocTextuel !== undefined && currentBlocTextuel !== null}
					<div class="font-serif text-lg leading-8 md:text-left">
						<!--
							Le warning eslint porte sur le risque de XSS.
							Ici, on maîtrise ce qui arrive dans dffiContent
							-->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html highlightParameterValuesInArticleHTML(
							articleParameterReferences,
						)}
					</div>
				{/if}
			</section>
		{:else if activeTab === "history"}
			<ArticleHistory {articleInfo}></ArticleHistory>
		{:else if activeTab === "citations"}
			<ArticleCitations {articleInfo}></ArticleCitations>
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
					{#each variables as variable, indexVariable (indexVariable)}
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
					{#each variables as variable, indexVariable (indexVariable)}
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
					Cette valeur semble correspondre à {parameterCount} paramètres dans le simulateur
					LexImpact.
					<strong>Choisissez celui que vous souhaitez examiner :</strong>
				</p>

				<ul class="mt-4 ml-4 list-disc">
					{#each Object.keys(parametersToVariables) as parameter, indexParameter (indexParameter)}
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
								{#each Object.entries(parametersToVariables) as [parameter, variables], index (index)}
									{#each variables as variable, indexVariable (indexVariable)}
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
						{#each variables as variable, indexVariable (indexVariable)}
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
						{#each variables as variable, index (index)}
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
