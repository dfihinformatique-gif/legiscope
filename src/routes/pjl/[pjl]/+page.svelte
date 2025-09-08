<script lang="ts">
	import { page } from "$app/state"
	import Article from "$lib/components/Article.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import SkeletonArticleLoader from "$lib/components/SkeletonArticleLoader.svelte"
	import type { Legiarti } from "$lib/db_data_types"
	import { shared } from "$lib/shared.svelte"
	import type { PageProps } from "./$types"

	let isFetchingArticle = $state(false)

	let { data }: PageProps = $props()

	let articleFromDb: Legiarti | undefined = $state(undefined)
	let associatedText: string = $state("")
	let associatedTextTitle: string = $state("")
	let lawArticle = $derived(page.url.searchParams.get("lawArticle") || "")
	let pjlHTML = $state(data.pjlHTML)

	let lawContainer: HTMLDivElement | undefined = $state()

	$effect(() => {
		if (shared.activePanelMobile === "law" && lawContainer !== undefined) {
			lawContainer.scrollTo({ top: 0, behavior: "auto" })
		}
	})

	// Permet d'afficher l'article dans la vue law quand on clique sur un lien depuis la bill
	$effect(() => {
		page.url
		if (lawArticle) {
			isFetchingArticle = true
			fetch(`/api/article/${lawArticle}/${shared.pjlDate}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					console.log({ data })
					isFetchingArticle = false
					articleFromDb = data.article
					associatedText = data.text
					associatedTextTitle = data.textTitle ?? ""
					if (shared.isMobilePhone) {
						shared.activePanelMobile = "law"
					} else {
						shared.showLawDesktop = true
					}
				})
				.catch(() => (lawArticle = ""))
		} else {
			articleFromDb = undefined
		}
	})
</script>

{#if !shared.isMobilePhone}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		<div
			class={`z-10 flex h-screen origin-right justify-center overflow-y-auto shadow-xl transition-all duration-300 ${
				shared.showBillDesktop && shared.showLawDesktop
					? "w-1/2"
					: shared.showBillDesktop
						? "w-full bg-neutral-50"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			<Bill {pjlHTML}></Bill>
		</div>

		<div
			class={`flex h-screen justify-center overflow-y-auto bg-blue-100 transition-all duration-300 ${
				shared.showLawDesktop && shared.showBillDesktop
					? "w-1/2"
					: shared.showLawDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			{#if isFetchingArticle}
				<SkeletonArticleLoader />
			{:else if articleFromDb !== undefined}
				<Article
					{articleFromDb}
					pjlDate={shared.pjlDate}
					{associatedText}
					{associatedTextTitle}
				></Article>
			{:else}
				<div
					class="flex h-screen flex-col items-center justify-center p-4 text-center"
				>
					<iconify-icon
						class="text-8xl text-gray-500"
						icon="ri:book-marked-fill"
					></iconify-icon>
					<p class="text-center font-medium text-gray-500 uppercase">
						Cliquez sur une loi
					</p>
					<p class="text-center font-medium text-gray-500 uppercase">
						dans le PLF
					</p>
					<p class="text-center font-medium text-gray-500 uppercase">
						pour l'afficher
					</p>
					<iconify-icon class="text-8xl text-gray-500" icon="ri:arrow-left-line"
					></iconify-icon>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-x-hidden">
		<div
			class="z-10 h-screen w-full overflow-y-auto shadow-md"
			class:hidden={shared.activePanelMobile !== "bill"}
		>
			<Bill {pjlHTML}></Bill>
		</div>

		<div
			bind:this={lawContainer}
			class="h-screen w-full overflow-y-auto bg-blue-100"
			class:hidden={shared.activePanelMobile !== "law"}
		>
			{#if isFetchingArticle}
				<div
					class="flex h-screen flex-col items-center justify-center text-center"
				>
					<SkeletonArticleLoader />
				</div>
			{:else if articleFromDb !== undefined}
				<Article
					{articleFromDb}
					pjlDate={shared.pjlDate}
					{associatedText}
					{associatedTextTitle}
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
						Cliquez sur une loi
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						dans le PLF
					</p>
					<p class="flex items-center font-medium text-gray-500 uppercase">
						pour l'afficher
					</p>
					<iconify-icon class="text-8xl text-gray-500" icon="ri:arrow-left-line"
					></iconify-icon>
				</div>
			{/if}
		</div>
	</div>
{/if}
