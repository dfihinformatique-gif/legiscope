<script lang="ts">
	import type { LegiArticle } from "@tricoteuses/legifrance"
	import type { PageData } from "./$types"
	export let data: PageData
	const articleJson = data.article as LegiArticle | null
	let articleNum: String, articleTextcontent: String

	if (articleJson !== null) {
		articleNum = articleJson.META.META_SPEC.META_ARTICLE.NUM!
		if (articleJson.BLOC_TEXTUEL !== undefined) {
			articleTextcontent = articleJson.BLOC_TEXTUEL.CONTENU
		}
	}
</script>

<svelte:head>
	<title>Article</title>
</svelte:head>
{#if articleJson}
	{#if articleNum !== undefined}
		<span class="font-bold">Article {articleNum}</span>
	{/if}
	{#if articleTextcontent !== undefined}
		<span>{@html articleTextcontent}</span>
	{/if}
{/if}
