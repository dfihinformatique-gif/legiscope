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
			>Info
			<iconify-icon
				class="mr-1 align-[-0.4rem] text-2xl text-gray-500"
				icon="ri-information-2-fill"
			></iconify-icon>
		</a>
	</div>
{:else}
	<div class="fixed bottom-0 flex w-full justify-center">
		<div class=" flex w-1/12"></div>
		<div
			class=" flex w-10/12 flex-row flex-nowrap items-center overflow-hidden rounded-t-3xl border-t border-neutral-200 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
		>
			<div class="flex w-1/2">
				<button
					class={`flex h-14 w-full items-center justify-center border-b-[6px] border-transparent text-lg tracking-wide uppercase sm:text-xl
    			${shared.activePanelMobile === "bill" ? "!border-le-gris-dispositif-dark text-le-gris-dispositif-dark font- bg-blue-100 font-bold" : ""}
    			${shared.activePanelMobile === "law" ? "bg-blue-50 text-gray-500 hover:border-blue-950 hover:bg-blue-100 hover:font-bold hover:text-blue-950" : ""}
  				`}
					onclick={() => (shared.activePanelMobile = "bill")}
				>
					Projet de loi
				</button>
			</div>
			<div class="flex w-1/2">
				<button
					class={`flex h-14 w-full items-center justify-center border-b-[6px] border-transparent text-lg tracking-wide text-black uppercase sm:text-xl
					${shared.activePanelMobile === "law" ? "!border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-100 text-gray-600  hover:bg-white hover:font-bold" : ""}
				`}
					onclick={() => (shared.activePanelMobile = "law")}
				>
					Loi
				</button>
			</div>
		</div>

		<a
			class="flex w-1/12 cursor-pointer justify-center overflow-hidden rounded-lg px-4 py-3 text-gray-500 uppercase hover:text-gray-700 focus:outline-none active:text-gray-800"
			href="/#caracteristiques-simulateur"
			aria-label="Info"
		>
			<iconify-icon
				class="mr-1 align-[-0.2rem] text-2xl"
				icon="ri-information-2-fill"
			></iconify-icon>
		</a>
	</div>
{/if}
