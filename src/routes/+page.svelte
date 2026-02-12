<script lang="ts">
	import { resolve } from "$app/paths"
	import AnchorTitle from "$lib/components/home_page/AnchorTitle.svelte"

	let isLoadingPjl = $state(false)

	let openTexteInitialplf2026 = $state(false)
	let openTexte138plf2026 = $state(false)
	let openTexte2247plf2026 = $state(true)
	let openTexte308plf2026 = $state(true)
	let openTexteInitialplfss2026 = $state(false)
	let openTexte122plfss2026 = $state(false)
	let openTexte2141plfss2026 = $state(false)
	let openTexte193plfss2026 = $state(false)
	let openTexte188plfss2026 = $state(true)
	let openTexteInitialpjlfraude = $state(false)
	let openTextecommissionSenatpjlfraude = $state(false)
	let openTextecommissionAssembleepjlfraude = $state(true)
</script>

<!--Retrait de la hauteur maximale h-[70vh] en attendant de mettre une barre de recherche -->
<section
	class="fond relative py-10 before:absolute before:inset-x-0 before:top-0 before:h-[50vh] before:bg-linear-to-b before:from-[#dbeafe] before:to-transparent"
>
	<div
		class="relative z-10 my-16 flex h-full flex-col items-center justify-evenly text-2xl md:my-24"
	>
		<div class="flex w-full max-w-5xl flex-col gap-4 px-3 md:px-5">
			<div class="mx-w-md md:min-w-md">
				<h1
					class="mx-10 max-w-screen text-center font-serif text-4xl leading-snug"
				>
					Consulter un projet de loi&nbsp;:
				</h1>
				{#if isLoadingPjl}
					<div
						class="fond fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
					>
						<div
							class="flex animate-pulse justify-center text-center text-lg text-neutral-800 italic"
						>
							Chargement du projet de loi en cours, <br />Création du réseau de
							liens vers la loi et les simulateurs...
						</div>
						<iconify-icon
							class="mt-4 animate-spin text-2xl text-neutral-800"
							icon="ri:guide-fill"
						>
						</iconify-icon>
					</div>
				{/if}

				<!--PLF 2026-->
				<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
					<h2 class="mb-3 font-serif font-medium">
						Projet de loi de finances 2026 :
					</h2>

					<!--texte initial PLF déposé à l'AN-->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexteInitialplf2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() =>
								(openTexteInitialplf2026 = !openTexteInitialplf2026)}
							aria-expanded={openTexteInitialplf2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexteInitialplf2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17B1906")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte initial n°1906
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon></a
									>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										14/10/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>
						{#if openTexteInitialplf2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Initié par le Gouvernement</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 14/10/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par l'Assemblée
										nationale :
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>
										<!--1ère lecture en commission-->
										<li>
											en séance publique - <span
												class="rounded-sm border border-red-200 bg-red-100 p-0.5 text-xs font-normal text-red-900"
												>Texte rejeté</span
											>
											<!--1ère lecture en séance publique-->
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
					<!--Texte initial PLF rejeté par l'AN / déposé au Sénat-->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte138plf2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte138plf2026 = !openTexte138plf2026)}
							aria-expanded={openTexte138plf2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexte138plf2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/pjl25-138")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°138
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon></a
									>
								</div>

								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										24/11/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>
						{#if openTexte138plf2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-600">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Initié par le Gouvernement
										<span class="font-light italic"
											>(Identique au texte initial suite au rejet en première
											lecture par l'Assemblée nationale)</span
										></span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 24/11/2025 au Sénat
									</span>

									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par le Sénat
										:
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>
										<li>
											en séance publique -
											<span
												class="rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs font-normal text-green-900"
												>Texte adopté</span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
					<!--CMP - désaccord-->
					<div class="flex items-center">
						<div
							class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="font-serif text-sm text-neutral-700 italic">
								<span class="mr-2 ml-3 text-xs">●</span>Commission mixte
								paritaire :
								<iconify-icon
									class=" align-[-0.25em] text-lg"
									icon="ri:close-line"
								></iconify-icon>Désaccord
							</div>

							<span
								class="mt-1 mr-1.5 w-48 rounded-sm border bg-amber-50 px-0.5 text-xs"
								>15/12/25・<iconify-icon
									class="mr-1 align-[-0.18em] text-base"
									icon="ri:p2p-fill"
								></iconify-icon><span class="tracking-wider">CMP</span>
							</span>
						</div>
					</div>
					<!--texte 2247 PLF-->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte2247plf2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte2247plf2026 = !openTexte2247plf2026)}
							aria-expanded={openTexte2247plf2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										icon="ri-arrow-right-s-line"
										class:rotate-90={openTexte2247plf2026}
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17B2247")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°2247
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon></a
									>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										15/12/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>
						{#if openTexte2247plf2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-600">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par le Sénat</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 15/12/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en nouvelle lecture</i> par l'Assemblée
										nationale :
									</span>

									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>
										<li>
											en séance publique - <span
												class="rounded-sm border border-neutral-200 bg-neutral-100 p-0.5 text-xs font-normal text-neutral-900"
												><a
													class="lx-link-simple font-serif text-base"
													href={resolve("/pjl/DECLANR5L17B2247-N0")}
													onclick={() => (isLoadingPjl = true)}
													title="Vers le projet de loi"
												>
													<iconify-icon
														class="mr-1 align-[-0.18em]"
														icon="ri:book-marked-fill"
													>
													</iconify-icon>Texte sur lequel le Gouvernement engage
													sa responsabilité (article 49.3 de la Constitution)
													<iconify-icon
														class=" align-[-0.3rem] text-xl"
														icon="ri-arrow-right-line"
													></iconify-icon>
												</a></span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
					<!--texte 308 PLF-->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte308plf2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte308plf2026 = !openTexte308plf2026)}
							aria-expanded={openTexte308plf2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										icon="ri-arrow-right-s-line"
										class:rotate-90={openTexte308plf2026}
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										title="Vers le projet de loi"
										aria-disabled="true"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°308
										<i>(en attente de publication)</i>
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon></a
									>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										27/01/26・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>
						{#if openTexte308plf2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-600">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par l'Assemblée nationale</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 27/01/2026 au Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en nouvelle lecture</i> par le Sénat
										:
									</span>

									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
				</div>
				<!--PLFSS 2026-->
				<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
					<h2 class="mb-3 font-serif font-medium">
						Projet de loi de financement de la sécurité sociale 2026 :
					</h2>

					<!-- Texte initial PLFSS -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexteInitialplfss2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() =>
								(openTexteInitialplfss2026 = !openTexteInitialplfss2026)}
							aria-expanded={openTexteInitialplfss2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexteInitialplfss2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17B1907")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										></iconify-icon>Texte initial n°1907
										<iconify-icon
											class="align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>

								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										14/10/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexteInitialplfss2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Initié par le Gouvernement</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 14/10/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par l'Assemblée
										nationale :
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>

										<li>
											en séance publique <span
												class="rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs font-normal text-green-900"
												>Texte adopté</span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>

					<!-- Texte n°122 Sénat -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte122plfss2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte122plfss2026 = !openTexte122plfss2026)}
							aria-expanded={openTexte122plfss2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexte122plfss2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/pjl25-122")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°122
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										13/11/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexte122plfss2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par l'Assemblée nationale</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 13/11/2025 au Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i>par le
										Sénat :
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>

										<li>
											en séance publique <span
												class="text-green-90 rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs font-normal"
												>Texte adopté</span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>

					<!--CMP - désaccord-->
					<div class="flex items-center">
						<div
							class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="font-serif text-sm text-neutral-700 italic">
								<span class="mr-2 ml-3 text-xs">●</span>Commission mixte
								paritaire :
								<iconify-icon
									class=" align-[-0.25em] text-lg"
									icon="ri:close-line"
								></iconify-icon>Désaccord
							</div>

							<span
								class="mt-1 mr-1.5 w-48 rounded-sm border bg-amber-50 px-0.5 text-xs"
								>26/11/25・<iconify-icon
									class="mr-1 align-[-0.18em] text-base"
									icon="ri:p2p-fill"
								></iconify-icon><span class="tracking-wider">CMP</span>
							</span>
						</div>
					</div>

					<!-- Texte n°2141 Assemblée -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte2141plfss2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte2141plfss2026 = !openTexte2141plfss2026)}
							aria-expanded={openTexte2141plfss2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexte2141plfss2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17B2141")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°2141
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>

								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										26/11/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexte2141plfss2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par le Sénat</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 26/11/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en nouvelle lecture</i> par l'Assemblée
										nationale :
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>

										<li>
											en séance publique <span
												class="rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs font-normal text-green-900"
												>Texte adopté</span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
					<!-- Texte n°193 Sénat -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte193plfss2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte193plfss2026 = !openTexte193plfss2026)}
							aria-expanded={openTexte193plfss2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexte193plfss2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/pjl25-193")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°193
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>

								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										09/12/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexte193plfss2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par l'Assemblée nationale</span
									>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 09/12/2025 au Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en nouvelle lecture</i> par le Sénat
										:
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>

										<li>
											en séance publique <span
												class="rounded-sm border border-red-200 bg-red-100 p-0.5 text-xs font-medium text-red-900"
												>Texte rejeté</span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>

					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexte188plfss2026}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() => (openTexte188plfss2026 = !openTexte188plfss2026)}
							aria-expanded={openTexte188plfss2026}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexte188plfss2026}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17BTA0188")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°188
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										12/12/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Assemblée</span
										>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon><iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexte188plfss2026}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 12/12/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en lecture définitive</i> par l'Assemblée
										nationale :
									</span>
									<ul class="ml-4 list-inside list-disc font-light">
										<li>en commission</li>

										<li>
											en séance publique <span
												class="rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs text-green-900"
												><a
													class="lx-link-simple font-serif text-base"
													href={resolve("/pjl/PRJLANR5L17BTA0199")}
													onclick={() => (isLoadingPjl = true)}
													title="Vers le projet de loi"
												>
													<iconify-icon
														class="mr-1 align-[-0.18em]"
														icon="ri:book-marked-fill"
													>
													</iconify-icon>Texte adopté n°199
													<iconify-icon
														class=" align-[-0.3rem] text-xl"
														icon="ri-arrow-right-line"
													></iconify-icon>
												</a></span
											>
										</li>
									</ul>
								</div>
							</div>
						{/if}
					</div>
				</div>
				<!--PROJET DE LOI LUTTE FRAUDE-->
				<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
					<h2 class="mb-3 font-serif font-medium">
						Projet de loi relatif à la lutte contre les fraudes sociales et
						fiscales :
					</h2>

					<!-- Texte initial PJL -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTexteInitialpjlfraude}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() =>
								(openTexteInitialpjlfraude = !openTexteInitialpjlfraude)}
							aria-expanded={openTexteInitialpjlfraude}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTexteInitialpjlfraude}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/pjl25-024")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°24
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										14/10/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTexteInitialpjlfraude}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Initié par le Gouvernement
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 14/10/2025 au Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par le
										Sénat<span class="font-light"
											>, en commission des affaires sociales saisie au fond</span
										>
									</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Texte de la commission Sénat -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTextecommissionSenatpjlfraude}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() =>
								(openTextecommissionSenatpjlfraude =
									!openTextecommissionSenatpjlfraude)}
							aria-expanded={openTextecommissionSenatpjlfraude}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTextecommissionSenatpjlfraude}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/pjl25-112")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°112
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>
								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										05/11/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="streamline:rainbow-solid"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTextecommissionSenatpjlfraude}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par le Sénat, en commission des
										affaires sociales
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 05/11/2025 au Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par le
										Sénat<span class="font-light">, en séance publique</span>
										<span
											class="rounded-sm border border-green-200 bg-green-100 p-0.5 text-xs font-medium text-green-900"
											>Texte adopté</span
										>
									</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Texte Assemblée nationale -->
					<div
						class="my-2 flex flex-col justify-start rounded-sm border p-1 text-base"
						class:bg-neutral-50={openTextecommissionAssembleepjlfraude}
					>
						<button
							class="flex cursor-pointer items-center gap-1 text-left"
							onclick={() =>
								(openTextecommissionAssembleepjlfraude =
									!openTextecommissionAssembleepjlfraude)}
							aria-expanded={openTextecommissionAssembleepjlfraude}
						>
							<div
								class="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<iconify-icon
										class="ml-0.5 align-[-0.3rem] text-xl"
										class:rotate-90={openTextecommissionAssembleepjlfraude}
										icon="ri-arrow-right-s-line"
									></iconify-icon>
									<a
										class="lx-link-simple font-serif text-lg"
										href={resolve("/pjl/PRJLANR5L17B2115")}
										onclick={() => (isLoadingPjl = true)}
										title="Vers le projet de loi"
									>
										<iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:book-marked-fill"
										>
										</iconify-icon>Texte n°2115
										<iconify-icon
											class=" align-[-0.3rem] text-xl"
											icon="ri-arrow-right-line"
										></iconify-icon>
									</a>
								</div>

								<div
									class="mt-1 flex w-48 items-center justify-between self-end rounded-sm border bg-amber-50 px-0.5 text-xs sm:self-auto"
								>
									<div>
										18/11/25・<iconify-icon
											class="mr-1 align-[-0.18em] text-base"
											icon="ri:inbox-archive-line"
										></iconify-icon><span class="tracking-wider">Sénat</span>
									</div>
									<div>
										<iconify-icon
											class="align-[-0.18em] text-base"
											icon="tabler:users-group"
										></iconify-icon>
									</div>
								</div>
							</div>
						</button>

						{#if openTextecommissionAssembleepjlfraude}
							<div class="mt-2 mb-4 ml-3 border-l-2 border-neutral-300 pl-3">
								<div class="ml-1 flex flex-col text-neutral-700">
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:quill-pen-line"
										></iconify-icon>Modifié par le Sénat
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 align-[-0.18em]"
											icon="ri:inbox-archive-line"
										></iconify-icon>Déposé le 18/11/2025 à l'Assemblée nationale
									</span>
									<span class=""
										><iconify-icon
											class="mr-1 -scale-x-100 align-[-0.18em]"
											icon="ri:search-line"
										></iconify-icon>Examiné <i>en première lecture</i> par
										l'Assemblée nationale<span class="font-light"
											>, en commission des affaires sociales saisie au fond</span
										>
									</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section
	class="grid grid-cols-4 gap-x-12 gap-y-12 bg-[#E3E4D6] px-10 pt-10 pb-20 font-serif text-base md:px-20 lg:px-40 2xl:text-lg"
>
	<AnchorTitle
		id="caracteristiques-simulateur"
		class="col-span-4 max-w-prose justify-self-center text-center font-sans text-2xl font-light"
		tag="h2"
	>
		À propos de cet outil ⬇️
	</AnchorTitle>

	<div class="col-span-4 justify-self-center">
		<p class="font-bold">Sommaire :</p>
		<ul class="list-inside list-disc">
			<li>
				<a class="lx-link-simple" href="#presentation-generale"
					>Présentation générale du Légiscope</a
				>
			</li>
			<li>
				<a class="lx-link-simple" href="#provenance-infos"
					>D'où proviennent les informations ?</a
				>
			</li>
			<li>
				<a class="lx-link-simple" href="#contact"
					>Déclarer une erreur / contacter l'équipe</a
				>
			</li>
		</ul>
	</div>
	<AnchorTitle
		id="presentation-generale"
		class="col-span-4 max-w-prose justify-self-center text-center text-2xl font-bold"
		tag="h3"
	>
		Présentation générale du Légiscope
	</AnchorTitle>
	<div class="col-span-4 max-w-prose justify-self-center text-lg">
		<p>
			Ce site internet est mis en œuvre par la <a
				class="lx-link-text"
				href="https://leximpact.an.fr">cellule LexImpact</a
			> de l'Assemblée nationale. Il permet à la fois de :
		</p>

		<ul class="ml-6 list-inside list-disc">
			<li>
				lire un projet ou une proposition de loi, tout en consultant les textes
				de lois auxquels il fait référence ;
			</li>
			<li>
				accéder rapidement au <a
					class="lx-link-text"
					href="https://socio-fiscal.leximpact.an.fr/accueil"
					>simulateur socio-fiscal</a
				>
				et au
				<a class="lx-link-text" href="https://dotations.leximpact.an.fr/"
					>simulateur des dotations aux communes</a
				> lorsqu'un article entre dans leur périmètre ;
			</li>
			<li>
				obtenir des informations complémentaires sur les paramètres de la loi
				couverts par les simulateurs.
			</li>
		</ul>
		<p class="mt-5">
			Son objectif est de fluidifier la lecture et la compréhension du texte de
			loi ainsi que son évaluation.
		</p>
	</div>

	<AnchorTitle
		id="provenance-infos"
		class="col-span-4 max-w-prose justify-self-center text-center text-2xl font-bold"
		tag="h3"
	>
		D'où proviennent les informations publiées sur ce site ?
	</AnchorTitle>
	<div class="col-span-4 max-w-prose justify-self-center text-lg">
		Tous les textes de lois et les informations lisibles sur ce site sont
		récupérés à la source, auprès des institutions fournisseurs. C'est-à-dire la
		direction de l'information légale et administrative (DILA) <i
			>en charge de Légifrance</i
		>
		et l'Assemblée nationale.

		<br />
		<br />
		<span class="text-le-gris-dispositif-dark font-sans text-xl font-bold"
			>Source des projets de lois (sur fond blanc) :</span
		>
		<br />
		Les projets de loi sont récupérés automatiquement dans l'<a
			class="lx-link-text"
			href="https://data.assemblee-nationale.fr/travaux-parlementaires/dossiers-legislatifs"
			>opendata de l'Assemblée nationale</a
		>
		qui reflète les informations présentes sur le
		<a
			class="lx-link-text"
			href="https://www2.assemblee-nationale.fr/documents/liste/(type)/projets-loi"
			>site de l'Assemblée nationale</a
		>. Les principaux traitements de forme appliqués sont :

		<ul class="ml-6 list-inside list-disc">
			<li>
				ajout de liens (URL) vers la base législative ou vers des ancres dans le
				document ;
			</li>
			<li>
				modifications graphiques pour améliorer la lisibilité dans l'outil.
			</li>
		</ul>

		<br />
		<br />
		<span class="text-le-gris-dispositif-dark font-sans text-xl font-bold"
			>Source des articles de lois (sur fond bleu) :</span
		>
		<br />
		Tous les textes de lois accessibles depuis Légiscope sont issus du projet
		<a
			class="lx-link-text"
			href="https://git.tricoteuses.fr/tricoteuses/a_propos"
			>Tricoteuses - la loi sous git</a
		>, lui-même alimenté plusieurs fois par jour à partir des données publiques
		de la direction des informations légales et administratives (DILA) en charge
		de Légifrance.

		<br />
		<br />
		Tricoteuses est un projet open source, auquel LexImpact contribue techniquement,
		qui permet entre autres
		<span class="font-bold"
			>d'ajouter automatiquement les milliers de liens URL manquants dans les
			articles de loi</span
		>, là où ces derniers référencent un autre article, afin d'établir le réseau
		exhaustif des relations entre les articles. Ce réseau de lien permet à
		l'usager de naviguer d'un texte à l'autre. Si vous détectez un lien cassé ou
		erroné, n'hésitez pas à nous
		<a class="lx-link-text" href="#contact">contacter</a>.

		<br />
		<br />
		<span class="text-le-gris-dispositif-dark font-sans text-xl font-bold"
			>Source des informations sur les paramètres de la loi (taux, plafond...) :</span
		><br />
		Légiscope donne ponctuellement également accès à des informations sur les paramètres
		présents dans le projet ou les textes de loi, telles que l'historique des valeurs
		du paramètre, une description et,
		<b
			>lorsque cela est applicable, un lien vers les simulateurs LexImpact
			permettant d'estimer l'effet d'une modification du paramètre sur cas types
			ou sur le budget</b
		>.

		<br />
		<br />La description ou l'historique des valeurs du paramètre sont issus du
		<a class="lx-link-text" href="https://openfisca.org/fr/"
			>logiciel libre OpenFisca</a
		>. L'Assemblée nationale, via LexImpact, contribue à ce moteur de calcul de
		la législation et l'utilise pour le
		<a class="lx-link-text" href="https://socio-fiscal.leximpact.an.fr/accueil"
			>simulateur socio-fiscal</a
		>
		et le
		<a class="lx-link-text" href="https://dotations.leximpact.an.fr/"
			>simulateur des dotations aux communes</a
		>.
		<br />
	</div>

	<AnchorTitle
		id="contact"
		class="col-span-4 max-w-prose justify-self-center text-center text-2xl font-bold"
		tag="h3"
	>
		Vous avez identifié une incohérence ou un bug ?<br />Vous souhaitez
		contacter l'équipe ?
	</AnchorTitle>
	<div class="col-span-4 max-w-prose justify-self-center text-lg">
		Si vous détectez une incohérence, un lien cassé ou erroné, ou simplement si
		vous avez des suggestions, il vous est possible de contacter l'équipe à
		cette adresse : <a
			class="lx-link-text-le-bleu"
			href="mailto:leximpact@assemblee-nationale.fr"
			>leximpact@assemblee-nationale.fr</a
		>.
	</div>
</section>

<style lang="postcss">
	.fond {
		background-color: #ffffff;
		/* Polka dots - Heropatterns.com échelle réduite */
		background-image: url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ded500' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
	}
</style>
