<script lang="ts">
	import { page } from "$app/state"
	import type { ArticleInfo, HistoryData } from "$lib/db_data_types"

	interface Props {
		articleInfo: ArticleInfo
	}
	interface HistoryByTextRow {
		cidtexte: string
		titre_texte: string
		articles_jorf: Array<{ id: string; num: string }>
		typelien: string
		date_publi: Date | null
	}
	type HistoryByText = HistoryByTextRow[]

	function historyDataToHistoryByText(historyData: HistoryData): HistoryByText {
		const grouped = historyData.reduce(
			(acc, row) => {
				const key = row.cidtexte

				if (!acc[key]) {
					acc[key] = {
						cidtexte: row.cidtexte,
						titre_texte: row.titre_texte,
						articles_jorf: [],
						typelien: row.typelien,
						date_publi: row.date_publi,
					}
				}

				if (row.article_jorf !== null) {
					acc[key].articles_jorf.push({
						id: row.article_jorf,
						num: row.num || "",
					})
				}

				if (
					row.date_publi !== null &&
					(acc[key].date_publi === null || row.date_publi < acc[key].date_publi)
				) {
					acc[key].date_publi = row.date_publi
				}

				return acc
			},
			{} as Record<string, HistoryByTextRow>,
		)

		return Object.values(grouped)
	}

	let { articleInfo }: Props = $props()
	let historyData: HistoryData | undefined = $state(undefined)
	let historyByText: HistoryByText | undefined = $state(undefined)

	fetch(`/api/history/${articleInfo.article?.legi_id}`)
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => {
			historyData = data
			if (historyData && historyData?.length > 0) {
				historyByText = historyDataToHistoryByText(historyData)
			}
		})
		.catch(() => (historyData = undefined))
</script>

{#if historyByText !== undefined}
	<ul>
		{#each historyByText as text}
			{@const urlToNavigate = new URL(page.url)}
			{urlToNavigate.searchParams.set("article", text.cidtexte)}
			<li>
				{text.typelien} par <a href={urlToNavigate.href}>{text.titre_texte}</a>
				(
				{#each text.articles_jorf as article, i}
					{urlToNavigate.searchParams.set("article", article.id)}
					{#if article.id !== undefined}
						<a href={urlToNavigate.href}>art. n°{article.num ?? i}</a>
					{:else}
						art. {article.num ?? i}
					{/if}
				{/each}
				)
			</li>
		{/each}
	</ul>
{/if}
