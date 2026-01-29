<script lang="ts">
	import { goto } from "$app/navigation"
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

	// Pour supprimer la div de pied de page ou en-tête indiquant Projet de loi de finances 1
	const removeProjetDeLoiFooters = (root: ShadowRoot | HTMLElement) => {
		const isLikelyFooter = (text: string | null | undefined) => {
			if (!text) return false
			const cleaned = text.toLowerCase().replace(/\s+/g, " ").trim()

			/* Contient "projet de loi de finances" */
			if (!cleaned.includes("projet de loi de finances")) return false

			/* Contient un numéro isolé ou en fin */
			const hasPageNumber = /\b\d{1,3}\b/.test(cleaned)
			if (!hasPageNumber) return false

			/* Doit être court (ex : max 15 mots) */
			const wordCount = cleaned.split(/\s+/).length
			if (wordCount > 15) return false

			return true
		}

		root.querySelectorAll("div, p, table, section, footer").forEach((el) => {
			/* Ne touche pas aux éléments internes aux tableaux */
			if (el.closest("table") && el.tagName !== "TABLE") return

			const text = el.textContent
			if (isLikelyFooter(text)) {
				el.remove()
			}
		})
	}

	// Pour supprimer les font mises en place (ce qui rend impossible de leur appliquer une autre font) | Toutes les font ne sont pas supprimées au risque de casser la mise en page
	const removeSpecificFontFamilies = (root: ShadowRoot | HTMLElement) => {
		/* 1. Supprimer les font-family inline contenant Marianne */
		root
			.querySelectorAll<HTMLElement>('[style*="font-family"]')
			.forEach((el) => {
				const style = el.getAttribute("style")
				if (!style) return

				const cleanedStyle = style
					.split(";")
					.map((rule) => rule.trim())
					.filter((rule) => {
						const match = /^font-family\s*:\s*(.+)$/i.exec(rule)
						if (!match) return true
						const value = match[1].toLowerCase()
						return !(value.includes("marianne") || value.includes("arial"))
					})
					.join("; ")

				if (cleanedStyle) {
					el.setAttribute("style", cleanedStyle)
				} else {
					el.removeAttribute("style")
				}
			})

		/* 2. Supprimer dans les <style> internes les font-family ciblées */
		root.querySelectorAll("style").forEach((styleTag) => {
			if (!styleTag.textContent) return

			styleTag.textContent = styleTag.textContent.replace(
				/font-family\s*:\s*[^;]*(marianne)[^;]*;/gi,
				"",
			)
		})
	}

	// Pour éviter que le texte soit justifié (text-align:justify)
	const disableJustify = (root: ShadowRoot | HTMLElement) => {
		root.querySelectorAll("*").forEach((el) => {
			const style = getComputedStyle(el)
			if (style.textAlign === "justify") {
				;(el as HTMLElement).style.textAlign = "left" // ou "start"
			}
		})
	}

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

	$effect(() => {
		if (!container || !pjlHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			const style = `
						/* STYLES POUR RENDRE LISIBLE LE HTML */

					 	:host {
							display: block;
							font-size: 1.125rem;
							width: 96%;
							height: 100%;
							overflow-y: auto; /* scroll vertical indispensable pour la taille du document */
							overflow-x: hidden; /* pas de scroll horizontal */
						}
						:host, :host * {
							line-height: 1.5 !important;  /* Augmente aussi l'interligne */
							outline-color: #ced3e0;
						}
						.has-custom-color {
							color: #2f406a !important;
						}
						body {
							width: 100%; /* prendre toute la largeur */
							box-sizing: border-box;
						}
						img {
							max-width: 100%; /* images adaptatives */
							height: auto !important;
							display: block !important;
							margin: 0 auto !important;
						}
						table {
							table-layout: auto;
							width: 100% !important;
							border: 1px solid black !important;
						}
						.table-container { /*Style qui intervient sur la div créée pour entourer le tableau et qui permet de scroller à l'horizontale */
							overflow-x: auto;
							width: 100%;
							margin-top: 2rem !important;
							margin-bottom: 2rem !important;
						}

						.table-container table {
							width: max-content;
							table-layout: auto;
						}

						td, th {
							border-color: #ced3e0 !important;
							border-top-color: #ced3e0 !important;
							border-right-color: #ced3e0 !important;
							border-bottom-color: #ced3e0 !important;
							border-left-color: #ced3e0 !important;
							width: auto !important;
							word-wrap: break-word !important;
							overflow-wrap: break-word !important;
							padding: 0.5rem !important;
						}

						pre, code {
							white-space: pre-wrap !important;
							word-break: break-word !important;
						}
						.content-wrapper {
							position: relative;
							min-height: 100%;
							overflow-x: hidden !important;
						}
						div[class^="assnatSection"] { /*Retire les marges des sections en ciblant le début de la class */
							margin: 2rem !important;
						}

						html, p, div, ol, ul { /* Remplace toutes les marges top et bottom par 1rem pour éviter les grands écarts dans le html */
							margin-top: 0.5rem !important;
							margin-bottom: 0.5rem !important;
						}

						span { /* Ajoute un padding pour éviter que les textes ne soient collés */
							padding-right: 0.1rem !important;
							padding-left: 0.1rem !important;
						}

						.expose-motif {
							border-left: 2px solid #ccc;
							padding-left: 1rem;
						}

						/* STYLES POUR AMÉLIORER LE DESIGN DU HTML */


						p[class^="assnatFPFexpogentitre"] { /*Ajoute une marge au dessus du titre exposé des motifs */
							margin-top: 3rem !important;
						}

						[class^="assnatFPFprojetloiartexte"] { /*Cible les textes des articles TODO a mettre en lora */
							margin-top: 1rem !important;
							font-family: "Lora", serif !important;
						}

						a[href^="#"] { /*Crée un style pour mettre en avant les liens au sein du document */
							text-decoration: underline !important;
							text-decoration-style: dotted !important;
							text-decoration-color: #bbbbbb !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 1px !important;
						}
						a[href^="#"]:hover,
						a[href^="#"]:focus {
							text-decoration-style: solid !important;
							text-decoration-color: black !important;
							text-underline-offset: 4px !important;
							text-decoration-thickness: 2px !important;
						}
						.law-article-icon {
							margin-right: 0.1em !important;
							margin-left: 0.15em !important;
							position: relative; top: 0.15em;
						}
						.law-article-icon path {
							fill: #5e709e !important;
						}
						.law-article-link:hover .law-article-icon path {
							fill: #2f406a !important;
							text-underline-offset: 4px !important;
						}
						.law-article-link {
							color: #000000;
							text-decoration: underline;
							text-underline-offset: 4px !important;
							text-decoration-color: #ccd3e7 !important;
							text-decoration-thickness: 0.2rem !important;
							text-decoration-style: solid !important;
						}
						.law-article-link:hover {
							color: #2f406a;
							text-decoration-color: #2f406a !important;
							text-decoration-thickness: 0.1rem !important;
						}

						/* STYLES des numéros d'alinéas dans les articles du projet de loi */

						li.assnatFPFprojetloiartexte::before {
							margin-right: 0.9em;
							padding:0.1em;
							counter-increment: li;
							content: counter(li);
							background-color: #f5f5f5;
							color: #737373;
							border-radius: 40%;
							font-size: 0.7em;
							font-family: sans-serif;
					}

					/* Agrandir et colorer les numéros d'alinéas */
					p.assnat9ArticleNum {
						font-size: 2rem !important;
						color: #2f406a !important;
						margin-top: 2rem !important;
						padding-left: 1rem !important;
						text-align: left !important;
						border-bottom: 1px solid #2f406a !important;
						border-left: 1px solid #2f406a !important;
						padding-bottom: 0.25rem !important; /* petit espace avant la bordure */
					}

					/* Titre Niveau 2 */

					.assnat2PartieNum,
					.assnat2PartieIntit,
					p.assnat2PartieNum,
					p.assnat2PartieIntit,
					p.assnat2PartieNum span,
					p.assnat2PartieIntit span {
						margin-top: 1rem !important;
						font-size: 2rem !important; /* taille spécifique au niveau 2 */
						color: #2f406a !important;
						line-height: 1.4 !important;
					}


					/* Titre Niveau 4 */

					.assnat4TitreNum,
					.assnat4TitreIntit,
					p.assnat4TitreNum,
					p.assnat4TitreIntit,
					p.assnat4TitreNum span,
					p.assnat4TitreIntit span {
						margin-top: 0.8rem !important; /* par exemple un peu moins que niveau 2 */
						font-size: 1.5rem !important; /* taille spécifique au niveau 4 */
						color: #2f406a !important;
						line-height: 1.3 !important;
					}
				`

			shadow.innerHTML = `
				<style>${style}</style>
				<div class="content-wrapper"></div>
			`

			shadow.querySelector(".content-wrapper")!.innerHTML = pjlHTML

			// Pour transformer les tables des exposés des motifs en div
			const tables = shadow.querySelectorAll("table")

			tables.forEach((table) => {
				/* Cherche un <p class="assnatFPFexpogentexte"> dans cette table */
				if (table.querySelector("p.assnatFPFexpogentexte")) {
					/* Crée un div pour remplacer la table */
					const div = document.createElement("div")
					div.className = "expose-motif"

					/* Récupère tout le texte des paragraphes dans la table */
					const paragraphs = Array.from(
						table.querySelectorAll("p.assnatFPFexpogentexte"),
					)
					paragraphs.forEach((p) => {
						/* Clone le paragraphe pour conserver la structure */
						div.appendChild(p.cloneNode(true))
					})
					/* Remplace la table par ce div */
					table.replaceWith(div)
				}
			})

			// Applique les formules qui retirent certains éléments
			removeProjetDeLoiFooters(shadow)

			// Supprime la police Marianne
			removeSpecificFontFamilies(shadow)

			disableJustify(shadow)

			const initialHash = window.location.hash
			if (initialHash) {
				requestAnimationFrame(() => scrollToAnchor(initialHash, shadow))
			}

			const handleClick = (e: Event) => {
				const mouseEvent = e as MouseEvent
				const target = mouseEvent.target as HTMLElement

				const link = target.closest('a[href^="#"]') as HTMLAnchorElement

				if (link) {
					e.preventDefault()
					const hash = link.getAttribute("href")
					if (hash) {
						window.history.pushState(null, "", hash)
						scrollToAnchor(hash, shadow)
					}
				}

				if (!target.closest("button.highlighted")) {
					showParameterModal = false
					activeParam = null
					updateButtonColors()
				}
			}

			shadow.addEventListener("click", handleClick)

			// Supervise le style des tableaux en les mettant dans une div avec une bordure, seulement si il y a plus de 2 cellules, afin d'éviter de toucher aux tables qui contiennent les titres
			shadow.querySelectorAll("table").forEach((table) => {
				const cellCount = table.querySelectorAll("td, th").length

				/* Créer le conteneur scrollable */
				const wrapper = document.createElement("div")
				wrapper.classList.add("table-container")

				/* Insérer le conteneur autour de la table */
				table.parentNode?.insertBefore(wrapper, table)
				wrapper.appendChild(table)

				/* Appliquer la bordure si plus de 2 cellules */
				if (cellCount > 2) {
					table.style.border = "1px solid black"
					table.style.borderCollapse = "collapse"
				}
			})

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

<div class="flex h-full w-full max-w-6xl flex-col bg-white shadow-md">
	<BillSummary {pjlHTML} {container} />
	<div
		bind:this={container}
		class="w-full flex-1"
		class:md:p-10={!shared.showLawDesktop}
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
