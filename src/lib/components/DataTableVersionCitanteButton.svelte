<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down"
	import type { ComponentProps } from "svelte"

	let { variant = "ghost", ...restProps }: ComponentProps<typeof Button> =
		$props()
</script>

<div class="flex items-center gap-1">
	<Button
		class="-ml-1"
		title="Inverse l'ordre de tri des citations"
		{variant}
		{...restProps}
	>
		<ArrowUpDownIcon class="" />
	</Button>
	<div>Cet article est cité par :</div>
</div>
