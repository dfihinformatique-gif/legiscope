<script lang="ts">
	import { shared } from "$lib/shared.svelte"
</script>

{#if !shared.isMobilePhone}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap justify-items-center-safe overflow-hidden bg-neutral-200 py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150"
				class:bg-blue-200={shared.showBillDesktop}
				class:bg-white={!shared.showBillDesktop}
				class:font-bold={shared.showBillDesktop}
				onclick={() => {
					shared.showBillDesktop = !shared.showBillDesktop
				}}
			>
				<iconify-icon
					class="mr-1 align-[-0.3rem] text-2xl"
					icon={shared.showBillDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
				></iconify-icon>

				Projet de loi
			</button>
		</div>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150"
				class:bg-blue-200={shared.showLawDesktop}
				class:bg-white={!shared.showLawDesktop}
				onclick={() => {
					shared.showLawDesktop = !shared.showLawDesktop
				}}
			>
				<iconify-icon
					class="mr-1 align-[-0.3rem] text-2xl"
					icon={shared.showLawDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
				></iconify-icon>

				Loi
			</button>
		</div>
	</div>
{:else}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap items-center overflow-hidden border-t border-neutral-200 bg-neutral-100 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="flex w-1/2">
			<button
				class="flex h-16 w-full items-center justify-center border-b-[4px] border-transparent text-xl tracking-wide text-black uppercase"
				class:!border-black={shared.activePanelMobile === "bill"}
				class:text-black={shared.activePanelMobile === "bill"}
				class:font-bold={shared.activePanelMobile === "bill"}
				class:hover:bg-white={shared.activePanelMobile === "law"}
				class:!bg-neutral-200={shared.activePanelMobile === "law"}
				class:hover:font-bold={shared.activePanelMobile === "law"}
				class:hover:!border-black={shared.activePanelMobile === "law"}
				onclick={() => (shared.activePanelMobile = "bill")}
			>
				Projet de loi
			</button>
		</div>
		<div class="flex w-1/2">
			<button
				class="flex h-16 w-full items-center justify-center border-b-[4px] border-transparent text-xl tracking-wide text-black uppercase"
				class:!border-black={shared.activePanelMobile === "law"}
				class:text-black={shared.activePanelMobile === "law"}
				class:font-bold={shared.activePanelMobile === "law"}
				class:!bg-neutral-200={shared.activePanelMobile === "bill"}
				class:hover:bg-white={shared.activePanelMobile === "bill"}
				class:hover:font-bold={shared.activePanelMobile === "bill"}
				class:hover:!border-black={shared.activePanelMobile === "bill"}
				onclick={() => (shared.activePanelMobile = "law")}
			>
				Loi
			</button>
		</div>
	</div>
{/if}
