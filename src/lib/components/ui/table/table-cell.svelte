<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js"
	import type { HTMLTdAttributes } from "svelte/elements"

	let {
		ref = $bindable(null),
		class: className,
		children,
		isSubrow = false, // Custom props : La cellule appartient-elle à une ligne enfant dans un accordéon de tableau ?
		isFirstColumn = false, // Custom props : La cellule fait-elle partie de la première colonne ?
		...restProps
	}: WithElementRef<HTMLTdAttributes> & {
		isSubrow?: boolean
		isFirstColumn?: boolean
	} = $props()
</script>

<td
	bind:this={ref}
	data-slot="table-cell"
	class={cn(
		"bg-clip-padding p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
		isSubrow && isFirstColumn ? "hidden" : "",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</td>
