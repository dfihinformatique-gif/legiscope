<script lang="ts">
	import "../app.css"

	import "iconify-icon"

	import { page } from "$app/state"
	import NavBarHome from "$lib/components/home_page/NavBarHome.svelte"
	import { shared } from "$lib/shared.svelte"
	import NavBar from "../lib/components/NavBar.svelte"

	let innerWidth: number = $state(1024)

	$effect(() => {
		shared.screenWidth = innerWidth
		shared.isMobilePhone = innerWidth < 768
	})

	let { children } = $props()
</script>

<svelte:window bind:innerWidth />

<svelte:head>
	<title>Assemblée nationale - LexImpact | Legi-UI</title>
	<meta name="description" content="Explorateur de legislation LexImpact" />
</svelte:head>

{#if page.url.pathname === "/"}
	<NavBarHome />
	<main class="">{@render children()}</main>
{:else}
	<NavBarHome />
	<!-- Zone principale -->
	<main
		class="absolute inset-0 mt-12 min-h-full overflow-hidden bg-neutral-200 2xl:mt-14"
	>
		{@render children()}
	</main>
	<!-- Navbar -->
	<NavBar />
{/if}
