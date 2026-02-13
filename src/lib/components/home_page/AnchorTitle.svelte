<script lang="ts">
	import { copyToClipboard } from "$lib/clipboard"
	import type { Snippet } from "svelte"

	interface Props {
		class?: string
		id: string
		tag?: string
		children?: Snippet
	}

	let { class: klass = "", id, tag = "h2", children, ...rest }: Props = $props()

	let linkCopied = $state(false)

	function copyUrl() {
		if (id === undefined) {
			return
		}
		const baseUrl = window.location.origin + window.location.pathname
		const urlWithAnchor = `${baseUrl}#${id}`
		copyToClipboard(urlWithAnchor, () => {
			linkCopied = true
			setTimeout(() => {
				linkCopied = false
			}, 2000)
		})
	}
</script>

<svelte:element this={tag} {...rest} {id} class="group relative {klass ?? ''}">
	<button class="absolute mt-1 -ml-8 h-6" onclick={copyUrl}>
		<iconify-icon
			class="text-neutral-400 group-hover:text-black"
			icon={!linkCopied ? "ri-links-line" : "ri-check-line"}
		></iconify-icon>

		{#if linkCopied}
			<span
				class="bg-le-vert-800 absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 font-sans text-sm font-normal text-nowrap text-white"
				>Lien copié !</span
			>
		{/if}
	</button>
	{@render children?.()}
</svelte:element>
