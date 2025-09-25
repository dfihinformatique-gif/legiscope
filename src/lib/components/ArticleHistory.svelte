<script lang="ts">
	import { page } from "$app/state"
	import type { ArticleInfo, HistoryData } from "$lib/db_data_types"

	interface Props {
		articleInfo: ArticleInfo
	}
	let { articleInfo }: Props = $props()
	let historyData: HistoryData | undefined = $state(undefined)

	fetch(`/api/history/${articleInfo.article?.legi_id}`)
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => {
			historyData = data
		})
		.catch(() => (historyData = undefined))
</script>

{#if historyData !== undefined}
	<ul>
		{#each historyData as row}
			{@const urlToNavigate = new URL(page.url)}
			{urlToNavigate.searchParams.set("article", row.cidtexte)}
			<li>
				{row.typelien} par <a href={urlToNavigate.href}>{row.titre_texte}</a>
			</li>
		{/each}
	</ul>
{/if}
