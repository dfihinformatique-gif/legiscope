<script lang="ts">
	let activePanel: "bill" | "law" = "bill"
	let screenWidth = $state(1024)

	let isMobilePhone = $derived(screenWidth < 768)
</script>

<svelte:window bind:innerWidth={screenWidth} />
<div class="flex min-h-full w-full flex-row">
	<div class="w-1/2 bg-blue-100">Choisir un projet de loi</div>
	<div class="w-1/2 bg-amber-200">&#x3C;-----</div>
</div>
