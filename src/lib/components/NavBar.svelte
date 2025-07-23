<script lang="ts">
	import {
		activePanelMobile,
		isMobilePhone,
		showBillDesktop,
		showLawDesktop,
	} from "$lib/navStore"

	import { get } from "svelte/store"

	function toggleBill() {
		showBillDesktop.update((val) => {
			if (val && !get(showLawDesktop)) {
				showLawDesktop.set(true)
				return false
			}
			return !val
		})
	}

	function toggleLaw() {
		showLawDesktop.update((val) => {
			if (val && !get(showBillDesktop)) {
				showBillDesktop.set(true)
				return false
			}
			return !val
		})
	}
</script>

{#if !$isMobilePhone}
	<div
		class="fixed bottom-0 flex w-full flex-row flex-nowrap justify-items-center-safe overflow-hidden bg-neutral-200 py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150"
				class:bg-blue-200={$showBillDesktop}
				class:bg-white={!$showBillDesktop}
				class:font-bold={$showBillDesktop}
				on:click={toggleBill}
			>
				<iconify-icon
					class="mr-1 align-[-0.3rem] text-2xl"
					icon={$showBillDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
				></iconify-icon>

				Projet de loi
			</button>
		</div>
		<div class="basis-1/2">
			<button
				class="cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150"
				class:bg-blue-200={$showLawDesktop}
				class:bg-white={!$showLawDesktop}
				on:click={toggleLaw}
			>
				<iconify-icon
					class="mr-1 align-[-0.3rem] text-2xl"
					icon={$showLawDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
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
				class:!border-black={$activePanelMobile === "bill"}
				class:text-black={$activePanelMobile === "bill"}
				class:font-bold={$activePanelMobile === "bill"}
				class:hover:bg-white={$activePanelMobile === "law"}
				class:!bg-neutral-200={$activePanelMobile === "law"}
				class:hover:font-bold={$activePanelMobile === "law"}
				class:hover:!border-black={$activePanelMobile === "law"}
				on:click={() => activePanelMobile.set("bill")}
			>
				Projet de loi
			</button>
		</div>
		<div class="flex w-1/2">
			<button
				class="flex h-16 w-full items-center justify-center border-b-[4px] border-transparent text-xl tracking-wide text-black uppercase"
				class:!border-black={$activePanelMobile === "law"}
				class:text-black={$activePanelMobile === "law"}
				class:font-bold={$activePanelMobile === "law"}
				class:!bg-neutral-200={$activePanelMobile === "bill"}
				class:hover:bg-white={$activePanelMobile === "bill"}
				class:hover:font-bold={$activePanelMobile === "bill"}
				class:hover:!border-black={$activePanelMobile === "bill"}
				on:click={() => activePanelMobile.set("law")}
			>
				Loi
			</button>
		</div>
	</div>
{/if}
