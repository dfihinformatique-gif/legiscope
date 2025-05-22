<script lang="ts">
	import { displayedArticle } from "$lib/stores/article"
	const article = $displayedArticle
</script>

{#if article}
	{article.CONTEXTE.TEXTE.TITRE_TXT[0]["#text"]}
{/if}
<div></div>
