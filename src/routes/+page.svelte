<script lang="ts">
	import AnchorTitle from "$lib/components/home_page/AnchorTitle.svelte"
</script>

<section
	class="fond relative h-[70vh] py-10 before:absolute before:inset-x-0 before:top-0 before:h-[50vh] before:bg-gradient-to-b before:from-[#dbeafe] before:to-transparent"
>
	<div
		class="relative z-10 flex h-full flex-col items-center justify-evenly text-base md:text-lg 2xl:text-2xl"
	>
		<div class="mx-3 flex flex-col gap-4 md:mx-5">
			<div>
				<h1
					class="mx-10 max-w-screen text-center font-serif text-xl leading-snug sm:text-2xl md:my-0 md:text-3xl 2xl:text-4xl"
				>
					Consulter un projet de loi&nbsp;:
				</h1>
				<div class="flex justify-center">
					<a
						class="mt-5 flex items-center gap-2 rounded-md border-2 border-white bg-white px-5 py-2 font-sans text-lg font-bold tracking-[0.085em] text-black uppercase shadow-lg hover:border-black hover:bg-neutral-50 active:bg-neutral-200"
						href="/pjl/PRJLANR5L17B0324
"
						title="Vers le projet de loi interactif"
					>
						Projet de loi de finances pour 2026<iconify-icon
							class="ml-2 align-[-0.4rem] text-2xl"
							icon="ri-arrow-right-line"
						></iconify-icon>
					</a>
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
</section>

<style lang="postcss">
	.fond {
		background-color: #ffffff;
		/* Polka dots - Heropatterns.com échelle réduite */
		background-image: url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ded500' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
	}
</style>
