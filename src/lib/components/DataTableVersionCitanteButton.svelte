<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down"
	import type { ComponentProps } from "svelte"

	let { variant = "ghost", ...restProps }: ComponentProps<typeof Button> =
		$props()
</script>

<Button {variant} {...restProps}>
	Cité par
	<ArrowUpDownIcon class="ml-2" />
</Button>
