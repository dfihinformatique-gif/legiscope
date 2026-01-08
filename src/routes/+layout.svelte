<script lang="ts">
	import "../app.css"

	import "iconify-icon"

	import { page } from "$app/state"
	import NavBarHome from "$lib/components/home_page/NavBarHome.svelte"
	import { shared } from "$lib/shared.svelte"
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

{#if page.url.pathname === "/"}
	<NavBarHome></NavBarHome>
	<main class="">{@render children()}</main>
{:else}
	<NavBarHome></NavBarHome>
	<!-- Zone principale -->
	<main
		class="absolute inset-0 min-h-full overflow-hidden bg-neutral-200 md:mt-12 2xl:mt-14"
	>
		{@render children()}
	</main>
	<!-- Navbar -->
	<NavBar></NavBar>
{/if}
