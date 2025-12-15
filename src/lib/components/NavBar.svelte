<script lang="ts">
	import { page } from "$app/state"
	import { shared } from "$lib/shared.svelte"
</script>

{#if !shared.isMobilePhone}
	<div
		class="bg-le-gris-dispositif-dark fixed bottom-8 flex h-16 w-full flex-row flex-nowrap items-center overflow-hidden py-5 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
	>
		<!-- Bloc gauche pour le logo AN  -->

		<div class="absolute bottom-2 left-3">
			<img
				class="ml-2 h-14 items-start self-start pb-2"
				src="/logo-assemblee-nationale-blanc-blanc.png"
				alt="Logo de l'Assemblée nationale"
			/>
		</div>

		<div class="flex-1">
			<button
				class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showBillDesktop
					? 'text-le-gris-dispositif-dark border-le-gris-dispositif-dark bg-white font-bold  hover:border-blue-950 hover:text-blue-950'
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

		<div class="flex-1">
			<button
				class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showLawDesktop
					? 'text-le-gris-dispositif-dark border-le-gris-dispositif-dark bg-white font-bold  hover:border-blue-950 hover:text-blue-950'
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
		</div>

		{#if page.url.searchParams.get("citant")}
			<div class="flex-1">
				<button
					class="
    cursor-pointer rounded-full border-2 px-4 py-1 text-xl tracking-wide uppercase transition-colors duration-150
    {shared.showCitingDesktop
						? 'text-le-gris-dispositif-dark border-le-gris-dispositif-dark bg-white font-bold  hover:border-blue-950 hover:text-blue-950'
						: 'border-neutral-500 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'}"
					onclick={() => {
						shared.showCitingDesktop = !shared.showCitingDesktop
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
			</div>
		{/if}
	</div>
	<div class="absolute right-3 bottom-9.5">
		<a
			class="border-le-gris-dispositif-dark flex cursor-pointer overflow-hidden border-t-4 px-4 py-1.5 text-center text-sm text-neutral-200 uppercase hover:border-neutral-200"
			href="/"
			><span>
				<iconify-icon
					class="mr-1 align-[-0.4rem] text-xl"
					icon="ri-information-2-fill"
				></iconify-icon>Accueil<br />
				<span class="tracking-wider">Légiscope</span>
			</span></a
		>
	</div>
{:else}
	<div
		class="bg-le-gris-dispositif-dark fixed bottom-8 flex w-full justify-between"
	>
		<!-- Bloc gauche pour le logo AN  -->

		<div class="flex h-12 w-1/12 items-center pt-2 pl-2.5">
			<div>
				<img
					class="w-10"
					src="/logo-assemblee-nationale-blanc-blanc.png"
					alt="Logo de l'Assemblée nationale"
				/>
			</div>
		</div>

		<div
			class="mt-2 flex h-12 w-9/12 flex-row flex-nowrap items-center overflow-hidden rounded-t-3xl border-t border-neutral-200 text-center shadow-[0px_-5px_5px_-5px_rgba(0,0,0,0.25)]"
		>
			<div class="flex h-full flex-1">
				<button
					class={`flex w-full items-center justify-center border-b-[6px] border-transparent text-base tracking-wide uppercase sm:text-xl md:text-lg
    			${shared.activePanelMobile === "bill" ? "!border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-white font-bold" : ""}
    			${shared.activePanelMobile === "law" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "citing" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}
  				`}
					onclick={() => (shared.activePanelMobile = "bill")}
				>
					Projet de loi
				</button>
			</div>
			<div class="flex h-full flex-1">
				<button
					class={`flex w-full items-center justify-center border-b-[6px] border-transparent text-base tracking-wide text-black uppercase sm:text-xl md:text-lg
					${shared.activePanelMobile === "law" ? "!border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "citing" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}
				`}
					onclick={() => (shared.activePanelMobile = "law")}
				>
					Loi
				</button>
			</div>
			<div class="flex h-full flex-1">
				<button
					class={`flex w-full items-center justify-center border-b-[6px] border-transparent text-base tracking-wide text-black uppercase sm:text-xl md:text-lg
					${shared.activePanelMobile === "citing" ? "!border-le-gris-dispositif-dark text-le-gris-dispositif-dark bg-white font-bold" : ""}
					${shared.activePanelMobile === "law" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}
					${shared.activePanelMobile === "bill" ? "hover:!border-le-gris-dispositif hover:text-le-gris-dispositif bg-neutral-300 text-gray-600  hover:bg-white hover:font-bold" : ""}

				`}
					onclick={() => (shared.activePanelMobile = "citing")}
				>
					Citation
				</button>
			</div>
		</div>

		<a
			class="flex w-1/12 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-white uppercase hover:text-gray-200 focus:outline-none active:text-gray-800"
			href="/"
			aria-label="Accueil"
		>
			<iconify-icon
				class="mr-2 align-[-0.2rem] text-2xl"
				icon="ri-information-2-fill"
			></iconify-icon>
		</a>
	</div>
{/if}
<div
	class="fixed bottom-0 flex h-8 w-full flex-row flex-nowrap items-center justify-center overflow-hidden border-t-2 border-t-black bg-amber-200 text-center"
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
