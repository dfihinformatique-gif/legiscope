<script lang="ts">
	import "../app.css"
	import NavBar from "./lib/components/NavBar.svelte"

	let { children } = $props()
</script>

<div class="flex h-screen flex-col">
	<!-- Navbar -->
	<NavBar></NavBar>

	<!-- Corps principal : Sidebar + Contenu -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside class="w-64 overflow-y-auto border-r bg-gray-100 p-4">
			<nav class="space-y-2"></nav>
		</aside>

		<!-- Zone principale -->
		<main class="flex-1 overflow-y-auto bg-white p-6">
			{@render children()}
		</main>
	</div>
</div>
