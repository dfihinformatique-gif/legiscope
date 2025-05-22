<script lang="ts">
	interface Props {
		billHTML: string | undefined
	}

	let container: HTMLDivElement

	$effect(() => {
		if (!container || !billHTML) return

		// Crée un Shadow DOM pour l'isolation CSS complète
		if (!container.shadowRoot) {
			container.attachShadow({ mode: "open" })
		}

		// Injecte le contenu dans le Shadow DOM
		container.shadowRoot!.innerHTML = billHTML
	})

	let { billHTML }: Props = $props()
</script>

<div bind:this={container} class="block h-full w-full"></div>
