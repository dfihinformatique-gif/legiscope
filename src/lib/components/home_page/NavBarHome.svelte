<script lang="ts">
	import { resolve } from "$app/paths"
	import { DropdownMenu } from "bits-ui"

	let isAccueilMobileMenuDropdownOpen = $state(false)
	let isAccueilDesktopDropdownOpen = $state(false)
</script>

<header class="relative z-60 w-full">
	<div
		class="bg-le-gris-dispositif-dark mx-auto px-2 shadow-md md:h-12 md:px-3 2xl:h-14"
	>
		<!-- UI DESKTOP -->
		<div class="hidden h-full justify-between md:flex">
			<!-- Bloc gauche -->
			<div class="flex h-full basis-1/3 items-center gap-2 xl:gap-5">
				<img
					class="ml-2 self-start md:h-11 2xl:h-12"
					src="/logo-assemblee-nationale-blanc-blanc.png"
					alt="Logo de l'Assemblée nationale"
				/>
				<nav aria-label="Navigation globale pour retourner à l'accueil">
					<!-- Accueil Dropdown -->
					<DropdownMenu.Root bind:open={isAccueilDesktopDropdownOpen}>
						<DropdownMenu.Trigger
							class="z-50 cursor-pointer rounded-lg text-sm text-white uppercase hover:bg-blue-950 focus:outline-none active:bg-blue-900 "
						>
							<div
								class="flex items-center gap-1.5 rounded-lg py-2 pr-3 pl-2 lg:pl-4"
								class:bg-blue-950={isAccueilDesktopDropdownOpen}
							>
								<span class="text-sm tracking-widest">Accueil</span>

								<iconify-icon
									class="text-2xl transition-transform"
									class:rotate-180={isAccueilDesktopDropdownOpen}
									icon="ri:arrow-down-s-line"
								></iconify-icon>
							</div>
						</DropdownMenu.Trigger>

						<DropdownMenu.Content
							preventScroll={false}
							class="mt-2 rounded bg-white text-black shadow-xl ring-1 ring-black focus:outline-none"
						>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center text-base font-bold tracking-wider uppercase hover:bg-gray-100"
										href={resolve("/")}
									>
										Accueil Légiscope
									</a>
								{/snippet}
							</DropdownMenu.Item>

							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center hover:bg-gray-100"
										href="https://leximpact.an.fr/"
										target="_blank"
									>
										<iconify-icon class="mr-1 text-lg" icon="ri:home-2-line"
										></iconify-icon>
										LexImpact
										<iconify-icon class="text-xl" icon="ri:arrow-right-up-line"
										></iconify-icon>
									</a>
								{/snippet}
							</DropdownMenu.Item>

							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center hover:bg-gray-100"
										href="https://www.assemblee-nationale.fr/"
										target="_blank"
									>
										<iconify-icon class="mr-1 text-lg" icon="ri:home-2-line"
										></iconify-icon>
										Assemblée nationale
										<iconify-icon class="text-xl" icon="ri:arrow-right-up-line"
										></iconify-icon>
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</nav>
			</div>

			<!-- Centre -->
			<div class="flex h-full items-center text-white uppercase">
				<div class="flex flex-col items-center p-1">
					<span class="text-sm leading-4 font-light 2xl:text-base"
						>LexImpact</span
					>
					<span class="text-lg leading-5 tracking-wider">
						Légiscope
						<iconify-icon
							class="pl-0.5 align-[-0.18em]"
							icon="ri:book-marked-fill"
							aria-hidden="true"
						></iconify-icon>
					</span>
				</div>
			</div>

			<!-- Droite -->
			<div
				class="flex basis-1/3 items-center justify-end gap-2 pr-2 xl:gap-5"
			></div>
		</div>

		<!-- UI MOBILE -->
		<div class="flex flex-col md:hidden">
			<div class="flex h-12 items-center justify-between">
				<img
					class="h-12 self-start px-2 pb-1"
					src="/logo-assemblee-nationale-blanc-blanc.png"
					alt="Logo de l'Assemblée nationale"
				/>

				<div class="flex flex-col items-center p-1 text-white uppercase">
					<span class="text-sm leading-4 font-light">LexImpact</span>
					<span class="text-lg leading-5">
						Légiscope
						<iconify-icon
							class="pl-0.5 align-[-0.18em]"
							icon="ri:book-marked-fill"
							aria-hidden="true"
						></iconify-icon>
					</span>
				</div>
				<nav aria-label="Navigation principale">
					<DropdownMenu.Root bind:open={isAccueilMobileMenuDropdownOpen}>
						<DropdownMenu.Trigger
							class="rounded-lg p-2 text-white hover:bg-gray-400/20 focus:outline-none active:bg-gray-400/40"
						>
							<iconify-icon class="text-2xl" icon="ri-menu-line"></iconify-icon>
						</DropdownMenu.Trigger>

						<DropdownMenu.Content
							preventScroll={false}
							class="z-50  w-screen rounded bg-white text-center text-black shadow-xl ring-1 ring-black focus:outline-none"
						>
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center text-base font-bold tracking-wider uppercase hover:bg-gray-100"
										href={resolve("/")}
									>
										Accueil Légiscope
									</a>
								{/snippet}
							</DropdownMenu.Item>

							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center hover:bg-gray-100"
										href="https://leximpact.an.fr/"
										target="_blank"
									>
										<iconify-icon class="mr-1 text-lg" icon="ri:home-2-line"
										></iconify-icon>
										LexImpact
										<iconify-icon class="text-xl" icon="ri:arrow-right-up-line"
										></iconify-icon>
									</a>
								{/snippet}
							</DropdownMenu.Item>

							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										{...props}
										class="block border-b px-4 py-3 text-center hover:bg-gray-100"
										href="https://www.assemblee-nationale.fr/"
										target="_blank"
									>
										<iconify-icon class="mr-1 text-lg" icon="ri:home-2-line"
										></iconify-icon>
										Assemblée nationale
										<iconify-icon class="text-xl" icon="ri:arrow-right-up-line"
										></iconify-icon>
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</nav>
			</div>
		</div>
	</div>
</header>
