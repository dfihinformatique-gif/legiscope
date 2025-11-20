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
</script>

<div class="ml-9 flex flex-col gap-y-2 leading-tight">
	<span>
		<span class="text-le-gris-dispositif-dark underline underline-offset-4"
			>{labelVersion}</span
		>

		<span
			class="rounded-md border border-neutral-300 bg-neutral-100 px-1 text-xs tracking-wide text-neutral-600"
		>
			{data?.etat_citant ?? "—"}
		</span>

		<span
			class="rounded-md border border-neutral-300 bg-neutral-100 px-1 text-xs tracking-wide text-neutral-600"
		>
			{data?.article_type_citant ?? "—"}
		</span>
	</span>
	<span class="text-xs text-neutral-500">{data?.article_citant}</span>
</div>
