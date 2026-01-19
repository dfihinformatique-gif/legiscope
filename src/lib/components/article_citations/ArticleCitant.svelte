<script lang="ts">
	import { goto } from "$app/navigation"
	import { page } from "$app/state"
	import type { ArticleInfo, VersionArticle } from "$lib/db_data_types"
	import { formatDateFr, shared } from "$lib/shared.svelte"
	import {
		assertNever,
		reversePositionsSplitFromPositions,
		simplifyHtml,
		type FragmentPosition,
	} from "@tricoteuses/tisseuse"
	import { diffArrays, diffSentences, type ChangeObject } from "diff"
	import { onMount } from "svelte"
	import ArticleSummary from "./../ArticleSummary.svelte"

	interface Props {
		citingArticleInfo: ArticleInfo
		versionsArticle: VersionArticle[] | undefined
		parametersToVariables: Record<string, string[]> | null
	}
	let { citingArticleInfo, versionsArticle, parametersToVariables }: Props =
		$props()

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
		citingArticleInfo && citingArticleInfo?.article?.bloc_textuel
			? citingArticleInfo.article.bloc_textuel.replace(
					/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
					(_match, p1, p2) => {
						const lawArticle = p1.replace(".md", "")
						if (
							versionsArticle &&
							versionsArticle.some(
								(version) => version.legi_id_lien === lawArticle,
							)
						) {
							return `<a id="lien_citation" class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] bg-le-jaune">${p2}</a>`
						} else {
							return p2
						}
					},
				)
			: undefined,
	)
	// !!! ATTENTION !!!
	// Il faut impérativement que la chaine générée pour currentBlockTextuel soit *exactement* la même que pour previousBlocTextuel
	const previousBlocTextuel = $derived(
		citingArticleInfo && citingArticleInfo?.articlePreviousVersion?.bloc_textuel
			? citingArticleInfo.articlePreviousVersion?.bloc_textuel.replace(
					/<a\s+class="lien_(?:article|division|texte)_externe"\s+href="https:\/\/(?:git\.)?tricoteuses\.fr[^"]*\/([^/]+(?:\.md)?)"[^>]*>(.*?)<\/a>/g,
					(_match, p1, p2) => {
						const lawArticle = p1.replace(".md", "")
						if (
							versionsArticle &&
							versionsArticle.some(
								(version) => version.legi_id_lien === lawArticle,
							)
						) {
							return `<a id="lien_citation" class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] bg-le-jaune lien_citation">${p2}</a>`
						} else {
							return p2
						}
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

	const scrollToCitationLink = () => {
		const element = document.getElementById("lien_citation")
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" })
		}
	}

	let selectedVersion: VersionArticle | undefined = $state(undefined)

	const dateForSelect = page.url.searchParams.get("date") ?? shared.pjlDate

	onMount(() => {
		scrollToCitationLink()
	})
</script>

<div
	class="relative mb-20 h-fit w-full max-w-6xl min-w-0 bg-blue-50 p-6 pt-2 pb-20 text-justify md:mx-6"
	class:md:p-16={!shared.showBillDesktop}
>
	<button
		class="bg-le-gris-dispositif peer hover:bg-le-gris-dispositif-dark fixed top-2 right-6 z-50 flex cursor-pointer items-center justify-center rounded-full p-3 text-white"
		title="Fermer le volet citations"
		onclick={() => {
			const searchParams = new URLSearchParams(page.url.searchParams)
			searchParams.delete("citant")
			shared.activePanelMobile = "law"
			goto(`${page.url.pathname}?${searchParams.toString()}`, {
				replaceState: true,
				noScroll: true,
			})
		}}
	>
		<iconify-icon class="align-[-0.4rem] text-3xl" icon="ri-close-large-line"
		></iconify-icon></button
	>
	<div
		class="pointer-events-none absolute inset-0 z-40
         bg-gradient-to-r from-transparent to-transparent
         transition
         peer-hover:from-transparent
         peer-hover:to-blue-100"
	></div>
	{#if citingArticleInfo && citingArticleInfo.article}
		<!--Sommaire-->
		<ArticleSummary
			articleInfo={citingArticleInfo}
			date={dateForSelect}
			isSummaryOfCitingArticle={true}
		></ArticleSummary>

		<!--En-tête-->
		{@const articleFromUrl = page.url.searchParams.get("citant") ?? ""}
		{#if articleFromUrl.startsWith("LEGITEXT") || articleFromUrl.startsWith("JORFTEXT") || articleFromUrl.startsWith("LEGISCTA") || articleFromUrl.startsWith("JORFSCTA")}
			Premier article :
		{/if}
		<div class="mt-2 flex flex-col items-start justify-between gap-x-5">
			<!--Titre-->
			<div
				class="text-le-gris-dispositif-dark max-w-md flex-wrap text-left font-sans text-2xl"
			>
				<iconify-icon
					class="align-[-0.2rem] text-2xl"
					icon="ri:book-marked-fill"
				>
				</iconify-icon>
				{#if citingArticleInfo !== undefined && citingArticleInfo.article.num !== undefined}
					<span class="text-nowrap"
						>Article {citingArticleInfo.article.num}</span
					>
				{/if} ·
				<span class=""
					>{citingArticleInfo!.textTitle?.replaceAll("\\n", " ")}</span
				>
			</div>
			<a
				class="lx-link-simple ml-auto text-gray-500"
				href="https://www.legifrance.gouv.fr/loda/id/{citingArticleInfo.article
					.legi_id}"
				target="_blank"
				>Légifrance<iconify-icon
					class="ml-0.5 align-[-0.15rem] text-sm"
					icon="ri:external-link-line"
				></iconify-icon></a
			>
		</div>

		<div class="my-4 flex w-full flex-wrap justify-end gap-x-5 gap-y-3">
			{#if citingArticleInfo?.versions}
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
					{#each citingArticleInfo?.versions ?? [] as version (version.legi_id_lien)}
						<option
							disabled
							value={version}
							selected={citingArticleInfo.article.legi_id ===
								version.legi_id_lien}
						>
							{#if version.debut}
								{#if version.legi_id_lien.startsWith("JORF")}Journal officiel du {formatDateFr(
										citingArticleInfo.jorfTextDatePubli!,
									)}
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
						{#if citingArticleInfo?.versions && citingArticleInfo.versions.length > 1}
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
				>{@html currentBlocTextuel}</span
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
