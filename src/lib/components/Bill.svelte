<script lang="ts">
	interface Props {
		billHTML: string | undefined
	}

	let container: HTMLDivElement

	const scrollToAnchor = (hash: string, shadowRoot: ShadowRoot) => {
		if (!hash) return

		const id = hash.substring(1) // Enlève le #
		const element = shadowRoot.getElementById(id)
		if (element) {
			element.scrollIntoView({ behavior: "smooth" })
		}
	}

	$effect(() => {
		if (!container || !billHTML) return

		if (!container.shadowRoot) {
			const shadow = container.attachShadow({ mode: "open" })

			// Crée un conteneur position:relative dans le Shadow DOM
			shadow.innerHTML = `
        <style>
          :host {
            display: block;
            height: 100%;
            position: relative;
            overflow: auto;
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
						// Met à jour l'URL du navigateur
						window.history.pushState(null, "", hash)
						scrollToAnchor(hash, shadow)
					}
				}
			})
		} else {
			// Met à jour seulement le contenu, pas la structure
			const wrapper = container.shadowRoot!.querySelector(".content-wrapper")
			if (wrapper) wrapper.innerHTML = billHTML
		}
	})

	let { billHTML }: Props = $props()
</script>

<div bind:this={container} class="block h-full w-full"></div>
