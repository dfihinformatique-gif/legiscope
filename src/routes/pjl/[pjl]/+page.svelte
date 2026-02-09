<script lang="ts">
	import { page } from "$app/state"
	import Article from "$lib/components/Article.svelte"
	import ArticleCitant from "$lib/components/article_citations/ArticleCitant.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import SkeletonArticleLoader from "$lib/components/SkeletonArticleLoader.svelte"
	import AlertDatabaseMessage from "$lib/components/ui_transverse_components/AlertDatabaseMessage.svelte"
	import type { ArticleInfo } from "$lib/db_data_types"
	import { shared } from "$lib/shared.svelte"
	import type { PageProps } from "./$types"

	let { data }: PageProps = $props()
	let pjlHTML = $derived(data.pjlHTML)

	let showParameterModal = $state(false)
	let parametersToVariables = $state<Record<string, string[]>>({})

	let lawContainer: HTMLElement | undefined = $state()

	let articleInfo = $state<ArticleInfo | undefined>(undefined)
	let articleError = $state<Error | undefined>(undefined)
	let isLoadingArticle = $derived(
		page.url.searchParams.get("article") !== undefined &&
			data.articleInfoPromise !== undefined &&
			articleInfo === undefined &&
			articleError === undefined,
	)

	// Garder trace de l'article actuellement chargé
	let currentArticleId = $state<string | undefined>(undefined)

	let citingArticleInfo = $state<ArticleInfo | undefined>(undefined)
	let isLoadingCitingArticle = $state(false)
	let citingArticleError = $state<Error | undefined>(undefined)
	let currentCitingArticleId = $state<string | undefined>(undefined)

	$effect(() => {
		if (
			shared.activePanelMobile === "law" &&
			lawContainer !== undefined &&
			lawContainer !== null &&
			articleInfo
		) {
			lawContainer.scrollTo({ top: 0, behavior: "auto" })
		}
	})

	$effect(() => {
		const requestedArticleId = page.url.searchParams.get("article") || undefined

		if (data.articleInfoPromise && requestedArticleId !== currentArticleId) {
			isLoadingArticle = true
			articleError = undefined
			currentArticleId = requestedArticleId

			data.articleInfoPromise
				.then((info) => {
					// Vérifier que c'est toujours l'article demandé
					if (requestedArticleId === page.url.searchParams.get("article")) {
						articleInfo = info
						shared.activePanelMobile = "law"
					}
				})
				.catch((error) => {
					articleError = error
				})
				.finally(() => {
					if (requestedArticleId === page.url.searchParams.get("article")) {
						isLoadingArticle = false
					}
				})
		} else if (!requestedArticleId) {
			articleInfo = undefined
			isLoadingArticle = false
			currentArticleId = undefined
		}
	})

	$effect(() => {
		const requestedCitingId = page.url.searchParams.get("citant") || undefined

		if (
			data.citingArticleInfoPromise &&
			requestedCitingId !== currentCitingArticleId
		) {
			isLoadingCitingArticle = true
			citingArticleError = undefined
			currentCitingArticleId = requestedCitingId

			data.citingArticleInfoPromise
				.then((info) => {
					if (requestedCitingId === page.url.searchParams.get("citant")) {
						citingArticleInfo = info
						shared.activePanelMobile = "citing"
					}
				})
				.catch((error) => {
					citingArticleError = error
				})
				.finally(() => {
					if (requestedCitingId === page.url.searchParams.get("citant")) {
						isLoadingCitingArticle = false
					}
				})
		} else if (!requestedCitingId) {
			citingArticleInfo = undefined
			isLoadingCitingArticle = false
			currentCitingArticleId = undefined
		}
	})

	$effect(() => {
		shared.pjlDate = data.pjlDate ?? shared.pjlDate
	})
</script>

