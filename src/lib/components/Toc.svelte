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
		lastTMText?: string
	}
	let { articleJson, lienSectionTA, init, open, lastTMText }: Props = $props()
	let titreTM = $state("")
	let structTA: LegiSectionTaLienSectionTa[] | undefined = $state(undefined)

	const allContextTM = getAllTmIds(articleJson)

	if (init === true && lienSectionTA === undefined) {
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

	function getAllTmIds(article: LegiArticle): string[] {
		const ids: string[] = []
		let currentTm = article.CONTEXTE?.TEXTE?.TM

		while (currentTm) {
			if (currentTm.TITRE_TM) {
				for (const titre of currentTm.TITRE_TM) {
					if (titre["@id"]) ids.push(titre["@id"])
				}
			}
			currentTm = currentTm.TM
		}

		return ids
	}

	console.log(init)

	console.log("Comparaison TM:", {
		lastTMText,
		titreTM,
		égal: lastTMText === titreTM,
	})
</script>

<button
	class="text-le-gris-dispositif-dark lx-link-text my-0.5 -ml-1 cursor-pointer text-left xl:text-lg"
	class:text-le-gris-dispositif-dark={lastTMText !== titreTM}
	class:text-black={lastTMText === titreTM}
	class:bg-white={lastTMText === titreTM}
	class:rounded-sm={lastTMText === titreTM}
	class:p-2={lastTMText === titreTM}
	class:mr-4={lastTMText === titreTM}
	class:font-serif={lastTMText === titreTM}
	class:font-bold={lastTMText === titreTM}
	onclick={() => {
		open = !open
	}}
	>{#if structTA}
		<iconify-icon
			class="align-[-0.2rem] text-lg no-underline"
			icon={open ? "ri:checkbox-indeterminate-fill" : "ri:add-box-fill"}
		></iconify-icon>
	{/if}
	<span>{titreTM}</span>
</button>
{#if structTA && open}
	<ul class="translate-1">
		{#each structTA as nextLienSectionTA}
			{#if lastTMText === titreTM}
				<li
					class="border-le-gris-dispositif-light border-l py-1 pl-3"
				>
					<Toc
						{articleJson}
						lienSectionTA={nextLienSectionTA}
						{init}
						{lastTMText}
						open={allContextTM.includes(nextLienSectionTA?.["@id"]) && init}
					/>
				</li>
			{:else}
				<li class="border-le-gris-dispositif-light border-l py-1 pl-3">
					<Toc
						{articleJson}
						lienSectionTA={nextLienSectionTA}
						{init}
						{lastTMText}
						open={allContextTM.includes(nextLienSectionTA?.["@id"]) && init}
					/>
				</li>
			{/if}
		{/each}
	</ul>
{/if}
