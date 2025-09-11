<script lang="ts">
	import { DropdownMenu } from "bits-ui"

	let isMobileMenuDropdownOpen = $state(false)
</script>

<nav class="z-50 w-full md:top-0">
	<div
		class="bg-le-gris-dispositif-dark mx-auto px-2 shadow-md md:h-12 md:px-3 2xl:h-14"
	>
		<!-- UI DESKTOP -->
		<div class="hidden h-full justify-between md:flex">
			<!-- Bloc gauche pour le logo AN  -->
			<div
				class="flex h-full basis-1/3 items-center justify-between gap-2 xl:gap-5"
			>
				<div class="flex items-center gap-2">
					<img
						class="ml-2 h-14 items-start self-start pb-2"
						src="/logo-assemblee-nationale-blanc-blanc.png"
						alt="Logo de l'Assemblée nationale"
					/>
				</div>
			</div>

			<!-- Deuxième section pour le logo LexImpat-->
			<div class="flex">
				<div
					class="flex h-full flex-1 flex-col items-center rounded p-1 text-white uppercase"
				>
					<span class="leading-4 font-light">LexImpact</span>
					<span class="text-lg leading-5 tracking-wider"
						>PJL interactif<iconify-icon
							class="pl-0.5 align-[-0.18em]"
							icon="ri:book-marked-fill"
						></iconify-icon></span
					>
				</div>
			</div>

			<!-- Bloc droite pour les commandes avancées-->
			<div class="flex basis-1/3 items-center justify-end gap-2 pr-2 xl:gap-5">
				<!-- Accueil LexImpact -->

				<a
					class="cursor-pointer overflow-hidden rounded-lg px-4 py-3 text-center text-sm text-white uppercase hover:bg-blue-950 focus:outline-none"
					href="https://leximpact.an.fr/"
					target="_blank"
				>
					<iconify-icon
						class="mr-1 align-[-0.2rem] text-lg"
						icon="ri:home-2-line"
					></iconify-icon>Accueil LexImpact
				</a>
			</div>
		</div>

		<!--UI MOBILE-->
		<div class="flex flex-col md:hidden">
			<div class="flex h-12 items-center justify-between">
				<!-- Première section pour le logo AN-->
				<div class="flex flex-1 self-start">
					<!-- logo assemblee nationale -->
					<div class="w-16">
						<img
							class="items-start object-scale-down px-2 pt-0 pb-1"
							src="/logo-assemblee-nationale-blanc-blanc.png"
							alt="Logo de l'Assemblée nationale"
						/>
					</div>
				</div>

				<!-- Deuxième section pour le logo LexImpat-->
				<div class="flex">
					<div
						class="flex h-full flex-1 flex-col items-center rounded p-1 text-white uppercase"
					>
						<span class="leading-4 font-light">LexImpact</span>
						<span class="text-lg leading-5"
							>PJL interactif<iconify-icon
								class="pl-0.5 align-[-0.18em]"
								icon="ri:book-marked-fill"
							></iconify-icon></span
						>
					</div>
				</div>

				<!-- Troisième section pour le bouton menu-->

				<div class="flex flex-1 justify-end gap-3">
					<DropdownMenu.Root bind:open={isMobileMenuDropdownOpen}>
						<DropdownMenu.Trigger
							class="hover:bg-opacity-20 active:bg-opacity-40 mt-0 cursor-pointer overflow-hidden rounded-lg text-sm text-white uppercase hover:bg-gray-400 focus:outline-none active:bg-gray-400"
						>
							<div
								class="py-2 pr-3 pl-4"
								class:bg-gray-400={isMobileMenuDropdownOpen}
								class:bg-opacity-40={isMobileMenuDropdownOpen}
							>
								<iconify-icon
									class="align-[-0.2rem] text-2xl"
									icon="ri-menu-line"
								></iconify-icon>
							</div>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							class="ring-opacity-5 z-50 mt-[0.25rem] w-screen rounded bg-white text-center text-black shadow-xl ring-1 ring-black focus:outline-none"
						>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block cursor-pointer border-b px-4 py-3 hover:bg-gray-100"
										href="https://leximpact.an.fr/"
									>
										<iconify-icon
											class="mr-1 align-[-0.2rem] text-lg"
											icon="ri:home-2-line"
										></iconify-icon>Accueil LexImpact<iconify-icon
											class="align-[-0.25rem] text-xl"
											icon="ri:arrow-right-up-line"
										></iconify-icon>
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		</div>
	</div>
</nav>
