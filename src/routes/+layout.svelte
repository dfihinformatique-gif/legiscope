<script lang="ts">
	import "../app.css"
	import NavBar from "./lib/components/NavBar.svelte"

	let { children } = $props()
</script>

<svelte:head>
	<title>Assemblée nationale - LexImpact | Legi-UI</title>
	<meta name="description" content="Explorateur de legislation LexImpact" />
</svelte:head>
<!-- Zone principale -->
<main class="absolute inset-0 min-h-full">
	{@render children()}
</main>
<!-- Navbar -->
<NavBar></NavBar>
