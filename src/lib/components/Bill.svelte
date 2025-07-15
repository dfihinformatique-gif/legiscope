<script lang="ts">
	import BillSummary from "$lib/components/BillSummary.svelte"
	interface Props {
		pjlHTML: string | undefined
	}

	let container: HTMLDivElement | undefined = $state()
	let { pjlHTML }: Props = $props()
	let resizeObserver: ResizeObserver

	const adjustSizes = (shadowRoot: ShadowRoot) => {
		if (!shadowRoot) return

		// Ajuste les images au max 100% de leur conteneur
		shadowRoot.querySelectorAll("img").forEach((img) => {
			// Supprime les dimensions HTML (évite conflits avec CSS)
			img.removeAttribute("width")
			img.removeAttribute("height")

			// Style CSS pour un comportement fluide et centré
			img.style.display = "block"
			img.style.margin = "0 auto"
			img.style.height = "auto"
			img.style.maxWidth = "100%" // Ne dépasse jamais le conteneur
			// Pas de width forcée : l’image gardera sa taille naturelle si plus petite
		})
	}

	const scrollToAnchor = (hash: string, shadowRoot: ShadowRoot) => {
		if (!hash) return

		const id = hash.substring(1) // Remove #
		const element = shadowRoot.getElementById(id)
		if (element) {
			element.scrollIntoView({ behavior: "smooth" })
		}
	}

	// Pour supprimer les éléments vides ou contenant uniquement des espaces
	const removeEmptyElements = (root: ShadowRoot | HTMLElement) => {
		const elements = root.querySelectorAll("*")
		elements.forEach((el) => {
			if (el.children.length === 0 && el.textContent?.trim() === "") {
				el.remove()
			}
		})
	}

	// Pour augmenter la taille de toutes les typos
	const increaseFontSizes = (root: ShadowRoot | HTMLElement, factor = 1.4) => {
		const selectors =
			"h1, h2, h3, h4, h5, h6, ol, ul, li, p, span, table, th, tr, td"
		const elements = root.querySelectorAll(selectors)
		const exceptions = ["table", "th", "tr", "td", "span", "ol", "ul", "li"]

		elements.forEach((el) => {
			const element = el as HTMLElement
			const style = window.getComputedStyle(element)
			const fontSize = parseFloat(style.fontSize)
			if (!isNaN(fontSize) && fontSize > 0) {
				const isException = exceptions.includes(element.tagName.toLowerCase())
				const appliedFactor = isException ? 1.2 : factor
				const newSize = fontSize * appliedFactor
				element.style.fontSize = newSize + "px"
			}
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

	$effect(() => {
		if (!container || !pjlHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			const cleanedHTML = pjlHTML
				.replace(/\sstyle="[^"]*"/g, "") // supprime tous les style="..."
				.replace(
					/<img([^>]*)width="([^"]+)"([^>]*)>/g,
					(match, before, width, after) => {
						return `<img ${before} width="${width}" data-original-width="${width}" ${after}>`
					},
				)
			shadow.innerHTML = `
				<style>
					 	:host {
							display: block;
							width: 96%;
							height: 100%;
							overflow-y: auto; /* scroll vertical si besoin */
							overflow-x: hidden; /* pas de scroll horizontal */
						}
						:host, :host * {
							line-height: 1.5 !important;  /* Augmente aussi l'interligne */
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
							width: 100% !important;
							display: block;
							overflow-x: auto;
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
						html, p, div, section, ol, ul {
							margin: 5px !important;
							padding: 5px !important;
						} /* Remplace toutes les marges par 5px pour éviter les grands écarts dans le html */
						span {
							margin-right: 0.1rem !important;
							margin-left: 0.1rem !important;
						} /* Remplace toutes les marges par 5px pour éviter les grands écarts dans le html */
						.expose-motif {
							width: 100% !important;
							margin: 0 0 1rem 0 !important;
							padding: 0 !important;
							display: block;
							box-sizing: border-box;
						}
				</style>
				<div class="content-wrapper">${cleanedHTML}</div>
      `
			// Pour transformer les tables des exposés des motifs en div
			const tables = shadow.querySelectorAll("table")

			tables.forEach((table) => {
				// Cherche un <p class="assnatFPFexpogentexte"> dans cette table
				if (table.querySelector("p.assnatFPFexpogentexte")) {
					// Crée un div pour remplacer la table
					const div = document.createElement("div")
					div.className = "expose-motif"

					// Récupère tout le texte des paragraphes dans la table
					const paragraphs = Array.from(
						table.querySelectorAll("p.assnatFPFexpogentexte"),
					)
					paragraphs.forEach((p) => {
						// Clone le paragraphe pour conserver la structure
						div.appendChild(p.cloneNode(true))
					})
					// Remplace la table par ce div
					table.replaceWith(div)
				}
			})

			removeEmptyElements(shadow)
			increaseFontSizes(shadow, 1.4) // +40% sauf span qui aura +10%
			disableJustify(shadow)

			resizeObserver = new ResizeObserver(() => adjustSizes(shadow))
			resizeObserver.observe(container)
			requestAnimationFrame(() => adjustSizes(shadow))

			scrollToAnchor(window.location.hash, shadow)
			shadow.addEventListener("click", (e) => {
				const link = (e.target as HTMLElement).closest('a[href^="#"]')
				if (link) {
					e.preventDefault()
					const hash = link.getAttribute("href")
					if (hash) {
						window.history.pushState(null, "", hash)
						scrollToAnchor(hash, shadow)
					}
				}
			})
		} else {
			const wrapper = container.shadowRoot!.querySelector(".content-wrapper")
			if (wrapper) wrapper.innerHTML = pjlHTML
		}
		return () => resizeObserver?.disconnect()
	})
</script>

<div class="flex h-full w-full flex-col">
	<BillSummary {pjlHTML} {container} />
	<div bind:this={container} class="flex-1 overflow-auto"></div>
</div>
