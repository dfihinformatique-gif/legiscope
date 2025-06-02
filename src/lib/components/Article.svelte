<script lang="ts">
	import type { LegiArticle } from "@tricoteuses/legifrance"
	import ArticleSummary from "./ArticleSummary.svelte"

	interface Props {
		articleJson: LegiArticle
	}
	let { articleJson }: Props = $props()
	let articleTextcontent: String | undefined = $derived(
		articleJson ? articleJson.BLOC_TEXTUEL?.CONTENU : undefined,
	)
</script>

<div class="m-3 mb-20 bg-blue-50 px-2 text-justify shadow">
	{#if articleJson}
		<ArticleSummary {articleJson}></ArticleSummary>
		{#if articleTextcontent !== undefined}
			<span>{@html articleTextcontent}</span>
		{/if}
	{/if}
</div>
