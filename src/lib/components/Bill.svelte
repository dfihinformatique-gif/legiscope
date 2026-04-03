<script lang="ts">
	import { goto, pushState } from "$app/navigation"
	import { resolve } from "$app/paths"
	import type { Pathname } from "$app/types"

	import { createParameterButtonController } from "$lib/bill/parameter_buttons"
	import BillSummary from "$lib/components/BillSummary.svelte"
	import ParameterLinkModal from "$lib/components/ParameterLinkModal.svelte"
	import {
		buildPjlArticleBlocks,
		collectPjlBlock,
		createPjlPreviewController,
		trimBlockTextAtSectionBreak,
		type PjlPreviewController,
	} from "$lib/pjl/bill_preview"
	import { hasMeaningfulSelectionWithinRoot } from "$lib/pjl/bill_interactions"
	import {
		decodeParametersToVariables,
		getParameter,
		rootParameter,
		variablesSummaries,
	} from "$lib/openfisca_parameters"
	import { shared } from "$lib/shared.svelte"

	interface Props {
		pjlHTML: string | undefined
		showParameterModal: boolean
		parametersToVariables: Record<string, string[]> | null
	}

	let parameterSimulatorlinksOpen = $state(false)
	let selectedParameter = $state<string | null>(null)
	let clickedParameterButtons = $state<HTMLButtonElement[]>([])
	let activeParam: string | null = null
	let parameterButtonController:
		| ReturnType<typeof createParameterButtonController>
		| undefined
	let pjlPreviewController: PjlPreviewController | undefined

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

	let container: HTMLDivElement | undefined = $state()
	let {
		pjlHTML,
		showParameterModal,
		parametersToVariables = $bindable(),
	}: Props = $props()

	function resetPjlPreviewController(): void {
		pjlPreviewController?.cleanup()
		pjlPreviewController = undefined
	}

	function rebuildPjlProjectionState(shadowRoot: ShadowRoot): void {
		shared.pjlArticleBlocksByLawArticle = buildPjlArticleBlocks(shadowRoot)
		resetPjlPreviewController()
		pjlPreviewController = createPjlPreviewController(shadowRoot)
	}

	function buildParameterButtonController(
		shadowRoot: ShadowRoot,
	): ReturnType<typeof createParameterButtonController> {
		return createParameterButtonController(shadowRoot, {
			getShowParameterModal: () => showParameterModal,
			setShowParameterModal: (value) => {
				showParameterModal = value
			},
			getActiveParam: () => activeParam,
			setActiveParam: (value) => {
				activeParam = value
			},
			setClickedParameterButtons: (buttons) => {
				clickedParameterButtons = buttons
			},
			setParametersToVariables: (value) => {
				parametersToVariables = value
			},
			decodeParametersToVariables: (value) =>
				decodeParametersToVariables(value) ?? {},
			navigateToHref: (href) => {
				goto(resolve(href as Pathname))
			},
		})
	}

	$effect(() => {
		if (!container || !pjlHTML) {
			shared.pjlArticleBlocksByLawArticle = undefined
			resetPjlPreviewController()
			return
		}

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			shadow.innerHTML = pjlHTML
			rebuildPjlProjectionState(shadow)

			const initialHash = window.location.hash
			if (initialHash) {
				requestAnimationFrame(() =>
					requestAnimationFrame(() => scrollToAnchor(initialHash, shadow)),
				)
			}

			const handleClick = (e: Event) => {
				const mouseEvent = e as MouseEvent
				const target = mouseEvent.target as HTMLElement
				const previewActionButton = target.closest(
					"button.pjl-preview-popover-action",
				) as HTMLButtonElement | null
				const previewClickable = target.closest(
					".pjl-preview-clickable[data-preview-id]",
				) as HTMLElement | null
				if (hasMeaningfulSelectionWithinRoot(window.getSelection(), shadow)) {
					return
				}

				const link = target.closest('a[href^="#"]') as HTMLAnchorElement
				const lawLink = target.closest("a.law-article-link")
				const paragraph = target.closest("p, li, div")

				if (previewActionButton) {
					e.preventDefault()
					e.stopPropagation()
					const previewId = previewActionButton.dataset.previewId
					if (!previewId) return
					const request = pjlPreviewController?.previewRequests.get(previewId)
					if (!request) return
					shared.pjlPreviewRequest = {
						articleId: request.articleId,
						mode: request.mode,
						blockText: request.blockText,
						blockHtml: request.blockHtml,
						directiveId: request.directiveId,
					}
					const currentHash = window.location.hash
					const hrefToUse =
						request.href ??
						`${window.location.pathname}?article=${encodeURIComponent(request.articleId)}`
					goto(resolve(`${hrefToUse}${currentHash}` as Pathname & {}))
					return
				}

				if (previewClickable) {
					e.preventDefault()
					e.stopPropagation()
					const previewId = previewClickable.dataset.previewId
					if (!previewId) return
					pjlPreviewController?.activatePreview(previewId, previewClickable)
					return
				}

				pjlPreviewController?.clearActivePreview()

				if (link) {
					e.preventDefault()
					const hash = link.getAttribute("href")
					if (hash) {
						pushState(resolve(("#" + hash) as Pathname & {}), {})
						scrollToAnchor(hash, shadow)
					}
				}

				if (!target.closest("button.highlighted")) {
					parameterButtonController?.clearActiveSelection()
				}

				if (lawLink) {
					e.preventDefault()
					shared.pjlPreviewRequest = undefined
					const href = lawLink.getAttribute("href")
					const lawUrl = href ? new URL(href, window.location.origin) : null
					const lawArticle = lawUrl?.searchParams.get("article") ?? undefined
					if (lawArticle) {
						const html = paragraph?.innerHTML ?? lawLink.outerHTML
						const text =
							paragraph?.textContent?.replace(/\s+/g, " ").trim() ??
							lawLink.textContent?.replace(/\s+/g, " ").trim() ??
							""
						const block = paragraph
							? collectPjlBlock(shadow, paragraph)
							: {
									html: lawLink.outerHTML,
									text: lawLink.textContent?.replace(/\s+/g, " ").trim() ?? "",
								}
						shared.pjlSelectedLine = {
							articleId: lawArticle,
							html,
							text,
							blockHtml: block.html,
							blockText: trimBlockTextAtSectionBreak(block.text),
						}
					}
					const currentHash = window.location.hash
					const newUrl = href + currentHash
					goto(resolve(newUrl as Pathname & {}))
				}
			}

			shadow.addEventListener("click", handleClick)
			parameterButtonController = buildParameterButtonController(shadow)

			return () => {
				shadow.removeEventListener("click", handleClick)
				parameterButtonController = undefined
				resetPjlPreviewController()
			}
		} else {
			const shadowRoot = container.shadowRoot!
			const wrapper = shadowRoot.querySelector(".content-wrapper")
			if (wrapper) wrapper.innerHTML = pjlHTML
			rebuildPjlProjectionState(shadowRoot)
			parameterButtonController = buildParameterButtonController(shadowRoot)
			if (window.location.hash) {
				requestAnimationFrame(() =>
					requestAnimationFrame(() =>
						scrollToAnchor(window.location.hash, shadowRoot),
					),
				)
			}
		}
	})

	function scrollToAnchor(hash: string, shadowRoot: ShadowRoot) {
		if (!hash) return

		const id = hash.substring(1)
		const element = shadowRoot.getElementById(id)
		const host = shadowRoot.host as HTMLElement

		if (element && host) {
			const elementRect = element.getBoundingClientRect().top
			const hostRect = host.getBoundingClientRect().top
			const finalPosition = Math.max(0, elementRect - hostRect + host.scrollTop)
			host.scrollTop = finalPosition
		}
	}
</script>

<div class="flex h-full w-full max-w-6xl flex-col">
	<BillSummary {pjlHTML} {container} />
	<div
		bind:this={container}
		class=" w-full flex-1 overflow-y-auto bg-white px-3 shadow-md @sm/section-bill:px-5 @md/section-bill:px-6 @lg/section-bill:px-8"
	></div>
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
								<span class="font-serif italic">{parameterLabel}</span>
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
								{#each Object.entries(parametersToVariables) as [parameter, variables], indexParameter (indexParameter)}
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
						{#each variables as variable, indexVariable (indexVariable)}
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
