<script lang="ts">
	import { shared } from "$lib/shared.svelte"
</script>

{#if !shared.isMobilePhone}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		<div
			class={`z-10 origin-right overflow-y-auto shadow-xl transition-all duration-300 ${
				shared.showBillDesktop && shared.showLawDesktop
					? "w-1/2"
					: shared.showBillDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			Choisir un projet de loi
		</div>

		<div
			class={`overflow-y-auto bg-blue-100 transition-all duration-300 ${
				shared.showLawDesktop && shared.showBillDesktop
					? "w-1/2"
					: shared.showLawDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			&#x3C;-----
		</div>
	</div>
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		{#if shared.activePanelMobile === "bill"}
			<div class="z-10 h-screen w-full overflow-y-auto shadow-md">
				Choisir un projet de loi
			</div>
		{:else if shared.activePanelMobile === "law"}
			<div class="h-screen w-full overflow-y-auto bg-blue-100">&#x3C;-----</div>
		{/if}
	</div>
{/if}
