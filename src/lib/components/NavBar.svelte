<script lang="ts">
	import { shared } from "$lib/shared.svelte"
</script>

{#if !shared.isMobilePhone}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap justify-items-center-safe overflow-hidden bg-neutral-200 py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="basis-1/2">
			<button
				class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showBillDesktop
					? 'border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-blue-200 font-bold hover:bg-blue-100'
					: 'border-neutral-500 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'}
  "
				onclick={() => {
					shared.showBillDesktop = !shared.showBillDesktop
					if (!shared.showBillDesktop && !shared.showLawDesktop) {
						shared.showLawDesktop = true
					}
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
				class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showLawDesktop
					? 'border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-blue-200 font-bold hover:bg-blue-100'
					: 'border-neutral-500 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'}"
				onclick={() => {
					shared.showLawDesktop = !shared.showLawDesktop
					if (!shared.showBillDesktop && !shared.showLawDesktop) {
						shared.showBillDesktop = true
					}
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
	<div class="absolute right-3 bottom-7">
		<a
			class="cursor-pointer overflow-hidden rounded-lg px-4 py-3 text-center text-sm text-gray-600 uppercase hover:bg-neutral-300 hover:text-gray-800 focus:outline-none active:text-gray-900"
			href="/#caracteristiques-simulateur"
		>
			<iconify-icon
				class="mr-1 align-[-0.2rem] text-lg text-gray-500"
				icon="ri-information-2-fill"
			></iconify-icon>Info
		</a>
	</div>
{:else}
	<div class="flex w-full justify-center">
		<div
			class="l fixed bottom-0 flex w-10/12 flex-row flex-nowrap items-center overflow-hidden border-t border-neutral-200 bg-neutral-100 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
		>
			<div class="flex w-1/2">
				<button
					class="flex h-14 w-full items-center justify-center border-b-[4px] border-transparent text-xl tracking-wide uppercase"
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
					class="flex h-14 w-full items-center justify-center border-b-[4px] border-transparent text-xl tracking-wide text-black uppercase"
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
	</div>
{/if}
