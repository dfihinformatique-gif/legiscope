<script lang="ts">
	import { goto } from "$app/navigation"
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import { shared } from "$lib/shared.svelte"
	let isCitantInUrl = $derived(
		page.url.searchParams.get("citant") ? true : false,
	)
	let isSummaryInUrl = $derived(
		page.url.searchParams.get("summary") ? true : false,
	)
</script>

{#if !shared.isMobilePhone}
	<nav
		aria-label="Navigation principale"
		class="relative z-60 flex h-12 w-full flex-row flex-nowrap items-center justify-center bg-neutral-300 text-center 2xl:h-14"
	>
		<div
			class={shared.showBillDesktop
				? "flex-1"
				: "absolute top-1 left-0 z-60 ml-4 2xl:top-2"}
		>
			<button
				class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showBillDesktop
					? 'text-le-gris-dispositif-dark border-le-gris-dispositif-dark hover:border-le-gris-dispositif-ultradark hover:text-le-gris-dispositif-ultradark  bg-white font-bold'
					: 'border-neutral-500 bg-neutral-50  text-neutral-700 hover:bg-neutral-100'}
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

		<div
			class={shared.showLawDesktop
				? "relative flex-1 "
				: "absolute top-1 right-6 2xl:top-2"}
		>
			<button
				class="relative z-70 cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showLawDesktop
					? 'text-le-gris-dispositif-dark border-le-gris-dispositif-dark hover:border-le-gris-dispositif-ultradark hover:text-le-gris-dispositif-ultradark  bg-white font-bold'
					: 'border-neutral-500 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'}"
				onclick={() => {
					shared.showLawDesktop = !shared.showLawDesktop
					if (
						!shared.showBillDesktop &&
						!shared.showLawDesktop &&
						!shared.showCitingDesktop
					) {
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
			{#if (isCitantInUrl || isSummaryInUrl) && shared.showLawDesktop}
				<div
					class="absolute top-0 right-0 z-30 h-full w-1/2 border-y-2 py-0.5
						{shared.showCitingDesktop || shared.showSummaryDesktop
						? ' border-white bg-white'
						: 'border-neutral mr-10 bg-neutral-200'}"
				></div>
			{/if}
		</div>

		{#if isCitantInUrl && shared.showLawDesktop}
			<div
				class={shared.showCitingDesktop
					? "relative flex-1"
					: "absolute top-1 right-0 mr-4 2xl:top-2"}
			>
				<button
					class="relative z-40
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl font-normal tracking-wide uppercase transition-colors duration-150
    {shared.showCitingDesktop
						? 'text-le-gris-dispositif-dark border-white  bg-white hover:bg-neutral-50 hover:text-neutral-600'
						: ' border-neutral-200 bg-neutral-200 text-neutral-700 hover:border-white hover:bg-white hover:text-neutral-900'}"
					onclick={() => {
						shared.showCitingDesktop = !shared.showCitingDesktop
						if (shared.showCitingDesktop) {
							shared.showSummaryDesktop = false
						}
						if (
							!shared.showBillDesktop &&
							!shared.showLawDesktop &&
							!shared.showCitingDesktop
						) {
							shared.showBillDesktop = true
						}
					}}
				>
					<iconify-icon
						class="mr-1 align-[-0.3rem] text-2xl"
						icon={shared.showCitingDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
					></iconify-icon>

					Citation
				</button>
				<div
					class="absolute top-0 left-0 z-30 h-full w-1/2 border-y-2 py-0.5
						{shared.showCitingDesktop
						? ' border-white  bg-white '
						: 'border-neutral bg-neutral-200'}"
				></div>
			</div>
		{/if}

		{#if isSummaryInUrl && shared.showLawDesktop}
			<div
				class={shared.showSummaryDesktop
					? "relative flex-1"
					: "absolute top-1 right-0 mr-4 2xl:top-2"}
			>
				<button
					class="relative z-40
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl font-normal tracking-wide uppercase transition-colors duration-150
		{shared.showSummaryDesktop
						? 'text-le-gris-dispositif-dark border-white  bg-white hover:bg-neutral-50 hover:text-neutral-600'
						: ' border-neutral-200 bg-neutral-200 text-neutral-700 hover:border-white hover:bg-white hover:text-neutral-900'}"
					onclick={() => {
						shared.showSummaryDesktop = !shared.showSummaryDesktop
						if (shared.showSummaryDesktop) {
							shared.showCitingDesktop = false
						}
						if (
							!shared.showBillDesktop &&
							!shared.showLawDesktop &&
							!shared.showCitingDesktop &&
							!shared.showSummaryDesktop
						) {
							shared.showBillDesktop = true
						}
					}}
				>
					<iconify-icon
						class="mr-1 align-[-0.3rem] text-2xl"
						icon={shared.showSummaryDesktop ? "ri:eye-fill" : "ri:eye-off-line"}
					></iconify-icon>

					Sommaire
				</button>
				<div
					class="absolute top-0 left-0 z-30 h-full w-1/2 border-y-2 py-0.5
						{shared.showSummaryDesktop
						? ' border-white  bg-white '
						: 'border-neutral bg-neutral-200'}"
				></div>
			</div>
		{/if}
	</nav>
{:else}
	<nav class="fixed bottom-6 z-60 flex w-full justify-between">
		<div
			class="mx-2 mt-2 flex h-14 w-full flex-row flex-nowrap items-center overflow-hidden rounded-t-3xl border-t border-neutral-200 bg-white text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
		>
			<div class="flex h-full flex-1">
				<button
					class={`flex w-full cursor-pointer items-center justify-center border-b-[6px] border-transparent text-base tracking-wide uppercase sm:text-xl md:text-lg
    			${shared.activePanelMobile === "bill" ? "border-le-gris-dispositif-dark! text-le-gris-dispositif-dark bg-white font-bold" : ""}
    			${shared.activePanelMobile === "law" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "citing" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
  				`}
					onclick={() => (shared.activePanelMobile = "bill")}
				>
					Projet de loi
				</button>
			</div>
			<div class="flex h-full flex-1">
				<button
					class={`flex w-full cursor-pointer items-center justify-center border-b-[6px] border-transparent text-base tracking-wide text-black uppercase sm:text-xl md:text-lg
					${shared.activePanelMobile === "law" ? "border-le-gris-dispositif-dark! text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "citing" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
				`}
					onclick={() => (shared.activePanelMobile = "law")}
				>
					Loi
				</button>
			</div>
			{#if !isSummaryInUrl && isCitantInUrl}
				<div class="flex h-full flex-1">
					<button
						class={`flex w-full cursor-pointer items-center justify-center border-b-[6px] border-transparent text-base tracking-wide text-black uppercase sm:text-xl md:text-lg
					${shared.activePanelMobile === "citing" ? "border-le-gris-dispositif-dark! text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "law" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}

				`}
						onclick={() => {
							shared.activePanelMobile = "citing"
							const url = new URL(page.url)
							url.searchParams.delete("summary")
							goto(resolve(`${url.pathname}${url.search}` as Pathname & {}), {
								replaceState: true,
								noScroll: true,
							})
						}}
					>
						Citation
					</button>
				</div>
			{/if}
			{#if isSummaryInUrl}
				<div class="flex h-full flex-1">
					<button
						class={`flex w-full cursor-pointer items-center justify-center border-b-[6px] border-transparent text-base tracking-wide text-black uppercase sm:text-xl md:text-lg
					${shared.activePanelMobile === "summary" ? "border-le-gris-dispositif-dark! text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "law" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:border-le-gris-dispositif! hover:text-le-gris-dispositif bg-neutral-200 text-gray-600  hover:bg-white hover:font-bold" : ""}

				`}
						onclick={() => {
							shared.activePanelMobile = "summary"
							const url = new URL(page.url)
							url.searchParams.delete("citant")
							goto(resolve(`${url.pathname}${url.search}` as Pathname & {}), {
								replaceState: true,
								noScroll: true,
							})
						}}
					>
						Sommaire
					</button>
				</div>
			{/if}
		</div>
	</nav>
{/if}
<div
	class="z-60 flex h-6 w-full flex-row flex-nowrap items-center justify-center overflow-hidden border-t-2 border-t-black bg-amber-200 text-center"
>
	<p class="pb-1 pl-5 text-sm">
		<span class="hidden md:inline-flex"
			>Ce produit est en développement :
		</span>
		<a
			href="https://limesurvey.leximpact.dev/index.php/767415?lang=fr"
			target="_blank"
			class="lx-link-text"
			>💬 Donnez-nous votre avis<iconify-icon
				class="ml-0.5 align-[-0.15rem] text-sm"
				icon="ri-external-link-line"
			></iconify-icon>
		</a>
	</p>
</div>
