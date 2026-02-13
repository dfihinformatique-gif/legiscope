<script lang="ts">
	import { Dialog, type WithoutChildrenOrChild } from "bits-ui"
	import type { Snippet } from "svelte"
	import { fly } from "svelte/transition"

	let {
		ref = $bindable(null),
		children,
		...restProps
	}: WithoutChildrenOrChild<Dialog.ContentProps> & {
		children?: Snippet
	} = $props()
</script>

<Dialog.Overlay bind:ref {...restProps} forceMount>
	{#snippet child({ props, open })}
		{#if open}
			<div {...props} transition:fly>
				{@render children?.()}
			</div>
		{/if}
	{/snippet}
</Dialog.Overlay>
