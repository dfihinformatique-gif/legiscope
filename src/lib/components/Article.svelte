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
	} from "@tricoteuses/tisseuse"
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

	let selectedParameter = $state<string | null>(null)

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

	onMount(() => {
		document
			.querySelectorAll<HTMLSpanElement>("button.highlighted")
			.forEach((button) => {
				button.style.setProperty("background-color", "#ccd3e7", "important")

				button.addEventListener("click", (e: Event) => {
					parametersToVariables = button.dataset.params
						? decodeParametersToVariables(button.dataset.params)
						: {}
					showParameterModal = true
				})
			})
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

			result = `${before}${coords.outerPrefix ?? ""}<button class="highlighted !bg-le-gris-dispositif-light [&_*]:!bg-transparent" data-params="${encodeParametersToVariables(parametersToVariables)}">${coords.innerPrefix ?? ""}${target}${coords.innerSuffix ?? ""}</button>${coords.outerSuffix ?? ""}${after}`
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
		const articleText = articleInfo.article?.bloc_textuel ?? ""

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
			class="mt-2 mb-5 flex flex-col items-start justify-between gap-x-5 md:flex-row"
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
		<div class="mb-8 flex w-full flex-wrap justify-end gap-x-5 gap-y-2">
			{#if articleInfo.versions}
				<select
					name="versions"
					class="text-le-gris-dispositif-dark grow rounded-sm bg-white p-0.5 px-2 text-left font-serif text-base italic"
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
		<div
			class:mb-10={historyIsOpen}
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
				Historique de l'article
			</button>

			{#if historyIsOpen}
				<ArticleHistory {articleInfo}></ArticleHistory>
			{/if}
		</div>

		<!--Article-->
		{#if articleInfo.article.bloc_textuel !== undefined && articleInfo.article.bloc_textuel !== null}
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

<ParameterLinkModal bind:showParameterModal bind:parametersToVariables>
	{#if parametersToVariables !== null}
		{@const parameterCount = Object.keys(parametersToVariables).length}

		{#if parameterCount === 0}
			<p>Aucun paramètre associé.</p>
		{:else if selectedParameter === null}
			<!-- ÉTAPE 1 : liste des paramètres -->
			{#if parameterCount > 1}
				<p>
					Cette valeur correspond à {parameterCount} paramètres dans le simulateur
					LexImpact : choisissez celui que vous souhaitez examiner.
				</p>
			{:else}
				<p>
					Cette valeur correspond à 1 paramètre dans le simulateur LexImpact :
				</p>
			{/if}

			{#each Object.entries(parametersToVariables) as [parameter, variables]}
				{@const parameterLabel =
					getParameter(rootParameter, parameter)?.short_label ?? parameter}
				<div class="mb-3">
					<button
						class="w-full rounded-md text-left hover:underline focus:ring focus:outline-none"
						onclick={() => (selectedParameter = parameter)}
						aria-label={`Voir dispositifs pour ${parameterLabel}`}
					>
						<strong>{parameterLabel}</strong>
						<span class="ml-2 text-sm text-gray-600"
							>({variables.length} dispositif{variables.length > 1
								? "s"
								: ""})</span
						>
					</button>
				</div>
			{/each}

			<!-- optionnel : liens directs -->
			<div class="mt-4">
				<p class="text-sm text-gray-700">
					Ou ouvrir directement les simulateurs associés :
				</p>
				<div class="mt-2 space-y-2">
					{#each Object.entries(parametersToVariables) as [parameter, variables]}
						{#each variables as variable}
							{@const variableLabel =
								variablesSummaries[variable]?.label ?? variable}
							{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(parameter)}`}
							<a
								href={linkHref}
								target="_blank"
								rel="noopener"
								class="lx-link-text text-le-jaune-very-dark block underline"
							>
								{variableLabel} — {getParameter(rootParameter, parameter)
									?.short_label ?? parameter}
							</a>
						{/each}
					{/each}
				</div>
			</div>
		{:else}
			<!-- ÉTAPE 2 : détail du param sélectionné -->
			{@const variables = parametersToVariables[selectedParameter] ?? []}
			{@const parameterLabel =
				getParameter(rootParameter, selectedParameter)?.short_label ??
				selectedParameter}
			{@const variableCount = variables.length}

			<button
				class="lx-link-uppercase"
				onclick={() => (selectedParameter = null)}
				aria-label="Retour à la liste des paramètres"
			>
				<iconify-icon
					class="mr-1 align-[-0.3rem] text-xl"
					icon="ri-arrow-left-line"
				></iconify-icon> Retour
			</button>

			<h3 class="mb-2 text-lg font-semibold">Paramètre : {parameterLabel}</h3>

			{#if variableCount > 1}
				<p>
					Ce paramètre est utilisé dans plusieurs dispositifs. Choisissez un
					dispositif pour amender et évaluer :
				</p>

				<ul class="mt-4 list-inside list-disc">
					{#each variables as variable}
						{@const variableLabel =
							variablesSummaries[variable]?.label ?? variable}
						{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(selectedParameter)}`}
						<li class="mb-4">
							<div class="flex items-start justify-between">
								<div>
									<div class="font-medium">{variableLabel}</div>
									<div class="text-sm break-words text-gray-600">
										{variable}
									</div>
								</div>

								<div class="ml-4 shrink-0">
									<a
										href={linkHref}
										target="_blank"
										rel="noopener"
										class="lx-link-text text-le-jaune-very-dark inline-flex items-center"
										aria-label={`Amender et évaluer ${variableLabel}`}
									>
										Amender et évaluer
										<iconify-icon
											class="ml-2 text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{:else if variableCount === 1}
				<p>Ce paramètre est utilisé dans le dispositif suivant :</p>
				<div class="mt-4">
					{#each variables as variable}
						{@const variableLabel =
							variablesSummaries[variable]?.label ?? variable}
						{@const linkHref = `https://socio-fiscal.leximpact.an.fr?law=true&parameters=${encodeURIComponent(variable)}#${encodeURIComponent(selectedParameter)}`}
						<div class="mb-2">
							<span class="font-medium">{variableLabel}</span>
							<span class="mx-2">|</span>
							<a
								href={linkHref}
								target="_blank"
								rel="noopener"
								class="lx-link-text text-le-jaune-very-dark"
							>
								Amender et évaluer avec LexImpact
								<iconify-icon
									class="mr-1 align-[-0.3rem] text-xl"
									icon="ri-arrow-right-line"
								></iconify-icon>
							</a>
						</div>
					{/each}
				</div>
			{:else}
				<p>Aucun dispositif trouvé pour ce paramètre.</p>
			{/if}
		{/if}
	{/if}
</ParameterLinkModal>
