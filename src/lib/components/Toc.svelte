<script lang="ts">
	import type {
		LegiArticle,
		LegiSectionTaLienSectionTa,
	} from "@tricoteuses/legifrance"

	import Toc from "./Toc.svelte"

	interface Props {
		articleJson: LegiArticle
		lienSectionTA: LegiSectionTaLienSectionTa | undefined
		init: boolean
		open: boolean
	}
	let { articleJson, lienSectionTA, init, open }: Props = $props()
	let titreTM = $state("")
	let structTA: LegiSectionTaLienSectionTa[] | undefined = $state(undefined)

	if (init === true) {
		//Initialization - need to get SCTA struct from Textelr instead of section_ta
		const legiTextId = articleJson.CONTEXTE.TEXTE["@cid"]
		if (!legiTextId) {
			console.error("Cannot get ID of context text from article JSON")
		}

		fetch(`/api/toc/${legiTextId}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => (structTA = data))
			.catch(() => (structTA = undefined))

		titreTM = getCurrentContextTitreTxt(articleJson)
	} else {
		const legiSCTAid = lienSectionTA?.["@cid"]
		fetch(`/api/toc/${legiSCTAid}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => (structTA = data))
			.catch(() => (structTA = undefined))

		titreTM = lienSectionTA!["#text"] || "Titre inconnu"
	}

	function getCurrentContextTitreTxt(article: LegiArticle): string {
		let titresTxtArray = article.CONTEXTE?.TEXTE?.TITRE_TXT

		const validEntries = titresTxtArray.filter(
			(entry) =>
				entry["@debut"] && entry["@fin"] && entry["@debut"] < entry["@fin"],
		)

		if (validEntries.length === 0) return "Titre inconnu"

		const sortedEntries = [...validEntries].sort((a, b) =>
			b["@debut"].localeCompare(a["@debut"]),
		)

		return sortedEntries[0]?.["#text"]
	}
</script>

<details bind:open>
	<summary>
		{titreTM}
	</summary>
	{#if structTA && open}
		<ul class="translate-1">
			{#each structTA as nextLienSectionTA}
				<li>
					<Toc
						{articleJson}
						lienSectionTA={nextLienSectionTA}
						init={false}
						open={false}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</details>
