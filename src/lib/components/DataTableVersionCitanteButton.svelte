<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down"
	import type { ComponentProps } from "svelte"

	let {
		variant = "ghost",
		inEffectOnly = $bindable(false),
		onFilterChange,
		grouping = [],
		articleNum,
		...restProps
	}: ComponentProps<typeof Button> & {
		inEffectOnly?: boolean
		onFilterChange?: (value: boolean) => void
		grouping?: string[]
		articleNum?: string | null
	} = $props()
</script>

<div class="flex items-center gap-4">
	<div class="flex items-center gap-1">
		<Button
			class="-ml-1"
			title="Inverse l'ordre de tri des citations"
			{variant}
			{...restProps}
		>
			<ArrowUpDownIcon class="" />
		</Button>
		<div>
			{grouping.includes("version_citee")
				? `Versions de l'article ${articleNum ?? "étudié"} citées par un autre article :`
				: `Cet article est cité par :`}
		</div>
	</div>
</div>
