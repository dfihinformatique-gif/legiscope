<script lang="ts">
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import type { Pathname } from "$app/types"
	import type { historyDataToHistoryByText } from "$lib/db_data_types"

	interface Props {
		historyByText: ReturnType<typeof historyDataToHistoryByText>
	}

	let { historyByText }: Props = $props()
</script>

{#if historyByText && historyByText.length > 0}
	<ul>
		{#each historyByText as historyText, indexText (indexText)}
			<li class="line-clamp-2 pb-1 text-left text-xs text-neutral-600 italic">
				<span
					class="cursor-default rounded-md border border-neutral-300 bg-neutral-100 px-1"
					>Suite à {historyText.typelien} par</span
				>

				{#if historyText.articles_jorf && historyText.articles_jorf.length > 0}
					{#each historyText.articles_jorf as historyArticle, indexArticle (indexArticle)}
						{@const urlToNavigate = new URL(page.url)}
						{urlToNavigate.searchParams.set("article", historyArticle.id)}
						<a
							class="lx-link-text"
							href={resolve(
								`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname & {},
							)}
						>
							{#if (historyArticle.num ?? "").length > 0}
								art. {historyArticle.num}
							{:else}
								article
							{/if}
						</a>
						{#if indexArticle < historyText.articles_jorf.length - 1}
							,
						{/if}
					{/each}
				{:else}
					{@const urlToNavigate = new URL(page.url)}
					{urlToNavigate.searchParams.set("article", historyText.cidtexte)}
					<a
						class="lx-link-text"
						href={resolve(
							`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname & {},
						)}>articles</a
					>
				{/if}
				<span class="-mr-0.5 -ml-1" aria-hidden="true">・</span>
				{historyText.titre_texte}
			</li>
		{/each}
	</ul>
{/if}
