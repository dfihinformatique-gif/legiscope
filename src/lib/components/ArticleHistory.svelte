<script lang="ts">
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import {
		historyDataToHistoryByText,
		type ArticleInfo,
		type HistoryByText,
		type HistoryByTextRow,
		type HistoryData,
	} from "$lib/db_data_types"
	import { SvelteMap } from "svelte/reactivity"
	import AlertDatabaseMessage from "./ui_transverse_components/AlertDatabaseMessage.svelte"

	interface Props {
		articleInfo: ArticleInfo
	}

	let { articleInfo }: Props = $props()
	let historyData: HistoryData | undefined = $state(undefined)
	let historyByText: HistoryByText | undefined = $state(undefined)

	$effect(() => {
		fetch(`/api/history/${articleInfo.article?.legi_id}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				historyData = data
				if (historyData && historyData?.length > 0) {
					historyByText = historyDataToHistoryByText(historyData)
				}
			})
			.catch(() => (historyData = undefined))
	})

	/* Récupère l'année */
	function getYear(publicationDate: HistoryByTextRow["date_publi"]) {
		if (!publicationDate) return "Inconnue"
		const date =
			typeof publicationDate === "string"
				? new Date(publicationDate)
				: publicationDate
		return Number.isNaN(date.getTime())
			? "Inconnue"
			: date.getFullYear().toString()
	}

	// REGROUPEMENT des Modifications/Codifications par année
	let historyByYear = $derived(groupHistoryByYear(historyByText))

	/* fonction de groupement par année (ne modifie rien d'autre)*/
	function groupHistoryByYear(historyList?: HistoryByText) {
		const map = new SvelteMap<string, HistoryByTextRow[]>()
		if (!Array.isArray(historyList)) return []

		for (const text of historyList) {
			const year = getYear(text.date_publi)
			if (!map.has(year)) map.set(year, [])
			map.get(year)!.push(text)
		}

		const historyByYear = Array.from(map.entries()).map(([year, items]) => ({
			year,
			items,
		}))

		/* tri décroissant par année, 'Inconnue' en fin */
		historyByYear.sort((a, b) => {
			if (a.year === "Inconnue") return 1
			if (b.year === "Inconnue") return -1
			return Number(b.year) - Number(a.year)
		})

		return historyByYear
	}

	/* transforme le type de lien en version accentuée si nécessaire */
	function formatTypeLien(typeLien: string) {
		switch (typeLien) {
			case "MODIFIE":
				return "MODIFIÉ"
			case "CODIFIE":
				return "CODIFIÉ"
			case "ABROGE":
				return "ABROGÉ"
			case "CREE":
				return "CRÉÉ"
			case "ANNULE":
				return "ANNULÉ"
			case "PERIME":
				return "PERIMÉ"
			case "TRANSFERE":
				return "TRANSFERÉ"
			default:
				return typeLien
		}
	}
</script>

<h2 class="flex items-center pb-2 text-base font-bold text-gray-700">
	Sources de l'article
</h2>
{#if historyByText !== undefined}
	{#each historyByYear as group, index (index)}
		<section class="flex gap-8 border-b border-neutral-200 pt-2 pb-4">
			<div>
				<span class=" px-2 font-bold text-gray-400">{group.year}</span>
			</div>
			<div>
				<ul class="list-disc">
					{#each group.items as text, indexItem (indexItem)}
						<li class="pb-4 text-left text-sm">
							<span
								class="rounded-md border border-neutral-300 bg-neutral-100 px-1 text-xs tracking-wide text-neutral-600"
							>
								{formatTypeLien(text.typelien)} par
							</span>
							{text.titre_texte}
							<span class="-mr-1 -ml-0.5" aria-hidden="true">・</span>

							{#if text.articles_jorf && text.articles_jorf.filter( (article) => {
										return article.id !== ""
									}, ).length > 0}
								{#each text.articles_jorf as article, indexArticle (indexArticle)}
									{@const articleUrl = new URL(page.url)}
									{articleUrl.searchParams.set("article", article.id)}

									<a
										class="lx-link-text text-nowrap"
										href={resolve(
											`${articleUrl.pathname}${articleUrl.search}` as Pathname & {},
										)}
									>
										{#if (article.num ?? "").length > 0}
											art. {article.num}
										{:else}
											article
										{/if}
									</a>

									{#if indexArticle < text.articles_jorf.length - 1}
										,
									{/if}
								{/each}
							{:else}
								{@const urlToNavigate = new URL(page.url)}
								{urlToNavigate.searchParams.set("article", text.cidtexte)}

								<a
									class="lx-link-text"
									href={resolve(
										`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname & {},
									)}>texte</a
								>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/each}
{:else}
	<AlertDatabaseMessage>
		Aucune source n'est disponible pour cet article
	</AlertDatabaseMessage>
{/if}
