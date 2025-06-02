<script lang="ts">
	import type { LegiArticle } from "@tricoteuses/legifrance"

	interface Props {
		articleJson: LegiArticle
	}
	let { articleJson }: Props = $props()
	console.log({ articleJson })

	let articleNum: String | undefined = $derived(
		articleJson ? articleJson.META?.META_SPEC?.META_ARTICLE?.NUM : undefined,
	)
	let contextTextTitle = $derived.by(() => {
		if (articleJson === undefined) {
			return undefined
		}
		if (articleJson.CONTEXTE.TEXTE.TITRE_TXT.length === 1) {
			return articleJson.CONTEXTE.TEXTE.TITRE_TXT[0]["@c_titre_court"]
		} else {
			console.log(
				"Warning : context text has different titles, the first one is selected, but it should be refined :",
				{ TITRE_TXT: articleJson.CONTEXTE.TEXTE.TITRE_TXT },
			)
			//TODO refine choice of title if many
			return articleJson.CONTEXTE.TEXTE.TITRE_TXT[0]["@c_titre_court"]
		}
	})
</script>

{#if articleNum !== undefined}
	<span class="font-bold">Article {articleNum}</span>
{/if}
| <span class="font-bold">{contextTextTitle}</span>
