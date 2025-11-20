<script lang="ts">
	interface Props {
		data?: {
			date_debut_citant?: string | null
			date_fin_citant?: string | null
			article_type_citant?: string | null
			etat_citant?: string | null
			article_citant?: string | null
			// ajoute d'autres champs si besoin
		}
	}
	let { data }: Props = $props()

	let labelVersion = $state("")

	const formatFrancaisAbregeDate = (date: Date | null) =>
		date
			? date.toLocaleDateString("fr-FR", {
					day: "numeric",
					month: "short",
					year: "numeric",
				})
			: ""

	$effect(() => {
		if (!data) {
			labelVersion = ""
			return
		}

		const start = data.date_debut_citant
			? new Date(data.date_debut_citant)
			: null
		const end = data.date_fin_citant ? new Date(data.date_fin_citant) : null

		if (start && end)
			labelVersion = `Version du ${formatFrancaisAbregeDate(start)} au ${formatFrancaisAbregeDate(end)}`
		else if (start)
			labelVersion = `Version depuis ${formatFrancaisAbregeDate(start)}`
		else if (end)
			labelVersion = `Version jusqu’au ${formatFrancaisAbregeDate(end)}`
		else labelVersion = ""
	})

	// Mapping des états de l'article citant
	function formatEtatCitant(etat?: string | null) {
		switch (etat?.toUpperCase().trim()) {
			case "ABROGE":
				return "Abrogée"
			case "ABROGE_DIFF":
				return "Abrogée diff"
			case "ANNULE":
				return "Annulée"
			case "DENONCE":
				return "Dénoncée"
			case "DEPLACE":
				return "Déplacée"
			case "DISJOINT":
				return "Disjointe"
			case "MODIFIE":
				return "Modifiée"
			case "MODIFIE_MORT_NE":
				return "Morte née"
			case "PERIME":
				return "Périmée"
			case "REMPLACE":
				return "Remplacée"
			case "TRANSFERE":
				return "Transférée"
			case "VIGUEUR":
				return "en vigueur"
			case "VIGUEUR_DIFF":
				return "en vigueur différé"
			case "VIGUEUR_ETEN":
				return "en vigueur étendu"
			case "VIGUEUR_NON_ETEN":
				return "En vigueur non étendu"
			case "CREE":
				return "Créée"
			default:
				return etat ?? "—"
		}
	}

	function categorieEtatCitant(etat?: string | null): string {
		if (
			etat === "VIGUEUR" ||
			etat === "VIGUEUR_DIFF" ||
			etat === "VIGUEUR_ETEN" ||
			etat === "VIGUEUR_NON_ETEN"
		)
			return "vigueur_EtatCitantCategorie"

		if (
			etat === "ABROGE" ||
			etat === "ABROGE_DIFF" ||
			etat === "ANNULE" ||
			etat === "DENONCE" ||
			etat === "MODIFIE_MORT_NE" ||
			etat === "PERIME"
		)
			return "supprime_EtatCitantCategorie"

		return "autre_EtatCitantCategorie"
	}

	// Mapping des types d'article
	function formatArticleTypeCitant(type?: string | null) {
		switch (type) {
			case "AUTONOME":
				return "-"
			case "ENTIEREMENT_MODIF":
				return "entièrement modificatrice d'un autre article"
			case "PARTIELLEMENT_MODIF":
				return "partiellement modificatrice"
			default:
				return type ?? "—"
		}
	}
</script>

<div class="ml-9 flex flex-col gap-y-2 leading-tight">
	<span>
		<span class="text-le-gris-dispositif-dark underline underline-offset-4"
			>{labelVersion}</span
		>

		<span
			class={`rounded-md border border-neutral-300 px-1 text-xs tracking-wide text-neutral-600 ${
				categorieEtatCitant(data?.etat_citant) === "vigueur_EtatCitantCategorie"
					? "bg-green-200"
					: categorieEtatCitant(data?.etat_citant) ===
						  "supprime_EtatCitantCategorie"
						? "bg-red-200"
						: "bg-neutral-100"
			}`}
		>
			{formatEtatCitant(data?.etat_citant)}
		</span>

		{#if data?.article_type_citant !== "AUTONOME"}
			<span
				class="rounded-md border border-neutral-300 bg-neutral-100 px-1 text-xs tracking-wide text-neutral-600"
			>
				{formatArticleTypeCitant(data?.article_type_citant)}
			</span>
		{/if}
	</span>
	<span class="text-xs text-neutral-500">{data?.article_citant}</span>
</div>
