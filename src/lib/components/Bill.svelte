<script lang="ts">
	import BillSummary from "./BillSummary.svelte"
	interface Props {
		billHTML: string | undefined
	}

	let container: HTMLDivElement | undefined = $state()
	let { billHTML }: Props = $props()
	let resizeObserver: ResizeObserver

	const baseWidth = 800

	const adjustSizes = (shadowRoot: ShadowRoot) => {
		if (!shadowRoot) return

		const currentWidth = shadowRoot.host.clientWidth
		const scaleFactor = Math.min(1.5, currentWidth / baseWidth) // Limite l'agrandissement

		// Applique le facteur d'échelle
		const body = shadowRoot.querySelector("body")
		if (body) {
			body.style.fontSize = `${scaleFactor * 100}%`
			body.style.width = `${baseWidth}px` // Maintient la largeur de référence
		}

		// Ajuste les images
		shadowRoot.querySelectorAll("img").forEach((img) => {
			const originalWidth = parseInt(
				img.dataset.originalWidth || img.getAttribute("width") || "0",
			)
			if (originalWidth) {
				const newWidth = originalWidth * scaleFactor
				img.style.width = `${newWidth}px`
				img.style.height = "auto"
				img.style.maxWidth = "none"
				img.style.display = "block"
				img.style.margin = "0 auto"
			}
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

	$effect(() => {
		if (!container || !billHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			const processedHTML = billHTML.replace(
				/<img([^>]*)width="([^"]+)"([^>]*)>/g,
				(match, before, width, after) => {
					return `<img ${before} width="${width}" data-original-width="${width}" ${after}>`
				},
			)

			shadow.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: 100%;
            overflow: auto;
            padding: 0 16px;
          }
          body {
            width: ${baseWidth}px;
            max-width: 100%;
            margin: 0 auto !important;
						transform-origin: top center;
          }
          img {
						display: block !important;
						height: auto !important;
						margin: 0 auto !important;
					}
					p[style*="text-align:center"] img,
          p[style*="text-align: center"] img {
            display: inline-block !important;
          }
          .content-wrapper {
            position: relative;
            min-height: 100%;
          }
        </style>
        <div class="content-wrapper">${processedHTML}</div>
      `

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
			if (wrapper) wrapper.innerHTML = billHTML
		}
		return () => resizeObserver?.disconnect()
	})
</script>

<div class="flex h-full w-full flex-col">
	<BillSummary {billHTML} {container} />
	<div bind:this={container} class="flex-1 overflow-auto"></div>
</div>
