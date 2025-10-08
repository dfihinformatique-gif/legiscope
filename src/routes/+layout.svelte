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

	let { children, data } = $props()
	let { authenticationEnabled, user } = data
</script>

<svelte:window bind:outerWidth />

<svelte:head>
	<title>Assemblée nationale - LexImpact | Legi-UI</title>
	<meta name="description" content="Explorateur de legislation LexImpact" />
</svelte:head>

{#if !authenticationEnabled || (user !== undefined && user.roles?.includes("beta_testeur_legiscope"))}
	{#if page.url.pathname === "/"}
		<NavBarHome></NavBarHome>
		<main class="">{@render children()}</main>
	{:else}
		<!-- Zone principale -->
		<main class="absolute inset-0 min-h-full overflow-hidden">
			{@render children()}
		</main>
		<!-- Navbar -->
		<NavBar></NavBar>
	{/if}
{:else if user === undefined}
	<NavBarHome></NavBarHome>
	<main
		class="fond relative z-0 flex h-screen items-start justify-center py-10 before:absolute before:inset-x-0 before:top-0 before:h-[50vh] before:bg-gradient-to-b before:from-[#dbeafe] before:to-transparent"
	>
		<div class="z-10 mt-34">
			<p class="my-5 text-center">Ce site est encore en développement.</p>
			<div class="rounded-md bg-white p-10 shadow">
				<h1
					class="flex items-center text-center text-2xl font-bold tracking-widest"
				>
					<iconify-icon
						class="mr-2 align-[-0.1rem] text-2xl"
						icon="ri-lock-2-fill"
					></iconify-icon> Identification nécessaire
				</h1>

				<a
					class="hover:bg-le-gris-dispositif-dark bg-le-bleu mt-5 flex items-center justify-center gap-2 rounded-md px-5 py-2 text-center font-sans text-lg font-bold tracking-[0.085em] text-white uppercase shadow-lg"
					href="/auth/login"
					title="Identification"
				>
					S'authentifier<iconify-icon
						class="ml-2 align-[-0.4rem] text-2xl"
						icon="ri-arrow-right-line"
					></iconify-icon>
				</a>
			</div>
		</div>
	</main>
{:else}
	Ce site est encore en développement.
{/if}