{#if !shared.isMobilePhone}
	<div class="flex h-full w-full flex-row overflow-hidden">
		<section
			class="@container/section-bill flex h-full flex-1 origin-right justify-center overflow-y-auto shadow-xl transition-all duration-300"
			class:hidden={!shared.showBillDesktop}
		>
			<Bill {pjlHTML} {showParameterModal} bind:parametersToVariables></Bill>
		</section>

		<section
			class="@container/section-article flex h-full flex-1 flex-col overflow-y-auto bg-blue-100 transition-all duration-300 lg:px-6"
			class:hidden={!shared.showLawDesktop}
		>
			{#if isLoadingArticle}
				<SkeletonArticleLoader />
			{:else if articleError}
				<p>Erreur: {articleError.message}</p>
			{:else if articleInfo}
				<Article {articleInfo} {showParameterModal} bind:parametersToVariables
				></Article>
			{:else if page.url.searchParams.get("article") !== null}
				<AlertDatabaseMessage>
					<b
						>Les données ne permettent pas l'affichage du contenu de cet
						article.</b
					>

					<p>
						Une version numérisée peut néanmoins être disponible sur <a
							class="lx-link-text cursor-pointer font-bold"
							href="https://www.legifrance.gouv.fr/loda/id/{page.url.searchParams.get(
								'article',
							)}"
							target="_blank"
							>Légifrance<iconify-icon
								class="pl-0.5 align-[-0.15rem]"
								icon="ri:external-link-line"
							></iconify-icon></a
						>
					</p>
				</AlertDatabaseMessage>
			{:else}
				<div
					class="flex h-screen flex-col items-center justify-center p-4 text-center"
				>
					<iconify-icon
						class="text-8xl text-gray-400"
						icon="ri:book-marked-fill"
					></iconify-icon>
				</div>
			{/if}
		</section>

		{#if citingArticleInfo}
			<aside
				class="@container/section-citations flex h-full flex-1 flex-col justify-center overflow-y-auto bg-blue-100 transition-all duration-300"
				class:hidden={!shared.showCitingDesktop}
			>
				{#if isLoadingCitingArticle}
					<SkeletonArticleLoader />
				{:else if citingArticleError}
					<p>Erreur: {citingArticleError.message}</p>
				{:else}
					<ArticleCitant
						{citingArticleInfo}
						versionsArticle={articleInfo!.versions}
					></ArticleCitant>
				{/if}
			</aside>
		{/if}
	</div>
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-x-hidden">
		<section
			class="@container/section-bill z-10 h-screen w-full overflow-y-auto shadow-md"
			class:hidden={shared.activePanelMobile !== "bill"}
		>
			<Bill {pjlHTML} {showParameterModal} bind:parametersToVariables></Bill>
		</section>

		<section
			bind:this={lawContainer}
			class="@container/section-article h-screen w-full overflow-y-auto bg-blue-100"
			class:hidden={shared.activePanelMobile !== "law"}
		>
			{#if isLoadingArticle}
				<div
					class="flex h-screen flex-col items-center justify-center text-center"
				>
					<SkeletonArticleLoader />
				</div>
			{:else if articleError}
				<p>Erreur: {articleError.message}</p>
			{:else if articleInfo !== undefined}
				<Article {articleInfo} {showParameterModal} {parametersToVariables}
				></Article>
			{:else}
				<div
					class="flex h-screen flex-col items-center justify-center p-4 text-center"
				>
					<iconify-icon
						class="text-8xl text-gray-500"
						icon="ri:book-marked-fill"
					></iconify-icon>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						Cliquez sur un lien
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						du projet de loi
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						pour afficher l'article ici
					</p>
					<iconify-icon class="text-8xl text-gray-500" icon="ri:arrow-left-line"
					></iconify-icon>
				</div>
			{/if}
		</section>

		<div
			class="h-screen w-full overflow-y-auto bg-blue-100"
			class:hidden={shared.activePanelMobile !== "citing"}
		>
			{#if isLoadingCitingArticle}
				<div
					class="flex h-screen flex-col items-center justify-center text-center"
				>
					<SkeletonArticleLoader />
				</div>
			{:else if citingArticleError}
				<p>Erreur: {citingArticleError.message}</p>
			{:else if citingArticleInfo}
				<ArticleCitant
					{citingArticleInfo}
					versionsArticle={articleInfo!.versions}
				></ArticleCitant>
			{:else}
				<aside
					class="@container/section-citations flex h-screen flex-col items-center justify-center p-4 text-center"
				>
					<iconify-icon
						class="text-8xl text-gray-500"
						icon="ri:book-marked-fill"
					></iconify-icon>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						Cliquez sur un lien
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						du projet de loi
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						pour afficher l'article ici
					</p>
					<iconify-icon class="text-8xl text-gray-500" icon="ri:arrow-left-line"
					></iconify-icon>
				</aside>
			{/if}
		</div>
	</div>
{/if}
{#if showParameterModal}
	<div>
		{parametersToVariables}
	</div>
{/if}
