<script lang="ts">
	import { page } from "$app/state"
	import Article from "$lib/components/Article.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import SkeletonArticleLoader from "$lib/components/SkeletonArticleLoader.svelte"
	import {
		activePanelMobile,
		isMobilePhone,
		showBillDesktop,
		showLawDesktop,
	} from "$lib/navStore"
	import type { LegiArticle } from "@tricoteuses/legifrance"
	import { writable } from "svelte/store"
	import type { PageProps } from "./$types"

	let isFetchingArticle = $state(false)

	let { data }: PageProps = $props()

	let articleJson: LegiArticle | undefined = $state(undefined)
	let lawArticle = $derived(page.url.searchParams.get("lawArticle") || "")
	let pjlHTML = $state(data.pjlHTML)

	// Permet que de réintialiser le scroll de la vue lax lorsqu'on a basculé d'onglet, et qu'on reclique sur un lien
	let lawContainer: HTMLDivElement

	const shouldResetLawScroll = writable(false)

	$effect(() => {
		if ($activePanelMobile === "law" && lawContainer) {
			requestAnimationFrame(() => {
				if ($shouldResetLawScroll) {
					lawContainer.scrollTo({ top: 0, behavior: "auto" })
					shouldResetLawScroll.set(false)
				}
			})
		}
	})

	// Permet d'afficher l'article dans la vue law quand on clique sur un lien depuis la bill
	$effect(() => {
		if (lawArticle) {
			isFetchingArticle = true
			fetch(`/api/article/${lawArticle}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					isFetchingArticle = false
					articleJson = data
					if ($isMobilePhone) {
						// Pour mobile : change de vue vers law et reset le scroll
						shouldResetLawScroll.set(true)
						activePanelMobile.set("law")
					}
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
			class={`z-10 h-screen origin-right overflow-y-auto shadow-xl transition-all duration-300 ${
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
			class={`h-screen overflow-y-auto bg-blue-100 transition-all duration-300 ${
				$showLawDesktop && $showBillDesktop
					? "w-1/2"
					: $showLawDesktop
						? "w-full"
						: "pointer-events-none w-0 opacity-0"
			}`}
		>
			{#if isFetchingArticle}
				<SkeletonArticleLoader />
			{:else if articleJson !== undefined}
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
	<div class="fixed flex min-h-full w-full flex-row overflow-x-hidden">
		<div
			class="z-10 h-screen w-full overflow-y-auto shadow-md"
			class:hidden={$activePanelMobile !== "bill"}
		>
			<Bill {pjlHTML}></Bill>
		</div>

		<div
			bind:this={lawContainer}
			class="h-screen w-full overflow-y-auto bg-blue-100"
			class:hidden={$activePanelMobile !== "law"}
		>
			{#if isFetchingArticle}
				<div
					class="flex h-screen flex-col items-center justify-center text-center"
				>
					<SkeletonArticleLoader />
				</div>
			{:else if articleJson !== undefined}
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
{/if}
