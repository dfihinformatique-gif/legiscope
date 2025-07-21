<script lang="ts">
	import {
		activePanelMobile,
		isMobilePhone,
		showBillDesktop,
		showLawDesktop,
		toggleBill,
		toggleLaw,
	} from "$lib/navStore"
</script>

{#if !$isMobilePhone}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap justify-items-center-safe overflow-hidden bg-white py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-sm uppercase transition-colors duration-150"
				class:bg-blue-200={$showBillDesktop}
				on:click={toggleBill}
			>
				Projet de loi
			</button>
		</div>
		<pre class="text-xs">
	Bill: {$showBillDesktop}
	Law: {$showLawDesktop}
</pre>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-sm uppercase transition-colors duration-150"
				class:bg-blue-200={$showLawDesktop}
				on:click={toggleLaw}
			>
				Loi
			</button>
		</div>
	</div>
{:else}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap justify-items-center-safe overflow-hidden bg-white py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-sm uppercase transition-colors duration-150"
				class:bg-blue-200={$activePanelMobile === "bill"}
				on:click={() => activePanelMobile.set("bill")}
			>
				Projet de loi
			</button>
		</div>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-sm uppercase transition-colors duration-150"
				class:bg-blue-200={$activePanelMobile === "law"}
				on:click={() => activePanelMobile.set("law")}
			>
				Loi
			</button>
		</div>
	</div>
{/if}
