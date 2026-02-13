<script lang="ts">
	import { goto } from "$app/navigation"
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import {
		historyDataToHistoryByText,
		type ArticleInfo,
		type Legiarti,
		type VersionArticle,
	} from "$lib/db_data_types"
	import {
		formatDateFr,
		formatDateFrNumerique,
		shared,
	} from "$lib/shared.svelte"
	import {
		assertNever,
		reversePositionsSplitFromPositions,
		simplifyHtml,
		type FragmentPosition,
	} from "@tricoteuses/tisseuse"
	import { diffArrays, diffSentences, type ChangeObject } from "diff"
	import { onMount } from "svelte"
	import { SvelteURLSearchParams } from "svelte/reactivity"
	import ArticlesModificateurs from "../ArticlesModificateurs.svelte"
	import InformationMessage from "../ui_transverse_components/InformationMessage.svelte"
	import Popover from "../ui_transverse_components/Popover.svelte"

	interface Props {
		citingArticleInfo: ArticleInfo
		versionsArticle: VersionArticle[] | undefined
	}
	let { citingArticleInfo, versionsArticle }: Props = $props()

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
							return `<a id="lien_citation" class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] bg-[#e1b3b3]">${p2}</a>`
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
							return `<a id="lien_citation" class="text-black underline !decoration-solid !decoration-gray-400 !decoration-[0.2rem] bg-[#e1b3b3] lien_citation">${p2}</a>`
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

	const selectedVersion = $derived.by(() => {
		const article = citingArticleInfo?.article
		const versions = citingArticleInfo?.versions
		if (!article || !versions) return undefined

		return versions.find((version) => version.legi_id_lien === article.legi_id)
	})

	onMount(() => {
		scrollToCitationLink()
	})

	const historyByText = $derived(
		citingArticleInfo.historyLinks
			? historyDataToHistoryByText(citingArticleInfo.historyLinks)
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
				format(citingArticleInfo.jorfTextDatePubli!)
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

<button
	class="bg-le-gris-dispositif peer hover:bg-le-gris-dispositif-dark fixed top-8 right-6 z-50 flex cursor-pointer items-center justify-center rounded-b-full px-3 pt-8 pb-2 text-white hover:translate-y-4"
	title="Fermer les citations"
	onclick={() => {
		const searchParams = new SvelteURLSearchParams(page.url.searchParams)
		searchParams.delete("citant")
		shared.activePanelMobile = "law"
		goto(
			resolve(`${page.url.pathname}?${searchParams.toString()}` as Pathname),
			{
				replaceState: true,
				noScroll: true,
			},
		)
	}}
>
	<iconify-icon class="align-[-0.4rem] text-2xl" icon="ri-close-large-line"
	></iconify-icon></button
>
<div
	class="pointer-events-none absolute inset-0 z-40
         w-1/3 justify-self-end bg-linear-to-r
         from-transparent
         to-transparent
         transition peer-hover:from-transparent peer-hover:to-blue-100"
></div>

{#if citingArticleInfo && citingArticleInfo.article}
	<!--Message si affichage de l'article après clic sur section ou sur texte -->
	{@const articleFromUrl = page.url.searchParams.get("citant") ?? ""}
	<div class="px-4 lg:px-0">
		{#if articleFromUrl.startsWith("LEGITEXT") || articleFromUrl.startsWith("JORFTEXT") || articleFromUrl.startsWith("LEGISCTA") || articleFromUrl.startsWith("JORFSCTA")}
			{@const sectionOrTextTitle =
				articleFromUrl.startsWith("LEGITEXT") ||
				articleFromUrl.startsWith("JORFTEXT")
					? citingArticleInfo.textTitle
					: citingArticleInfo.sectionTitle}
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

	<header
		class="my-5 mr-10 flex flex-col justify-between gap-x-5 px-4 md:flex-row md:items-center lg:px-0"
	>
		<!--Titre-->
		<h1 class="flex-wrap text-left font-sans text-2xl text-neutral-900">
			<span class="font-light">Cité par :</span>
			<iconify-icon class="align-[-0.2rem] text-2xl" icon="ri:book-marked-fill">
			</iconify-icon>
			{#if citingArticleInfo !== undefined && citingArticleInfo.article.num !== undefined}
				<span class="text-nowrap">Article {citingArticleInfo.article.num}</span>
			{/if} ·
			<span class=""
				>{citingArticleInfo!.textTitle?.replaceAll("\\n", " ")}</span
			>
		</h1>
		<a
			class="lx-link-simple self-end text-sm text-nowrap text-gray-500 md:self-auto"
			href="https://www.legifrance.gouv.fr/loda/id/{citingArticleInfo.article
				.legi_id}"
			target="_blank"
			>Légifrance<iconify-icon
				class="ml-0.5 align-[-0.15rem] text-sm"
				icon="ri:external-link-line"
			></iconify-icon></a
		>
	</header>

	<div
		class="mb-20 h-fit w-full max-w-6xl min-w-0 bg-blue-50 p-4 pb-20 text-justify shadow-md"
		class:md:p-16={!shared.showBillDesktop}
		style="transform: translateZ(0); backface-visibility: hidden; will-change: transform;"
	>
		<section class="mb-8 flex flex-col gap-y-5">
			<h2 class="sr-only">Version de l'article</h2>
			<div class="flex flex-wrap justify-end gap-x-5 gap-y-3">
				{#if citingArticleInfo?.versions && selectedVersion}
					<p
						class="grow rounded-t-sm border-b-3 border-neutral-200 bg-white p-2 text-left font-serif text-black italic sm:text-base"
					>
						{getVersionLabel(selectedVersion)}
					</p>
				{/if}
			</div>

			{#if historyByText && historyByText.length > 0}
				<ArticlesModificateurs {historyByText}></ArticlesModificateurs>
			{/if}
		</section>
		<!--Texte de la version-->
		<section class="mt-8">
			<h2 class="sr-only">Texte de l’article</h2>
			{#if citingArticleInfo?.versions && citingArticleInfo.versions.length > 1}
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
									{getVersionLabel(citingArticleInfo.article)}
								</div>
							{/snippet}
						</Popover>
						sur la
						<span class="font-serif text-neutral-700 lowercase italic"
							>{getVersionLabel(
								citingArticleInfo.articlePreviousVersion,
							)}.</span
						>
					</div>
				{/if}
				<div
					class="rounded-b-md bg-blue-100 px-5 py-4 font-serif text-lg leading-8 md:text-left"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html diffContent}
				</div>
			{:else if showDiff === false && currentBlocTextuel !== undefined && currentBlocTextuel !== null}
				<div class="font-serif text-lg leading-8 md:text-left">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html currentBlocTextuel}
				</div>
			{/if}
		</section>
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
