<script lang="ts">
	import Toc from "$lib/components/Toc.svelte"
	import type { LegiArticle } from "@tricoteuses/legifrance"

	interface Props {
		articleJson: LegiArticle
	}
	let { articleJson }: Props = $props()
	$inspect(articleJson)
	let tocIsOpen = $state(false)

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

	let lastTMText = $derived(getLastTMText(articleJson))

	function getLastTMText(article: LegiArticle): string | undefined {
		let currentTm = article.CONTEXTE?.TEXTE?.TM
		while (currentTm?.TM) {
			currentTm = currentTm.TM
		}
		if (!currentTm?.TITRE_TM) return undefined

		const validEntries = currentTm.TITRE_TM.filter(
			(entry) =>
				entry["@debut"] && entry["@fin"] && entry["@debut"] < entry["@fin"],
		)

		if (validEntries.length === 0) return undefined

		const sortedEntries = [...validEntries].sort((a, b) =>
			b["@debut"].localeCompare(a["@debut"]),
		)

		return sortedEntries[0]?.["#text"]
	}
</script>

<button
	class="cursor-pointer underline"
	onclick={() => (tocIsOpen = !tocIsOpen)}
>
	&#62; {lastTMText}
</button><br />
{#if tocIsOpen}
	<Toc {articleJson} lienSectionTA={undefined} init={true} open={true}></Toc>
{/if}
{#if articleNum !== undefined}
	<span class="font-bold">Article {articleNum}</span>
{/if}
| <span class="font-bold">{contextTextTitle}</span>
