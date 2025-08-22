<script lang="ts">
	import Toc from "$lib/components/Toc.svelte"
	import type { LegiArticle } from "@tricoteuses/legifrance"

	interface Props {
		articleJson: LegiArticle
	}
	let { articleJson }: Props = $props()
	$inspect(articleJson)
	let tocIsOpen = $state(false)
	let initToc = $state(false)

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

<div
	class:mb-10={tocIsOpen}
	class:border-b={tocIsOpen}
	class:shadow-bottom-extralight={tocIsOpen}
	class:border-gray-200={tocIsOpen}
>
	<button
		class="text-le-gris-dispositif-dark lx-link-text my-2 cursor-pointer text-left font-sans xl:mt-5 xl:text-lg"
		onclick={() => {
			tocIsOpen = !tocIsOpen
			initToc = tocIsOpen ? true : false
		}}
	>
		<iconify-icon
			class="align-[-0.3rem] text-xl"
			icon={tocIsOpen ? "ri:arrow-down-s-line" : "ri:arrow-right-s-line"}
		>
		</iconify-icon>
		{lastTMText}
	</button>

	{#if tocIsOpen}
		<div class="mb-10 ml-6">
			<Toc
				{articleJson}
				{lastTMText}
				lienSectionTA={undefined}
				init={initToc}
				open={true}
			></Toc>
		</div>
	{/if}
</div>
