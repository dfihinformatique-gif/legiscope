<script lang="ts">
	import { shared } from "$lib/shared.svelte"
	import "iconify-icon"
	import "../app.css"
	import NavBar from "../lib/components/NavBar.svelte"

	let outerWidth: number = $state(1024)

	$effect(() => {
		shared.screenWidth = outerWidth
		shared.isMobilePhone = outerWidth < 768
	})

	let { children } = $props()
</script>

<svelte:window bind:outerWidth />

<svelte:head>
	<title>Assemblée nationale - LexImpact | Legi-UI</title>
	<meta name="description" content="Explorateur de legislation LexImpact" />
</svelte:head>
<!-- Zone principale -->
<main class="absolute inset-0 min-h-full overflow-hidden">
	{@render children()}
</main>
<!-- Navbar -->
<NavBar></NavBar>
