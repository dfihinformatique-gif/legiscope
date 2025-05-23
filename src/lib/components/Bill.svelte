<script lang="ts">
	interface Props {
		billHTML: string | undefined
	}

	let container: HTMLDivElement

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
            width: 100% !important;
            max-width: 800px; /* 600pt ≈ 800px */
            margin: 0 auto !important;
          }
          img {
						display: block !important;
						max-width: 100% !important;
						height: auto !important;
						margin-left: auto !important;
						margin-right: auto !important;
					}
          img[width], img[height] {
            width: auto !important;
            height: auto !important;
          }
          .content-wrapper {
            position: relative;
            min-height: 100%;
          }
        </style>
        <div class="content-wrapper">${billHTML}</div>
      `

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
	})

	let { billHTML }: Props = $props()
</script>

<div bind:this={container} class="block h-full w-full"></div>
