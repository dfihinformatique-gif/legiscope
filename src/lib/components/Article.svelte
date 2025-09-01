<script lang="ts">
	import { shared } from "$lib/shared.svelte"
	// import type { LegiArticle } from "@tricoteuses/legifrance"
	import type { Legiarti } from "$lib/db_data_types"
	import ArticleSummary from "./ArticleSummary.svelte"

	interface Props {
		articleFromDb: Legiarti
	}
	let { articleFromDb }: Props = $props()
	let articleTextcontent: String | undefined = $derived(
		articleFromDb ? (articleFromDb.bloc_textuel ?? undefined) : undefined,
	)
	let articleNum: String | undefined = $derived(
		articleFromDb ? (articleFromDb.num ?? undefined) : undefined,
	)
	let contextTextTitle = $derived.by(() => {
		if (articleFromDb === undefined) {
			return undefined
		}
		//TODO refine choice of title if many
		return "Le titre du text - TDB"
	})

	let articleVersion = $derived(() => {
		return "Version - TDB"
	})

	function formatDateFr(dateStr: string): string {
		const date = new Date(dateStr)
		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		})
	}
</script>

<div
	class="mx-3 mb-20 h-fit w-full max-w-6xl bg-blue-50 p-6 pt-2 text-justify shadow-md md:mx-6"
	class:md:p-16={!shared.showBillDesktop}
>
	{#if articleFromDb}
		<!--Sommaire-->
		<ArticleSummary articleJson={articleFromDb}></ArticleSummary>

		<!--En-tête-->
		<div
			class="mt-2 mb-5 flex flex-col items-start justify-between gap-5 md:flex-row"
		>
			<!--Titre-->
			<div
				class="text-le-gris-dispositif-dark flex-wrap text-left font-sans text-2xl"
			>
				<iconify-icon
					class="align-[-0.2rem] text-2xl"
					icon="ri:book-marked-fill"
				>
				</iconify-icon>
				{#if articleNum !== undefined}
					<span class="text-nowrap">Article {articleNum}</span>
				{/if} · <span class="">{contextTextTitle}</span>
			</div>
			<div class="md:mt-1">
				<a class="lx-link-simple text-nowrap text-gray-500" href="TODO"
					>Légifrance XXX</a
				>
			</div>
		</div>
		<div class="mb-8 flex w-full flex-wrap justify-end gap-x-5 gap-y-2">
			{#if articleVersion()?.LIEN_ART?.["@debut"]}
				{#if articleVersion().LIEN_ART["@etat"] === "VIGUEUR"}
					<div
						class="text-le-gris-dispositif-dark grow rounded-sm bg-white p-0.5 px-2 font-serif text-base italic"
					>
						Version en vigueur depuis le {formatDateFr(
							articleVersion().LIEN_ART["@debut"],
						)}
					</div>
				{:else}
					<div
						class="text-le-gris-dispositif-dark grow rounded-sm bg-white p-0.5 px-2 font-serif text-base italic"
					>
						Version valable du {formatDateFr(
							articleVersion().LIEN_ART["@debut"],
						)}
						{#if articleVersion().LIEN_ART["@fin"]}
							au {formatDateFr(articleVersion().LIEN_ART["@fin"])}{/if}
					</div>
				{/if}
			{/if}
			<div class="flex flex-wrap gap-x-3 gap-y-1">
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Discussions parlementaires</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Liens relatifs</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Jurisprudence</a
				>
			</div>
		</div>

		<!--Article-->
		{#if articleTextcontent !== undefined}
			<span class="font-serif text-lg leading-8 md:text-left"
				>{@html articleTextcontent}</span
			>
		{/if}
	{:else}
		<div class="flex h-screen w-full flex-col justify-center">
			<iconify-icon class="text-8xl text-gray-300" icon="ri:book-marked-fill"
			></iconify-icon>
			<p class="text-center font-medium text-gray-500 uppercase">Cet article</p>
			<p class="text-center font-medium text-gray-500 uppercase">
				est introuvable
			</p>

			<iconify-icon class="text-8xl text-gray-300" icon="ri:question-mark"
			></iconify-icon>
		</div>
	{/if}
</div>
