<script lang="ts">
	import { page } from "$app/state"
	import Article from "$lib/components/Article.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import {
		activePanelMobile,
		isMobilePhone,
		showBillDesktop,
		showLawDesktop,
	} from "$lib/navStore"
	import type { LegiArticle } from "@tricoteuses/legifrance"
	import type { PageProps } from "./$types"

	let isFetchingArticle = $state(false)

	let { data }: PageProps = $props()

	let articleJson: LegiArticle | undefined = $state(undefined)
	let lawArticle = $derived(page.url.searchParams.get("lawArticle") || "")
	let pjlHTML = $state(data.pjlHTML)

	$effect(() => {
		if (lawArticle) {
			isFetchingArticle = true
			fetch(`/api/article/${lawArticle}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					isFetchingArticle = false
					articleJson = data
				})
				.catch(() => (lawArticle = ""))
		} else {
			articleJson = undefined
		}
	})
</script>

{#if !$isMobilePhone}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		<div
			class={`z-10 origin-right overflow-y-auto shadow-xl transition-all duration-300 ${
				$showBillDesktop && $showLawDesktop
					? "w-1/2"
					: $showBillDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			<Bill {pjlHTML}></Bill>
		</div>

		<div
			class={`overflow-y-auto bg-blue-100 transition-all duration-300 ${
				$showLawDesktop && $showBillDesktop
					? "w-1/2"
					: $showLawDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			{#if isFetchingArticle}
				Article en cours de récupération...
			{/if}
			{#if articleJson !== undefined}
				<Article {articleJson}></Article>
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
{:else}
	<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
		{#if $activePanelMobile === "bill"}
			<div class="z-10 h-screen w-full overflow-y-auto shadow-md">
				<Bill {pjlHTML}></Bill>
			</div>
		{:else if $activePanelMobile === "law"}
			<div class="h-screen w-full overflow-y-auto bg-blue-100">
				{#if isFetchingArticle}
					Article en cours de récupération...
				{/if}
				{#if articleJson !== undefined}
					<Article {articleJson}></Article>
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
						<iconify-icon
							class="text-8xl text-gray-500"
							icon="ri:arrow-left-line"
						></iconify-icon>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
