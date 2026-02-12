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
	<div class="grid h-screen grid-rows-[auto_1fr_auto]">
		<NavBarHome />
		<!-- Zone principale -->
		<main class="overflow-hidden bg-neutral-100">
			{@render children()}
		</main>
		<!-- Navbar -->
		<NavBar />
	</div>
{/if}
