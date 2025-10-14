<script lang="ts">
	import { goto } from "$app/navigation"
	import { page } from "$app/state"
	import type { ArticleInfo, VersionArticle } from "$lib/db_data_types"
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
	import { shared } from "$lib/shared.svelte"
	import type { ScaleParameter, ValueParameter } from "@openfisca/json-model"
	import {
		originalMergedPositionsFromTransformed,
		simplifyHtml,
		type SourceMapSegment,
		type TextPosition,
		type Transformation,
		type TransformationLeaf,
		type TransformationNode,
	} from "@tricoteuses/tisseuse"
	import { diffArrays, type ChangeObject } from "diff"
	import { onMount } from "svelte"
	import ArticleHistory from "./ArticleHistory.svelte"
	import ArticleSummary from "./ArticleSummary.svelte"
	import ParameterLinkModal from "./ParameterLinkModal.svelte"

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
		parametersToVariables,
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

	function* iterTransformationLeafs(
		transformation: Transformation,
	): Generator<TransformationLeaf, void> {
		if ((transformation as TransformationNode).transformations === undefined) {
			yield transformation as TransformationLeaf
		} else {
			for (const subTransformation of (transformation as TransformationNode)
				.transformations) {
				yield* iterTransformationLeafs(subTransformation)
			}
		}
	}

	/**
	 * Représente le mapping entre une position transformée et ses positions originales correspondantes.
	 */
	export interface PositionMapping {
		transformedPosition: TextPosition
		originalPositions: TextPosition[]
	}

	/**
	 * Note: Les positions originales sont divisées lorsqu'elles chevauchent plusieurs segments.
	 * Le résultat associe chaque position transformée à ses positions originales correspondantes.
	 */
	export function originalSplitPositionsArrayFromTransformed(
		transformation: Transformation,
		positions: TextPosition[],
	): PositionMapping[] {
		// Initialiser les mappings avec les positions d'entrée
		let mappings: PositionMapping[] = positions.map((pos) => ({
			transformedPosition: pos,
			originalPositions: [pos],
		}))

		// Appliquer les transformations en ordre inverse
		for (const { sourceMap } of [
			...iterTransformationLeafs(transformation),
		].reverse()) {
			mappings = mappings.map((mapping) => ({
				transformedPosition: mapping.transformedPosition,
				originalPositions:
					originalSplitPositionsArrayFromTransformedUsingSourceMap(
						sourceMap,
						mapping.originalPositions,
					),
			}))
		}

		return mappings
	}

	/**
	 * Note: Les positions originales sont divisées lorsqu'elles chevauchent plusieurs segments.
	 * Donc, il peut y avoir plus de positions originales que de positions transformées.
	 */
	function originalSplitPositionsArrayFromTransformedUsingSourceMap(
		sourceMap: SourceMapSegment[],
		transformedPositions: TextPosition[],
	): TextPosition[] {
		const originalPositions: TextPosition[] = []
		// Insert empty segment at start & end.
		sourceMap = [
			{ inputIndex: 0, inputLength: 0, outputIndex: 0, outputLength: 0 },
			...sourceMap,
			{
				inputIndex: Number.MAX_SAFE_INTEGER,
				inputLength: 0,
				outputIndex: Number.MAX_SAFE_INTEGER,
				outputLength: 0,
			},
		]
		let segmentIndex = 0
		let segment = sourceMap[segmentIndex]
		for (const transformedPosition of transformedPositions) {
			let { start: transformedStart } = transformedPosition
			const { stop: transformedStop } = transformedPosition

			transformPosition: for (
				let positionReverseTransformed = false;
				!positionReverseTransformed;

			) {
				for (
					;
					segment.outputIndex + segment.outputLength <= transformedStart;
					segmentIndex++, segment = sourceMap[segmentIndex]
				);
				let firstIncludedSegmentIndex = segmentIndex
				const segmentBefore = sourceMap[firstIncludedSegmentIndex - 1]
				let originalStart =
					segmentBefore.inputIndex +
					segmentBefore.inputLength +
					transformedStart -
					(segmentBefore.outputIndex + segmentBefore.outputLength)

				let lastIncludedSegmentIndex: number
				for (
					lastIncludedSegmentIndex = firstIncludedSegmentIndex - 1;
					sourceMap[lastIncludedSegmentIndex + 1].outputIndex < transformedStop;
					lastIncludedSegmentIndex++
				);
				const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
				let originalStop =
					lastIncludedSegment.inputIndex +
					lastIncludedSegment.inputLength +
					transformedStop -
					(lastIncludedSegment.outputIndex + lastIncludedSegment.outputLength)

				for (
					let includedSegmentIndex = firstIncludedSegmentIndex;
					includedSegmentIndex <= lastIncludedSegmentIndex;
					includedSegmentIndex++
				) {
					const includedSegment = sourceMap[includedSegmentIndex]
					const matchingSegmentIndex = includedSegment.matchingSegmentIndex
					if (matchingSegmentIndex !== undefined) {
						// Note: Add 1 to matchingSegmentIndex, because of empty segment
						// inserted at start of source map.
						if (matchingSegmentIndex + 1 < firstIncludedSegmentIndex) {
							const matchingSegment = sourceMap[matchingSegmentIndex + 1]
							if (matchingSegment.outputIndex < transformedStart) {
								// Split transformed position.
								if (includedSegment.inputIndex > originalStart) {
									originalPositions.push({
										start: originalStart,
										stop: includedSegment.inputIndex,
									})
								}
								transformedStart =
									includedSegment.outputIndex + includedSegment.outputLength
								// Ignore following segments whose output are empty.
								for (
									let nextSegmentIndex = includedSegmentIndex,
										nextSegment = includedSegment;
									nextSegment.outputIndex + nextSegment.outputLength ===
									transformedStart;
									nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
								) {
									segmentIndex = nextSegmentIndex
								}
								// Handle remaining split position.
								continue transformPosition
							}
							firstIncludedSegmentIndex = matchingSegmentIndex + 1
							originalStart = matchingSegment.inputIndex
						} else if (matchingSegmentIndex + 1 > lastIncludedSegmentIndex) {
							const matchingSegment = sourceMap[matchingSegmentIndex + 1]
							if (
								matchingSegment.outputIndex + matchingSegment.outputLength >
								transformedStop
							) {
								// Split transformed position.
								if (includedSegment.inputIndex > originalStart) {
									originalPositions.push({
										start: originalStart,
										stop: includedSegment.inputIndex,
									})
								}
								transformedStart =
									includedSegment.outputIndex + includedSegment.outputLength
								// Ignore following segments whose output are empty.
								for (
									let nextSegmentIndex = includedSegmentIndex,
										nextSegment = includedSegment;
									nextSegment.outputIndex + nextSegment.outputLength ===
									transformedStart;
									nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
								) {
									segmentIndex = nextSegmentIndex
								}
								// Handle remaining split position.
								continue transformPosition
							}
							lastIncludedSegmentIndex = matchingSegmentIndex + 1
							originalStop =
								matchingSegment.inputIndex + matchingSegment.inputLength
						}
					}
				}
				originalPositions.push({
					start: originalStart,
					stop: originalStop,
				})
				positionReverseTransformed = true
			}
		}
		return originalPositions
	}

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
		const { countThreshold = 7 } = options

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
	// Il faut impérativement que la chaine générée pour currentBlockTextuelle soit *exactement* la même que pour previousBlocTextuel
	const currentBlocTextuel = articleInfo.article?.bloc_textuel
		? articleInfo.article.bloc_textuel.replace(
				/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/git\.tricoteuses\.fr[^"]*\/([^/]+\.md)"[^>]*>(.*?)<\/a>/g,
				(_match, p1, p2) => {
					const lawArticle = p1.replace(".md", "")
					return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem]" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
				},
			)
		: undefined
	// !!! ATTENTION !!!
	// Il faut impérativement que la chaine générée pour currentBlockTextuelle soit *exactement* la même que pour previousBlocTextuel
	const previousBlocTextuel = articleInfo.articlePreviousVersion?.bloc_textuel
		? articleInfo.articlePreviousVersion?.bloc_textuel.replace(
				/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/git\.tricoteuses\.fr[^"]*\/([^/]+\.md)"[^>]*>(.*?)<\/a>/g,
				(_match, p1, p2) => {
					const lawArticle = p1.replace(".md", "")
					return `<a class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem]" href='/pjl/${page.params.pjl}?article=${lawArticle}'>${p2}</a>`
				},
			)
		: undefined

	let showDiff = $state(false)
	const diffContent = $derived.by(() => {
		if (showDiff === true && currentBlocTextuel && previousBlocTextuel) {
			const simplifiedArticleText = simplifyHtml({ removeAWithHref: true })(
				currentBlocTextuel,
			)
			const simplifiedPreviousVersionText = simplifyHtml({
				removeAWithHref: true,
			})(previousBlocTextuel)

			const previousSegments = segmenter.segmentToArray(
				simplifiedPreviousVersionText.output,
			)

			const currentSegments = segmenter.segmentToArray(
				simplifiedArticleText.output,
			)
			// const diff = diffWords(
			// 	simplifiedPreviousVersionText.output,
			// 	simplifiedArticleText.output,
			// )
			const diff = mergeSmallChanges(
				diffArrays(previousSegments, currentSegments),
			)

			function extractHtmlBetweenOriginalPositions(
				html: string,
				positions: TextPosition[],
			): string {
				if (positions.length === 0) return ""

				const startPos = positions[0].start
				const endPos = positions[positions.length - 1].stop

				return html.slice(startPos, endPos)
			}

			let partialDiffContent = ""
			let offsetInPrevious = 0
			let offsetInCurrent = 0
			let lastPreviousPos = 0 // Pour suivre où on en est dans le HTML précédent
			let lastCurrentPos = 0 // Pour suivre où on en est dans le HTML actuel

			for (const part of diff) {
				if (part.removed) {
					const string = part.value.join("")

					const originalPositionsArray =
						originalSplitPositionsArrayFromTransformed(
							simplifiedPreviousVersionText,
							[
								{
									start: offsetInPrevious,
									stop: offsetInPrevious + string.length,
								},
							],
						)

					const positions = originalPositionsArray[0].originalPositions
					const htmlContent = extractHtmlBetweenOriginalPositions(
						previousBlocTextuel,
						positions,
					)

					partialDiffContent += `<span class="rounded-md px-0.5 bg-red-50 text-red-900 line-through-diff">${htmlContent}</span>`

					if (positions.length > 0) {
						lastPreviousPos = positions[positions.length - 1].stop
					}
					offsetInPrevious += string.length
				} else if (part.added) {
					const string = part.value.join("")

					const originalPositionsArray =
						originalSplitPositionsArrayFromTransformed(simplifiedArticleText, [
							{
								start: offsetInCurrent,
								stop: offsetInCurrent + string.length,
							},
						])

					const positions = originalPositionsArray[0].originalPositions
					const htmlContent = extractHtmlBetweenOriginalPositions(
						currentBlocTextuel,
						positions,
					)

					partialDiffContent += `<span class="rounded-md px-0.5 bg-green-50 text-green-900">${htmlContent}</span>`

					if (positions.length > 0) {
						lastCurrentPos = positions[positions.length - 1].stop
					}
					offsetInCurrent += string.length
				} else {
					// Partie inchangée : prendre le HTML actuel
					const string = part.value.join("")

					const originalPositionsArray =
						originalSplitPositionsArrayFromTransformed(simplifiedArticleText, [
							{
								start: offsetInCurrent,
								stop: offsetInCurrent + string.length,
							},
						])

					const positions = originalPositionsArray[0].originalPositions
					const htmlContent = extractHtmlBetweenOriginalPositions(
						currentBlocTextuel,
						positions,
					)

					partialDiffContent += htmlContent

					if (positions.length > 0) {
						lastCurrentPos = positions[positions.length - 1].stop
					}

					const originalPositionsArrayPrev =
						originalSplitPositionsArrayFromTransformed(
							simplifiedPreviousVersionText,
							[
								{
									start: offsetInPrevious,
									stop: offsetInPrevious + string.length,
								},
							],
						)
					const positionsPrev = originalPositionsArrayPrev[0].originalPositions
					if (positionsPrev.length > 0) {
						lastPreviousPos = positionsPrev[positionsPrev.length - 1].stop
					}

					offsetInPrevious += string.length
					offsetInCurrent += string.length
				}
			}

			return partialDiffContent
		}
		return `<div class="font-sans text-sm text-le-gris-dispositif-dark py-4 text-center ">Il n'y a pas de version précédente à comparer</div>`
	})

	onMount(() => {
		addEventListenersOnHighlighted()
	})

	function formatDateFr(dateStr: string): string {
		const date = new Date(dateStr)
		return date
			.toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
			.replace(/^1 /, "1er ")
	}
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
		const coordsInOriginal = originalMergedPositionsFromTransformed(
			simplified,
			sortedSimplifiedCoord,
		)
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
	let historyIsOpen = $state(false)

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
</script>

<div
	class="mb-20 h-fit w-full max-w-6xl bg-blue-50 p-6 pt-2 text-justify shadow-md md:mx-6"
	class:md:p-16={!shared.showBillDesktop}
>
	{#if articleInfo.article}
		<!--Sommaire-->
		<ArticleSummary {articleInfo} date={dateForSelect}></ArticleSummary>

		<!--En-tête-->
		<div
			class="mt-2 flex flex-col items-start justify-between gap-x-5 md:flex-row"
		>
			<!--Titre-->
			<div
				class="text-le-gris-dispositif-dark flex-wrap text-left font-sans text-2xl"
			>
				<iconify-icon
					class="align-[-0.2rem] text-2xl"
					icon="ri:book-marked-fill"
				>
				</iconify-icon>
				{#if articleInfo.article.num !== undefined}
					<span class="text-nowrap">Article {articleInfo.article.num}</span>
				{/if} ·
				<span class="">{articleInfo.textTitle?.replaceAll("\\n", " ")}</span>
			</div>
			<div class="flex w-full justify-end md:mt-1 md:w-min">
				<a
					class="lx-link-simple text-right text-nowrap text-gray-500"
					href="https://www.legifrance.gouv.fr/loda/id/{articleInfo.article
						.legi_id}"
					target="_blank"
					>Légifrance<iconify-icon
						class="ml-0.5 align-[-0.15rem] text-sm"
						icon="ri:external-link-line"
					></iconify-icon></a
				>
			</div>
		</div>

		<div
			class="mb-2"
			class:border-b={historyIsOpen}
			class:shadow-bottom-extralight={historyIsOpen}
			class:border-gray-200={historyIsOpen}
		>
			<button
				class="text-le-gris-dispositif-dark lx-link-text my-2 cursor-pointer text-left font-sans xl:mt-5 xl:text-lg"
				onclick={() => {
					historyIsOpen = !historyIsOpen
				}}
			>
				<iconify-icon
					class="align-[-0.3rem] text-xl"
					icon={historyIsOpen
						? "ri:arrow-down-s-line"
						: "ri:arrow-right-s-line"}
				>
				</iconify-icon>
				Historique
			</button>

			{#if historyIsOpen}
				<div class=" bg-white p-4">
					<ArticleHistory {articleInfo}></ArticleHistory>
				</div>
			{/if}
		</div>
		<div class="mb-4 flex w-full flex-wrap justify-end gap-x-5 gap-y-3">
			{#if articleInfo.versions}
				<select
					name="versions"
					class="text-le-gris-dispositif-dark grow truncate overflow-x-hidden rounded-sm bg-white p-0.5 px-2 text-left font-serif text-sm italic sm:text-base"
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
							selected={articleInfo.article.legi_id === version.legi_id_lien}
						>
							{#if version.debut}
								{#if version.legi_id_lien.startsWith("JORF")}(JORF {formatDateFr(
										articleInfo.jorfTextDatePubli!,
									)})
								{:else if version.debut === "2999-01-01"}
									Version de versement
								{:else if version.fin === "2999-01-01"}
									Version en vigueur depuis le {formatDateFr(version.debut)}
								{:else}
									Version du {formatDateFr(version.debut)}
									au {formatDateFr(version.fin)}
								{/if}
							{/if}
						</option>
					{/each}
				</select>
				<div class="text-left">
					<label class="inline-flex cursor-pointer items-center">
						<input
							class="peer sr-only"
							type="checkbox"
							bind:checked={showDiff}
						/>
						<div
							class="peer peer-checked:bg-le-gris-dispositif-dark relative h-6 w-11 shrink-0 rounded-full bg-gray-400 peer-focus:ring-0 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
						></div>
						<span class="ms-3 text-xs font-medium text-gray-900 sm:text-sm">
							Voir les changements apportés <br /> à la version précédente
						</span>
					</label>
				</div>
			{/if}
			<!-- <div class="flex flex-wrap gap-x-3 gap-y-1">
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Discussions parlementaires</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Liens relatifs</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Jurisprudence</a
				>
			</div> -->
		</div>

		<!--Article-->
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
</div>

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
