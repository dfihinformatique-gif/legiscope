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
				const key = `${row.cidtexte}_${row.typelien}`

				if (!acc[key]) {
					acc[key] = {
						cidtexte: row.cidtexte,
						titre_texte: row.titre_texte,
						articles_jorf: [],
						typelien: row.typelien,
						date_publi: row.date_publi,
					}
				}

				acc[key].articles_jorf.push({
					id: row.article_jorf || "",
					num: row.num || "",
				})

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
				{#if text.articles_jorf.filter((article) => {
					article.id !== ""
				}).length > 0}
					(
					{#each text.articles_jorf as article, i}
						{urlToNavigate.searchParams.set("article", article.id)}
						{#if article.id !== ""}
							<a href={urlToNavigate.href}
								>art. n°{article.num !== ""
									? article.num
									: `non identifié ${i + 1}`}</a
							>
						{:else}
							art. {article.num !== "" ? article.num : `non identifié ${i + 1}`}
						{/if}
					{/each}
					)
				{/if}
			</li>
		{/each}
	</ul>
{/if}
