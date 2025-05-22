<script lang="ts">
	import Bill from "$lib/components/Bill.svelte"
	import type { PageProps } from "./$types"

	let activePanel: "bill" | "law" = "bill"
	let screenWidth = $state(1024)

	let isMobilePhone = $derived(screenWidth < 768)
	let { data }: PageProps = $props()
	let billHTML = $state(data.billHTML)
</script>

<div class="flex min-h-full w-full flex-row fixed overflow-hidden">
	<div class="h-screen w-1/2 overflow-y-auto"><Bill {billHTML}></Bill></div>
	<div class="w-1/2 bg-amber-200 h-screen overflow-y-auto">
		<p>Ici la loi</p>
		<p>lorem ipsum</p>
	</div>
</div>
