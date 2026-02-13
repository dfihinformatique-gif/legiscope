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

	let windowInnerHeight: number = $state(0)
</script>

<svelte:window bind:innerHeight={windowInnerHeight} />

<Dialog.Content bind:ref {...restProps} forceMount>
	{#snippet child({ props, open })}
		{#if open}
			<div {...props} transition:fly={{ y: windowInnerHeight / 6 }}>
				{@render children?.()}
			</div>
		{/if}
	{/snippet}
</Dialog.Content>
