<script lang="ts">
	import { page } from "$app/state"
	import type { ArticleInfo, CitationsData } from "$lib/db_data_types"

	interface Props {
		articleInfo: ArticleInfo
		date: string
	}

	let { articleInfo, date }: Props = $props()
	let citationsData: CitationsData | undefined = $state(undefined)
	let error = $state(false)

	fetch(`/api/citations/${articleInfo.article?.legi_id}/${date}`)
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => {
			citationsData = data
		})
		.catch(() => {
			citationsData = undefined
			error = true
		})
</script>

{#if citationsData !== undefined && citationsData.length > 0}
	Au {date}, cité par :
	{#each citationsData as citation}
		{@const urlToNavigate = new URL(page.url)}
		<!-- {@const citeDateDebut =
			citation.cite_date_debut !== null
				? citation.cite_date_debut.toISOString().split("T")[0]
				: ""}
		{@const citeDateFin =
			citation.cite_date_fin !== null
				? citation.cite_date_fin.toISOString().split("T")[0]
				: ""} -->
		{urlToNavigate.searchParams.set("article", citation.legi_id_lien)}
		<section class="flex border-b border-neutral-200 pt-2">
			<span class="text-sm"
				>V.{citation.cite_date_debut}->{citation.cite_date_fin}</span
			>
			<a class="lx-link-text" href={urlToNavigate.href}>
				{citation.titre}
				{#if citation.num !== null}art. {citation.num}{/if}
			</a>
			{#if citation.etat !== null}
				({citation.etat}){/if}
			<span class="text-sm"
				>(V.{citation.cite_par_date_debut}->{citation.cite_par_date_fin})</span
			>
		</section>
	{/each}
{:else if citationsData === undefined}
	Récupération des citations
{:else if error}
	Une erreur est survenue lors de la récupération des citations
{:else}
	Pas de citations au {date}
{/if}
