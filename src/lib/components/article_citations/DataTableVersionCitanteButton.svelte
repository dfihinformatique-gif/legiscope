<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import type { ComponentProps } from "svelte"

	let {
		variant = "ghost",
		inEffectOnly = $bindable(false),
		onFilterChange,
		grouping = [],
		articleNum,
	}: ComponentProps<typeof Button> & {
		inEffectOnly?: boolean
		onFilterChange?: (value: boolean) => void
		grouping?: string[]
		articleNum?: string | null
	} = $props()
</script>

<div
	class="flex items-center font-bold"
	class:pl-2={grouping.includes("version_citee")}
>
	{grouping.includes("version_citee")
		? `Versions de l'art. ${articleNum ?? "étudié"} citées par un autre article :`
		: `Cet article est cité par :`}
</div>
