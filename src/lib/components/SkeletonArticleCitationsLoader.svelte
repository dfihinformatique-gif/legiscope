<script lang="ts">
	import { shared } from "$lib/shared.svelte"
</script>

<div class="w-full animate-pulse">
	<div
		class="mx-3 h-6/12 space-y-6 pt-4 text-blue-50"
		class:md:p-16={!shared.showBillDesktop}
	>
		Curabitur dictum finibus ante quis faucibus. Sed viverra neque nec arcu
		iaculis, a placerat nunc imperdiet. Nam quis sagittis felis. Phasellus
		vulputate sodales lacus, maximus accumsan nibh vestibulum nec. Sed elementum
		non sapien in bibendum. Curabitur in imperdiet felis. Donec dapibus sapien
		vel tortor sollicitudin malesuada.
		<div class="bg-le-gris-dispositif-light h-6 w-1/3 rounded"></div>

		<!-- Tableau -->
		<div class="space-y-4 bg-white p-4">
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
