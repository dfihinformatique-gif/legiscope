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
	import { SvelteMap, SvelteSet } from "svelte/reactivity"

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

	function findFirstLinkAbove(element: HTMLElement): HTMLAnchorElement | null {
		let current: HTMLElement | null = element

		while (current) {
			let sibling = current.previousElementSibling
			while (sibling) {
				if (sibling instanceof HTMLAnchorElement) return sibling

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

	function getPjlArticleLabelForLink(link: HTMLAnchorElement): string | null {
		const section = link.closest('div[class^="assnatSection"]')
		if (!section) return null
		const text = normalizeLineText(section.textContent)
		const match = /\bARTICLE\s+([0-9IVXLCDM]+|unique)\b/i.exec(text)
		if (!match) return null
		const raw = match[1] ?? ""
		if (!raw) return null
		if (/^unique$/i.test(raw)) return "Article unique"
		return `Article ${raw.toUpperCase()}`
	}

	function buildPjlArticleBlocks(root: ShadowRoot): Record<
		string,
		{
			pjlArticleLabel: string
			blockHtml: string
			blockText: string
		}[]
	> {
		const hasActionVerb = (text: string): boolean => {
			const prefix = text.split("«")[0] ?? text
			const normalized = prefix
				.toLowerCase()
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "")
			return /\b(insere|ajout|remplac|supprim|abrog|complet|retabl|modifi)/.test(
				normalized,
			)
		}

		const isDispositiveElement = (node: Element): boolean => {
			let current: Element | null = node
			while (current) {
				const className = current.getAttribute("class")
				if (className && className.toLowerCase().includes("projetloi")) {
					return true
				}
				current = current.parentElement
			}
			return false
		}

		const findActionParagraphForLink = (
			nodes: Element[],
			paragraph: Element,
		): Element => {
			const paragraphText = normalizeLineText(paragraph.textContent)
			if (!paragraphText.startsWith("«")) return paragraph
			const isInDispositive = isDispositiveElement(paragraph)
			if (!isInDispositive) return paragraph
			const startIndex = nodes.findIndex((node) => node.contains(paragraph))
			if (startIndex === -1) return paragraph
			for (let i = startIndex - 1; i >= 0; i -= 1) {
				const candidate = nodes[i]
				if (!isDispositiveElement(candidate)) break
				const candidateText = normalizeLineText(candidate.textContent)
				if (!candidateText) continue
				if (candidateText.startsWith("«")) continue
				return candidate
			}
			return paragraph
		}

		const getLinkTargets = (node: Element): string[] => {
			const actionLinks = Array.from(
				node.querySelectorAll<HTMLAnchorElement>("a.law-article-link"),
			)
			return actionLinks
				.map((actionLink) => {
					const actionHref = actionLink.getAttribute("href")
					if (!actionHref) return null
					const actionUrl = new URL(actionHref, window.location.origin)
					return actionUrl.searchParams.get("article")
				})
				.filter((value): value is string => Boolean(value))
		}

		const findContextTargets = (
			nodes: Element[],
			startNode: Element,
		): string[] => {
			const startIndex = nodes.findIndex((node) => node.contains(startNode))
			if (startIndex === -1) return []
			for (let i = startIndex; i >= 0; i -= 1) {
				const candidate = nodes[i]
				if (!isDispositiveElement(candidate)) break
				const candidateText = normalizeLineText(candidate.textContent)
				if (!candidateText || candidateText.startsWith("«")) continue
				const targets = getLinkTargets(candidate)
				if (targets.length > 0) return targets
			}
			return []
		}

		const result: Record<
			string,
			{
				pjlArticleLabel: string
				blockHtml: string
				blockText: string
			}[]
		> = {}
		const dedupe = new SvelteMap<string, SvelteSet<string>>()
		const nodes = Array.from(root.querySelectorAll("p, li, table"))
		const links = Array.from(
			root.querySelectorAll<HTMLAnchorElement>("a.law-article-link"),
		)
		for (const link of links) {
			const href = link.getAttribute("href")
			if (!href) continue
			const lawUrl = new URL(href, window.location.origin)
			const lawArticle = lawUrl.searchParams.get("article")
			if (!lawArticle) continue

			const paragraph = link.closest("p, li") ?? link.parentElement
			if (!paragraph) continue
			if (!isDispositiveElement(paragraph)) continue
			const isQuotedLine = normalizeLineText(paragraph.textContent).startsWith("«")
			const actionParagraph = findActionParagraphForLink(nodes, paragraph)
			const actionTargets = getLinkTargets(actionParagraph)
			const contextTargets = findContextTargets(nodes, actionParagraph)
			const targetPool =
				contextTargets.length > 0 ? contextTargets : actionTargets
			if (isQuotedLine && targetPool.length === 0) {
				continue
			}
			if (targetPool.length > 0 && !targetPool.includes(lawArticle)) {
				continue
			}
			const paragraphText = normalizeLineText(actionParagraph.textContent)
			if (paragraphText.startsWith("«")) continue
			const block = collectPjlBlock(root, actionParagraph)
			const blockText = block.text
			if (!blockText) continue
			if (!hasActionVerb(blockText)) continue

			const pjlArticleLabel = getPjlArticleLabelForLink(link) ?? "Article"

			const key = `${pjlArticleLabel}||${blockText}`
			const existing = dedupe.get(lawArticle) ?? new SvelteSet<string>()
			if (existing.has(key)) continue
			existing.add(key)
			dedupe.set(lawArticle, existing)

			if (!result[lawArticle]) {
				result[lawArticle] = []
			}
			result[lawArticle].push({
				pjlArticleLabel,
				blockHtml: block.html,
				blockText: block.text,
			})
		}
		return result
	}

	function collectPjlBlock(
		root: ShadowRoot,
		startNode: Element,
	): { html: string; text: string } {
		const nodes = Array.from(root.querySelectorAll("p, li, table"))
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

		const startHasOpenQuote = startText.includes("«")
		const startHasCloseQuote = startText.includes("»")
		let inQuoteBlock = startHasOpenQuote && !startHasCloseQuote
		const colonMode = !inQuoteBlock && startText.endsWith(":")
		let listMode = false
		let listRoot: Element | null = null
		let listQuotePending = false
		const listStartLevel = getListMarkerLevel(startText)
		const normalizedStart = startText
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
		const allowSameLevelItems =
			/^\s*1\s*(?:°|\.|\))\s+/u.test(startText) &&
			/\bapres\s+le\b/u.test(normalizedStart) &&
			/\binser/.test(normalizedStart)
		if (colonMode && allowSameLevelItems) {
			listMode = true
			listRoot = start.closest("ol, ul")
		}
		if (!inQuoteBlock && !startText.endsWith(":")) {
			const startLevel = listStartLevel
			if (startLevel !== null) {
				let currentLevel = startLevel
				const context: Element[] = []
				for (let i = startIndex - 1; i >= 0; i -= 1) {
					const previous = nodes[i]
					const prevText = normalizeLineText(previous.textContent)
					if (!prevText) continue
					const level = getListMarkerLevel(prevText)
					if (level !== null && level < currentLevel) {
						context.unshift(previous)
						currentLevel = level
						if (currentLevel === 1) break
					}
				}
				if (context.length > 0) {
					collected.unshift(...context)
				}
			}
			return {
				html: collected.map((node) => node.outerHTML).join("\n"),
				text: collected
					.map((node) => normalizeLineText(node.textContent))
					.join("\n"),
			}
		}

		const listItemRe =
			/^\s*(?:[IVXLCDM]+\s*(?:°|\.|\))|\d+\s*(?:°|\.|\))|[a-zA-Z]\s*\)|[a-zA-Z]\.)\s+/u
		function getListMarkerLevel(text: string): number | null {
			const match =
				/^\s*([IVXLCDM]+|\d+|[a-zA-Z])\s*(?:°|\.|\)|-|–|—)\s+/u.exec(text)
			if (!match) return null
			const marker = match[1] ?? ""
			if (!marker) return null
			if (/^[IVXLCDM]+$/i.test(marker)) return 1
			if (/^\d+$/u.test(marker)) return 2
			if (/^[a-zA-Z]$/u.test(marker)) return 3
			return null
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
			const isShortMarker = text.length <= 2 && !/[\p{L}\p{N}]/u.test(text)
			const isSkippableBeforeQuote =
				text.length === 0 || isMarkerCell || isPastille || isShortMarker

			if (!inQuoteBlock) {
				if (colonMode && !listMode) {
					if (hasOpenQuote) {
						inQuoteBlock = !hasCloseQuote
						collected.push(node)
						if (!inQuoteBlock) break
						continue
					}
					if (isSkippableBeforeQuote) {
						continue
					}
					if (listItemRe.test(text)) {
						listMode = true
						if (!listRoot) {
							listRoot = node.closest("ol, ul")
						}
						collected.push(node)
						listQuotePending = text.trim().endsWith(":")
						if (hasOpenQuote && !hasCloseQuote) {
							inQuoteBlock = true
							listQuotePending = false
						}
						continue
					}
					break
				}

				if (listMode) {
					if (listRoot && !listRoot.contains(node)) {
						const isNewListItem =
							listItemRe.test(text) || getListMarkerLevel(text) !== null
						if (isNewListItem) {
							listRoot = node.closest("ol, ul")
						} else {
							if (listQuotePending || hasOpenQuote) {
								if (isSkippableBeforeQuote) continue
								collected.push(node)
								if (hasOpenQuote && !hasCloseQuote) {
									inQuoteBlock = true
									listQuotePending = false
								}
								if (hasCloseQuote) listQuotePending = false
								continue
							}
							break
						}
					}
					if (listStartLevel !== null && listItemRe.test(text)) {
						const currentLevel = getListMarkerLevel(text)
						if (currentLevel !== null) {
							if (currentLevel < listStartLevel) break
							if (currentLevel === listStartLevel && !allowSameLevelItems) {
								break
							}
						}
					} else if (listStartLevel !== null && !listItemRe.test(text)) {
						const currentLevel = getListMarkerLevel(text)
						if (currentLevel !== null && currentLevel <= listStartLevel) {
							break
						}
					}
					if (isSkippableBeforeQuote) continue
					collected.push(node)
					if (listItemRe.test(text)) {
						if (hasOpenQuote && !hasCloseQuote) {
							inQuoteBlock = true
							listQuotePending = false
						} else {
							listQuotePending = text.trim().endsWith(":")
						}
					} else if (hasOpenQuote && !hasCloseQuote) {
						inQuoteBlock = true
						listQuotePending = false
					}
					continue
				}

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
				if (hasCloseQuote) {
					inQuoteBlock = false
					listQuotePending = false
					if (!listMode) break
				}
			}
		}

		if (colonMode) {
			const fallback: Element[] = [start]
			let sawList = false
			let quoteOpen = false
			for (let i = startIndex + 1; i < nodes.length; i += 1) {
				const node = nodes[i]
				const text = normalizeLineText(node.textContent)
				const hasOpenQuote = text.includes("«")
				const hasCloseQuote = text.includes("»")
				const isEmpty = text.length === 0
				const isLi = node.tagName === "LI"
				const markerLevel = getListMarkerLevel(text)
				if (!sawList) {
					if (isEmpty) continue
					if (isLi && markerLevel !== null) {
						sawList = true
						fallback.push(node)
						if (hasOpenQuote && !hasCloseQuote) {
							quoteOpen = true
						}
						continue
					}
					break
				}

				if (isLi) {
					fallback.push(node)
					if (hasOpenQuote && !hasCloseQuote) {
						quoteOpen = true
					}
					if (hasCloseQuote) {
						quoteOpen = false
					}
					continue
				}

				if (quoteOpen) {
					if (!isEmpty) {
						fallback.push(node)
					}
					if (hasCloseQuote) {
						quoteOpen = false
					}
					continue
				}

				if (isEmpty) continue
				break
			}

			if (sawList && fallback.length > collected.length) {
				return {
					html: fallback.map((node) => node.outerHTML).join("\n"),
					text: fallback
						.map((node) => normalizeLineText(node.textContent))
						.join("\n"),
				}
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
		if (!container || !pjlHTML) {
			shared.pjlArticleBlocksByLawArticle = undefined
			return
		}

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			shadow.innerHTML = pjlHTML
			shared.pjlArticleBlocksByLawArticle = buildPjlArticleBlocks(shadow)

			const initialHash = window.location.hash
			if (initialHash) {
				requestAnimationFrame(() => scrollToAnchor(initialHash, shadow))
			}

			const handleClick = (e: Event) => {
				const mouseEvent = e as MouseEvent
				const target = mouseEvent.target as HTMLElement
				const selection = window.getSelection()
				if (selection && !selection.isCollapsed) {
					const selectedText = selection.toString().trim()
					if (selectedText.length > 0) {
						const anchorNode = selection.anchorNode
						const focusNode = selection.focusNode
						const anchorElement =
							anchorNode instanceof Element
								? anchorNode
								: anchorNode?.parentElement ?? null
						const focusElement =
							focusNode instanceof Element
								? focusNode
								: focusNode?.parentElement ?? null
						if (
							(anchorElement && shadow.contains(anchorElement)) ||
							(focusElement && shadow.contains(focusElement))
						) {
							return
						}
					}
				}

				const link = target.closest('a[href^="#"]') as HTMLAnchorElement
				const lawLink = target.closest("a.law-article-link")
				const paragraph = target.closest("p, li, div")

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
						const html = paragraph?.innerHTML ?? lawLink.outerHTML
						const text =
							paragraph?.textContent?.replace(/\s+/g, " ").trim() ??
							lawLink.textContent?.replace(/\s+/g, " ").trim() ??
							""
						const block = paragraph
							? collectPjlBlock(shadow, paragraph)
							: {
									html: lawLink.outerHTML,
									text:
										lawLink.textContent?.replace(/\s+/g, " ").trim() ??
										"",
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
			shared.pjlArticleBlocksByLawArticle = buildPjlArticleBlocks(
				container.shadowRoot!,
			)
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
