<script lang="ts">
	import Article from "$lib/components/Article.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import SkeletonArticleLoader from "$lib/components/SkeletonArticleLoader.svelte"
	import { shared } from "$lib/shared.svelte"
	import type { PageProps } from "./$types"

	let { data }: PageProps = $props()
	let pjlHTML = $state(data.pjlHTML)

	let showParameterModal = $state(false)
	let parametersToVariables = $state<Record<string, string[]>>({})

	let lawContainer: HTMLDivElement | undefined = $state()

	$effect(() => {
		if (shared.activePanelMobile === "law" && lawContainer !== undefined) {
			lawContainer.scrollTo({ top: 0, behavior: "auto" })
		}
	})

	$effect(() => {
		if (data.articleInfoPromise) {
			data.articleInfoPromise.then((articleInfo) => {
				shared.activePanelMobile = "law"
			})
		}
	})

	$effect(() => {
		shared.pjlDate = data.pjlDate ?? shared.pjlDate
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
			<Bill {pjlHTML} {showParameterModal} {parametersToVariables}></Bill>
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
			{#if data.articleInfoPromise !== undefined}
				{#await data.articleInfoPromise}
					<SkeletonArticleLoader />
				{:then articleInfo}
					<Article
						{articleInfo}
						pjlDate={shared.pjlDate}
						{showParameterModal}
						{parametersToVariables}
					></Article>
				{:catch error}
					<p>Erreur: {error.message}</p>
				{/await}
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
		</div>
	</div>
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-x-hidden">
		<div
			class="z-10 h-screen w-full overflow-y-auto shadow-md"
			class:hidden={shared.activePanelMobile !== "bill"}
		>
			<Bill {pjlHTML} {showParameterModal} {parametersToVariables}></Bill>
		</div>

		<div
			bind:this={lawContainer}
			class="h-screen w-full overflow-y-auto bg-blue-100"
			class:hidden={shared.activePanelMobile !== "law"}
		>
			{#if data.articleInfoPromise !== undefined}
				{#await data.articleInfoPromise}
					<div
						class="flex h-screen flex-col items-center justify-center text-center"
					>
						<SkeletonArticleLoader />
					</div>
				{:then articleInfo}
					<Article
						{articleInfo}
						pjlDate={shared.pjlDate}
						{showParameterModal}
						{parametersToVariables}
					></Article>
				{:catch error}
					<p>Erreur: {error.message}</p>
				{/await}
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
		</div>
	</div>
{/if}
{#if showParameterModal}
	<div>
		{parametersToVariables}
	</div>
{/if}
