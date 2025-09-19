<script lang="ts">
	import { goto } from "$app/navigation"
	import { page } from "$app/state"
	import type { ArticleInfo, VersionArticle } from "$lib/db_data_types"
	import { shared } from "$lib/shared.svelte"
	import ArticleSummary from "./ArticleSummary.svelte"

	interface Props {
		articleInfo: ArticleInfo
		pjlDate: string
	}
	const { articleInfo, pjlDate }: Props = $props()

	function formatDateFr(dateStr: string): string {
		const date = new Date(dateStr)
		return date
			.toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
			.replace(/^1 /, "1er ")
	}

	let selectedVersion: VersionArticle | undefined = $state(undefined)

	const dateForSelect = page.url.searchParams.get("date") ?? shared.pjlDate
</script>

<div
	class="mb-20 h-fit w-full max-w-6xl bg-blue-50 p-6 pt-2 text-justify shadow-md md:mx-6"
	class:md:p-16={!shared.showBillDesktop}
>
	{#if articleInfo.article}
		<!--Sommaire-->
		<ArticleSummary {articleInfo} date={dateForSelect}></ArticleSummary>

		<!--En-tête-->
		<div
			class="mt-2 mb-5 flex flex-col items-start justify-between gap-x-5 md:flex-row"
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
				{#if articleInfo.article.num !== undefined}
					<span class="text-nowrap">Article {articleInfo.article.num}</span>
				{/if} · <span class="">{articleInfo.textTitle}</span>
			</div>
			<div class="flex w-full justify-end md:mt-1 md:w-min">
				<a
					class="lx-link-simple text-right text-nowrap text-gray-500"
					href="https://www.legifrance.gouv.fr/loda/id/{articleInfo.article
						.legi_id}"
					target="_blank"
					>Légifrance<iconify-icon
						class="ml-0.5 align-[-0.15rem] text-sm"
						icon="ri:external-link-line"
					></iconify-icon></a
				>
			</div>
		</div>
		<div class="mb-8 flex w-full flex-wrap justify-end gap-x-5 gap-y-2">
			{#if articleInfo.versions}
				<select
					name="versions"
					class="text-le-gris-dispositif-dark grow rounded-sm bg-white p-0.5 px-2 text-left font-serif text-base italic"
					onchange={() => {
						const urlToNavigate = new URL(page.url)
						urlToNavigate.searchParams.set(
							"article",
							selectedVersion!.legi_id_lien,
						)
						urlToNavigate.searchParams.set(
							"date",
							new Date(selectedVersion!.debut).toISOString().split("T")[0],
						)
						goto(urlToNavigate, { replaceState: false })
					}}
					bind:value={selectedVersion}
				>
					{#each articleInfo.versions as version (version.legi_id_lien)}
						<option
							value={version}
							selected={new Date(dateForSelect) >= new Date(version.debut) &&
								new Date(dateForSelect) < new Date(version.fin)}
						>
							{#if articleInfo.article.date_debut}
								{#if articleInfo.article.date_fin === "2999-01-01"}
									Version en vigueur depuis le {formatDateFr(version.debut)}
								{:else}
									Version valable du {formatDateFr(version.debut)}
									au {formatDateFr(version.fin)}
								{/if}
							{/if}
						</option>
					{/each}
				</select>
			{/if}
			<!-- <div class="flex flex-wrap gap-x-3 gap-y-1">
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Discussions parlementaires</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Liens relatifs</a
				>
				<a class="lx-link-simple leading-5 text-gray-500" href="TODO"
					>Jurisprudence</a
				>
			</div> -->
		</div>

		<!--Article-->
		{#if articleInfo.article.bloc_textuel !== undefined && articleInfo.article.bloc_textuel !== null}
			<span class="font-serif text-lg leading-8 md:text-left"
				>{@html articleInfo.article.bloc_textuel}</span
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
