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
  <div>Identification nécessaire</div>
  <a href="/auth/login">Identification</a>
{:else}
  Le site est encore en développement. L'accès est réservé aux beta testeurs.
{/if}
