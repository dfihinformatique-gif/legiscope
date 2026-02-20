<script lang="ts">
	import { goto, pushState } from "$app/navigation"
	import { resolve } from "$app/paths"
	import type { Pathname } from "$app/types"

	import BillSummary from "$lib/components/BillSummary.svelte"
	import ParameterLinkModal from "$lib/components/ParameterLinkModal.svelte"
	import {
		decodeParametersToVariables,
		getParameter,
		rootParameter,
		variablesSummaries,
	} from "$lib/openfisca_parameters"
	import { shared } from "$lib/shared.svelte"
	import { simplifyHtml } from "@tricoteuses/tisseuse"

	interface Props {
		pjlHTML: string | undefined
		showParameterModal: boolean
		parametersToVariables: Record<string, string[]> | null
	}

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

	let container: HTMLDivElement | undefined = $state()
	let {
		pjlHTML,
		showParameterModal,
		parametersToVariables = $bindable(),
	}: Props = $props()

	function findFirstLinkAbove(
		button: HTMLButtonElement,
	): HTMLAnchorElement | null {
		let current: HTMLElement | null = button

		while (current) {
			let sibling = current.previousElementSibling
			while (sibling) {
				if (sibling instanceof HTMLAnchorElement) {
					return sibling
				}

				const links = sibling.querySelectorAll("a")
				if (links.length > 0) {
					return links[links.length - 1] as HTMLAnchorElement
				}

				sibling = sibling.previousElementSibling
			}

			current = current.parentElement
		}

		return null
	}

	function normalizeLineText(value: string | null): string {
		return (value ?? "").replace(/\s+/g, " ").trim()
	}

	function collectPjlBlock(
		root: ShadowRoot,
		startNode: Element,
	): { html: string; text: string } {
		const nodes = Array.from(root.querySelectorAll("p, li"))
		const startIndex = nodes.findIndex((node) => node.contains(startNode))
		if (startIndex === -1) {
			return {
				html: startNode.outerHTML,
				text: normalizeLineText(startNode.textContent),
			}
		}

		const collected: Element[] = []
		const start = nodes[startIndex]
		const startText = normalizeLineText(start.textContent)
		collected.push(start)

		let inQuoteBlock = startText.includes("«")
		if (!inQuoteBlock && !startText.endsWith(":")) {
			return {
				html: collected.map((node) => node.outerHTML).join("\n"),
				text: collected
					.map((node) => normalizeLineText(node.textContent))
					.join("\n"),
			}
		}

		for (let i = startIndex + 1; i < nodes.length; i += 1) {
			const node = nodes[i]
			const text = normalizeLineText(node.textContent)
			const hasOpenQuote = text.includes("«")
			const hasCloseQuote = text.includes("»")
			const isMarkerCell = node.closest("td.texte-col-0") !== null
			const isPastille =
				node.classList.contains("pastille") ||
				node.getAttribute("data-pastille") !== null
			const isShortMarker =
				text.length <= 2 && !/[\p{L}\p{N}]/u.test(text)
			const isSkippableBeforeQuote =
				text.length === 0 || isMarkerCell || isPastille || isShortMarker

			if (!inQuoteBlock) {
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
				if (hasCloseQuote) break
			}
		}

		return {
			html: collected.map((node) => node.outerHTML).join("\n"),
			text: collected
				.map((node) => normalizeLineText(node.textContent))
				.join("\n"),
		}
	}

	$effect(() => {
		if (!container || !pjlHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			shadow.innerHTML = pjlHTML

			const initialHash = window.location.hash
			if (initialHash) {
				requestAnimationFrame(() => scrollToAnchor(initialHash, shadow))
			}

			const handleClick = (e: Event) => {
				const mouseEvent = e as MouseEvent
				const target = mouseEvent.target as HTMLElement

				const link = target.closest('a[href^="#"]') as HTMLAnchorElement
				const lawLink = target.closest("a.law-article-link")

				if (link) {
					e.preventDefault()
					const hash = link.getAttribute("href")
					if (hash) {
						pushState(resolve(("#" + hash) as Pathname & {}), {})
						scrollToAnchor(hash, shadow)
					}
				}

				if (!target.closest("button.highlighted")) {
					showParameterModal = false
					activeParam = null
					updateButtonColors()
				}

				if (lawLink) {
					e.preventDefault()
					const href = lawLink.getAttribute("href")
					const lawUrl = href ? new URL(href, window.location.origin) : null
					const lawArticle = lawUrl?.searchParams.get("article") ?? undefined
					if (lawArticle) {
						const paragraph = target.closest("p, li, div")
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
							blockText: block.text,
						}
					}
					const currentHash = window.location.hash
					const newUrl = href + currentHash
					goto(resolve(newUrl as Pathname & {}))
				}
			}

			shadow.addEventListener("click", handleClick)

			// BOUTON PARAMÈTRES du simulateur ou OpenFIsca

			const baseBg = "#ccd3e7" /* Fond bleu clair */
			const hoverBg =
				"rgba(127, 122, 9, 0.5)" /* Fond vert translucide au hover + actif */

			let activeParam: string | null =
				null /* Pour savoir quel paramètre est actif */

			/* Nettoyer anciens listeners */
			Array.from(
				shadow.querySelectorAll<HTMLButtonElement>("button.highlighted"),
			).forEach((btn) => {
				const clone = btn.cloneNode(true) as HTMLButtonElement
				btn.replaceWith(clone)
			})

			/* Re-sélectionner les boutons */
			const buttons = Array.from(
				shadow.querySelectorAll<HTMLButtonElement>("button.highlighted"),
			)

			/* Style initial + listeners */
			buttons.forEach((button) => {
				button.style.setProperty("appearance", "none", "important")
				button.style.setProperty("-webkit-appearance", "none", "important")
				button.style.setProperty("border", "none", "important")
				button.style.setProperty("box-shadow", "none", "important")
				button.style.setProperty("background-color", baseBg, "important")
				button.style.setProperty("color", "#000", "important")
				button.style.setProperty("cursor", "pointer", "important")
				button.style.setProperty("font-family", "inherit", "important")
				button.style.setProperty("font-size", "inherit", "important")
				button.style.setProperty(
					"transition",
					"background-color 0.2s ease",
					"important",
				)
				const buttonInnerText = simplifyHtml({ removeAWithHref: true })(
					button.innerHTML,
				).output.replace(" ", "")
				/* Hover : seulement si le bouton n’est pas celui du paramètre actif */
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

				/* Clic sur le bouton */
				button.addEventListener("click", (e: Event) => {
					e.stopPropagation()
					clickedParameterButtons = buttons
					const clickedParam = button.dataset.params ?? null

					/* Si on clique sur le même paramètre => toggle */
					if (showParameterModal && activeParam === clickedParam) {
						showParameterModal = false
						activeParam = null
					} else {
						/* Sinon, on ouvre le nouveau paramètre */
						activeParam = clickedParam
						const linkAbove = findFirstLinkAbove(button)
						if (linkAbove && linkAbove.href) {
							const url = new URL(linkAbove.href)
							goto(
								resolve(`${url.pathname}${url.search}${url.hash}` as Pathname),
							)
						}
						parametersToVariables = clickedParam
							? decodeParametersToVariables(clickedParam)
							: {}
						showParameterModal = true
					}

					/* Met à jour les couleurs selon l'état du modal */
					updateButtonColors()
				})
			})

			/* 🔹 Fonction utilitaire pour gérer les couleurs selon showParameterModal */
			function updateButtonColors() {
				buttons.forEach((b) => {
					if (showParameterModal && b.dataset.params === activeParam) {
						/* Bouton du paramètre actif -> vert */
						b.style.setProperty("background-color", hoverBg, "important")
					} else {
						/* Tous les autres -> bleu */
						b.style.setProperty("background-color", baseBg, "important")
					}
				})
			}

			return () => {
				shadow.removeEventListener("click", handleClick)
			}
		} else {
			const wrapper = container.shadowRoot!.querySelector(".content-wrapper")
			if (wrapper) wrapper.innerHTML = pjlHTML
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
			const finalPosition = elementRect - hostRect + host.scrollTop
			host.scrollTo({
				top: finalPosition,
				behavior: "smooth",
			})
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
