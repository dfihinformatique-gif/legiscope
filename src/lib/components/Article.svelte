<script lang="ts">
	import type { LegiArticle } from "@tricoteuses/legifrance"

	interface Props {
		articleJson: LegiArticle
	}
	let { articleJson }: Props = $props()
	let articleNum: String | undefined = $derived(
		articleJson ? articleJson.META?.META_SPEC?.META_ARTICLE?.NUM : undefined,
	)
	let articleTextcontent: String | undefined = $derived(
		articleJson ? articleJson.BLOC_TEXTUEL?.CONTENU : undefined,
	)
</script>

<div class="m-3 bg-blue-50 px-2 text-justify shadow">
	{#if articleJson}
		{#if articleNum !== undefined}
			<span class="font-bold">Article {articleNum}</span>
		{/if}
		{#if articleTextcontent !== undefined}
			<span>{@html articleTextcontent}</span>
		{/if}
	{/if}
</div>
