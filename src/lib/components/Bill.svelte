<script lang="ts">
	interface Props {
		billHTML: string | undefined
	}

	let container: HTMLDivElement

	$effect(() => {
		if (!container || !billHTML) return

		if (!container.shadowRoot) {
      const shadow = container.attachShadow({ mode: "open" });

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
      `;
    } else {
      // Met à jour seulement le contenu, pas la structure
      const wrapper = container.shadowRoot!.querySelector('.content-wrapper');
      if (wrapper) wrapper.innerHTML = billHTML;
    }
	})

	let { billHTML }: Props = $props()
</script>

<div bind:this={container} class="block h-full w-full"></div>
