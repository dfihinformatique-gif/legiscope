<script lang="ts">
	import { shared } from "$lib/shared.svelte"
</script>

<div class="w-full animate-pulse">
	<div
		class="mx-3 h-screen max-w-6xl space-y-6 bg-blue-50 p-6 pt-4 text-blue-50 shadow md:mx-6"
		class:md:p-16={!shared.showBillDesktop}
	>
		Curabitur dictum finibus ante quis faucibus. Sed viverra neque nec arcu
		iaculis, a placerat nunc imperdiet. Nam quis sagittis felis. Phasellus
		vulputate sodales lacus, maximus accumsan nibh vestibulum nec. Sed elementum
		non sapien in bibendum. Curabitur in imperdiet felis. Donec dapibus sapien
		vel tortor sollicitudin malesuada.
		<div class="bg-le-gris-dispositif-light h-6 w-1/3 rounded"></div>
		<!-- Titre -->
		<div class="flex gap-4">
			<div class="bg-le-gris-dispositif-light h-12 w-4/6 rounded"></div>
			<div class="h-4 w-1/6 rounded bg-neutral-300"></div>
		</div>

		<!-- Métadonnées -->
		<div class="h-8 w-2/3 rounded bg-white"></div>

		<div class="flex flex-wrap gap-2">
			<div class="h-4 w-1/3 rounded bg-neutral-300"></div>
			<div class="h-4 w-1/5 rounded bg-neutral-300"></div>
			<div class="h-4 w-1/4 rounded bg-neutral-300"></div>
		</div>

		<!-- Texte article -->
		<div class="space-y-4">
			<div class="bg-le-gris-dispositif-light h-5 w-full rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-11/12 rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-10/12 rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-9/12 rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-full rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-11/12 rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-10/12 rounded"></div>
			<div class="bg-le-gris-dispositif-light h-5 w-9/12 rounded"></div>
		</div>
	</div>
</div>
