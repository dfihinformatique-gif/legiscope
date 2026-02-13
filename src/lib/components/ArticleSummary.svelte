<script lang="ts">
	import { page } from "$app/state"
	import Toc from "$lib/components/Toc.svelte"
	import type { ArticleInfo } from "$lib/db_data_types"

	interface Props {
		articleInfo: ArticleInfo
		date: string
		isSummaryOfCitingArticle?: boolean
	}
	let { articleInfo, date, isSummaryOfCitingArticle }: Props = $props()

	const requestedId = $derived(
		isSummaryOfCitingArticle
			? page.url.searchParams.get("citant")
			: page.url.searchParams.get("article"),
	)

	let tocIsOpen = $derived(
		requestedId !== null &&
			(requestedId.startsWith("LEGITEXT") ||
				requestedId.startsWith("JORFTEXT") ||
				requestedId.startsWith("LEGISCTA") ||
				requestedId.startsWith("JORFSCTA"))
			? true
			: false,
	)
</script>

<div
	class:border-b={tocIsOpen}
	class:shadow-bottom-extralight={tocIsOpen}
	class:border-gray-200={tocIsOpen}
>
	<button
		class="text-le-gris-dispositif-dark lx-link-text cursor-pointer text-left font-sans xl:text-lg"
		onclick={() => {
			tocIsOpen = !tocIsOpen
		}}
	>
		<iconify-icon
			class="align-[-0.3rem] text-xl"
			icon={tocIsOpen ? "ri:arrow-down-s-line" : "ri:arrow-right-s-line"}
		>
		</iconify-icon>
		{articleInfo.sectionTitle?.replaceAll("\\n", " ") ??
			articleInfo.textTitle?.replaceAll("\\n", " ")}
	</button>

	{#if tocIsOpen}
		<div class="mb-10 ml-6">
			<Toc {articleInfo} {date}></Toc>
		</div>
	{/if}
</div>
