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

	let parameterSimulatorlinksOpen = $state(false)
	let selectedParameter = $state<string | null>(null)
	let clickedParameterButtons = $state<HTMLButtonElement[]>([])

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
			.querySelectorAll<HTMLButtonElement>("button.highlighted")
			.forEach((button) => {
				button.addEventListener("click", (e: Event) => {
					button.classList.add("bg-le-vert-500/50")
					parametersToVariables = button.dataset.params
						? decodeParametersToVariables(button.dataset.params)
						: {}
					showParameterModal = true
					clickedParameterButtons.push(button)
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

			result = `${before}${coords.outerPrefix ?? ""}<button class="hover:bg-le-vert-500/50 highlighted cursor-pointer bg-le-gris-dispositif-light [&>*]:!bg-transparent" data-params="${encodeParametersToVariables(parametersToVariables)}">${coords.innerPrefix ?? ""}${target}${coords.innerSuffix ?? ""}</button>${coords.outerSuffix ?? ""}${after}`
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
