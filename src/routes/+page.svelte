<script lang="ts">
	import AnchorTitle from "$lib/components/home_page/AnchorTitle.svelte"
	let isLoadingPjl = $state(false)

	let openTexteInitialplf2026 = $state(false)
	let openTexte2247plf2026 = $state(true)
	let openTexteInitialplfss2026 = $state(false)
	let openTexte122plfss2026 = $state(false)
	let openTexte2141plfss2026 = $state(false)
	let openTexte193plfss2026 = $state(true)
	//let openTexte188plfss2026 = $state(false)
	let openTexteInitialpjlfraude = $state(false)
	let openTextecommissionSenatpjlfraude = $state(false)
	let openTextecommissionAssembleepjlfraude = $state(true)
</script>

<!--Retrait de la hauteur maximale h-[70vh] en attendant de mettre une barre de recherche -->
<section
	class="fond relative py-10 before:absolute before:inset-x-0 before:top-0 before:h-[50vh] before:bg-gradient-to-b before:from-[#dbeafe] before:to-transparent"
>
	<div
		class="relative z-10 my-16 flex h-full flex-col items-center justify-evenly text-2xl md:my-24"
	>
		<div class="mx-3 flex flex-col gap-4 md:mx-5">
			<div>
				<h1
					class="mx-10 max-w-screen text-center font-serif text-4xl leading-snug"
				>
					Consulter un projet de loi&nbsp;:
				</h1>
				{#if isLoadingPjl}
					<div class="mt-6 flex h-[70vh] flex-col justify-center">
						<div
							class="flex animate-pulse justify-center text-center text-base italic"
						>
							Chargement du projet de loi en cours, <br />Création du réseau de
							liens vers la loi et les simulateurs...
						</div>
						<iconify-icon
							class="animate-spin align-[-0.2rem] text-2xl text-neutral-800"
							icon="ri:guide-fill"
						>
						</iconify-icon>
					</div>
				{:else}
					<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
						<h2 class="font-serif">Projet de loi de finances 2026 :</h2>
						<div class="flex flex-col justify-start p-1 text-base">
							<!--texte initial PLF-->
							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTexteInitialplf2026 = !openTexteInitialplf2026)}
								aria-expanded={openTexteInitialplf2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									class:rotate-90={openTexteInitialplf2026}
									icon="ri-arrow-right-s-line"
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/PRJLANR5L17B1906"
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
							</button>
							{#if openTexteInitialplf2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class=""
											>déposé à l'Assemblée nationale le 14/10/2025
										</span>
										<span class="">proposé par le Gouvernement</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des finances saisie au fond à
											l'Assemblée nationale</span
										>
										<span
											>examiné en séance en première lecture à l'Assemblée
											nationale - Texte rejeté</span
										>
										<span>examiné en séance en première lecture au Sénat</span>
									</div>
								</div>
							{/if}
						</div>
						<!--texte 2247 PLF-->
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() => (openTexte2247plf2026 = !openTexte2247plf2026)}
								aria-expanded={openTexte2247plf2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTexte2247plf2026}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/PRJLANR5L17B2247"
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
							</button>
							{#if openTexte2247plf2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class=""
											>déposé à l'Assemblée nationale le 14/10/2025
										</span>
										<span class="">adopté par le Sénat</span>
									</div>
									<div class="flex flex-col">
										<span>examiné commission mixte paritaire (CMP)</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
					<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
						<h2 class="font-serif">
							Projet de loi de financement de la sécurité sociale 2026 :
						</h2>
						<div class="flex flex-col justify-start p-1 text-base">
							<!--PLFSS texte initial-->

							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTexteInitialplfss2026 = !openTexteInitialplfss2026)}
								aria-expanded={openTexteInitialplfss2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									class:rotate-90={openTexteInitialplfss2026}
									icon="ri-arrow-right-s-line"
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/PRJLANR5L17B1907"
									onclick={() => (isLoadingPjl = true)}
									title="Vers le projet de loi"
								>
									<iconify-icon
										class="mr-1 align-[-0.18em]"
										icon="ri:book-marked-fill"
									>
									</iconify-icon>Texte initial n°1907
									<iconify-icon
										class=" align-[-0.3rem] text-xl"
										icon="ri-arrow-right-line"
									></iconify-icon></a
								>
							</button>
							{#if openTexteInitialplfss2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class=""
											>déposé à l'Assemblée nationale le 14/10/2025
										</span>
										<span class="">proposé par le Gouvernement</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond à l'Assemblée nationale</span
										>
										<span
											>examiné en séance en première lecture à l'Assemblée
											nationale</span
										>
									</div>
								</div>
							{/if}
						</div>
						<!--PLFSS texte déposé au Sénat 122-->
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() => (openTexte122plfss2026 = !openTexte122plfss2026)}
								aria-expanded={openTexte122plfss2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTexte122plfss2026}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/pjl25-122"
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
									></iconify-icon></a
								>
							</button>
							{#if openTexte122plfss2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé au Sénat le 13/11/2025 </span>
										<!--	<span class="">proposé par le Gouvernement</span>-->
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond du Sénat</span
										>
										<span
											>examiné en séance en première lecture au Sénat - Text
											adopté</span
										>
										<span
											>examiné en commission mixte paritaire (CMP)- Désaccord</span
										>
									</div>
								</div>
							{/if}
						</div>
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTexte2141plfss2026 = !openTexte2141plfss2026)}
								aria-expanded={openTexte2141plfss2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTexte2141plfss2026}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/PRJLANR5L17B2141"
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
									></iconify-icon></a
								>
							</button>
							{#if openTexte2141plfss2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé à l'Assemblée le 26/11/2025 </span>
										<span class="">modifié par le Sénat"</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond à l'Assemblée nationale</span
										>
										<span
											>examiné pour nouvelle lecture en séance à l'Assemblée
											nationale - Text adopté</span
										>
									</div>
								</div>
							{/if}
						</div>
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() => (openTexte193plfss2026 = !openTexte193plfss2026)}
								aria-expanded={openTexte193plfss2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTexte193plfss2026}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/pjl25-193"
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
									></iconify-icon></a
								>
							</button>
							{#if openTexte193plfss2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé au Sénat le 09/12/2025 </span>
										<span class="">adopté par l'Assemblée nationale"</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond à l'Assemblée nationale</span
										>
										<span
											>examiné pour nouvelle lecture en séance à l'Assemblée
											nationale - Text adopté</span
										>
									</div>
								</div>
							{/if}
						</div>
						<!--<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() => (openTexte188plfss2026 = !openTexte188plfss2026)}
								aria-expanded={openTexte188plfss2026}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTexte188plfss2026}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="TODO"
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
									></iconify-icon></a
								>
							</button>
							{#if openTexte188plfss2026}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé XXX</span>
										<span class="">modifié par XXX"</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond à l'Assemblée nationale</span
										>
										<span
											>examiné pour lecture définitive en séance à l'Assemblée
											nationale - Text adopté</span
										>
									</div>
								</div>
							{/if}
						</div>-->
					</div>
					<div class="mt-8 w-full rounded-md bg-white px-4 py-2">
						<h2 class="font-serif">
							Projet de loi relatif à la lutte contre les fraudes sociales et
							fiscales : :
						</h2>
						<div class="flex flex-col justify-start p-1 text-base">
							<!--texte initial PJL-->
							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTexteInitialpjlfraude = !openTexteInitialpjlfraude)}
								aria-expanded={openTexteInitialpjlfraude}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									class:rotate-90={openTexteInitialpjlfraude}
									icon="ri-arrow-right-s-line"
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="pjl/pjl25-024"
									onclick={() => (isLoadingPjl = true)}
									title="Vers le projet de loi"
								>
									<iconify-icon
										class="mr-1 align-[-0.18em]"
										icon="ri:book-marked-fill"
									>
									</iconify-icon>Texte initial n°24
									<iconify-icon
										class=" align-[-0.3rem] text-xl"
										icon="ri-arrow-right-line"
									></iconify-icon></a
								>
							</button>
							{#if openTexteInitialpjlfraude}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé au Sénat le 14/10/2025 </span>
										<span class="">proposé par le Gouvernement</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales saisie au
											fond au Sénat</span
										>
									</div>
								</div>
							{/if}
						</div>
						<!--texte PJL Sénat-->
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTextecommissionSenatpjlfraude =
										!openTextecommissionSenatpjlfraude)}
								aria-expanded={openTextecommissionSenatpjlfraude}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTextecommissionSenatpjlfraude}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/pjl25-112"
									onclick={() => (isLoadingPjl = true)}
									title="Vers le projet de loi"
								>
									<iconify-icon
										class="mr-1 align-[-0.18em]"
										icon="ri:book-marked-fill"
									>
									</iconify-icon>Texte de la commission (n°24) n°112
									<iconify-icon
										class=" align-[-0.3rem] text-xl"
										icon="ri-arrow-right-line"
									></iconify-icon></a
								>
							</button>
							{#if openTextecommissionSenatpjlfraude}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class="">déposé à la séance le 05/11/2025 </span>
										<span class=""
											>modifié par la commission des affaires sociales du Sénat</span
										>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en séance au Sénat pour première lecture
										</span>
									</div>
								</div>
							{/if}
						</div>
						<!--texte 2247 PLF Sénat-->
						<div class="flex flex-col justify-start p-1 text-base">
							<button
								class="flex items-center gap-1 text-left"
								onclick={() =>
									(openTextecommissionAssembleepjlfraude =
										!openTextecommissionAssembleepjlfraude)}
								aria-expanded={openTextecommissionAssembleepjlfraude}
							>
								<iconify-icon
									class=" align-[-0.3rem] text-xl"
									icon="ri-arrow-right-s-line"
									class:rotate-90={openTextecommissionAssembleepjlfraude}
								></iconify-icon>
								<a
									class="lx-link-simple font-serif text-lg"
									href="/pjl/PRJLANR5L17B2115"
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
									></iconify-icon></a
								>
							</button>
							{#if openTextecommissionAssembleepjlfraude}
								<div class="ml-2 border-l-2 pl-3">
									<div class="flex flex-wrap gap-x-2 text-neutral-600">
										<span class=""
											>déposé à l'Assemblée nationale le 18/11/2025
										</span>
										<span class="">modifié par le Sénat</span>
									</div>
									<div class="flex flex-col">
										<span
											>examiné en commission des affaires sociales de
											l'Assemblée nationale saisie au fond
										</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
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
			Cette site internet est mis en œuvre par la <a
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
				>. lorsqu'un article entre dans leur périmètre ;
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
		récupérés à la source, auprès des institutions fournisseurs : Direction de
		l'information légale et administrative (DILA) en charge de Légifrance et
		Assemblée nationale.

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
