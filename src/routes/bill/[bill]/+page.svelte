<script lang="ts">
	import { page } from "$app/state"
	import Article from "$lib/components/Article.svelte"
	import Bill from "$lib/components/Bill.svelte"
	import type { LegiArticle } from "@tricoteuses/legifrance"
	import type { PageProps } from "./$types"

	let activePanel: "bill" | "law" = "bill"
	let screenWidth = $state(1024)
	let isMobilePhone = $derived(screenWidth < 768)

	let { data }: PageProps = $props()

	let articleJson: LegiArticle | undefined = $state(undefined)
	let lawArticle = $derived(page.url.searchParams.get("lawArticle") || "")
	let billHTML = $state(data.billHTML)

	$effect(() => {
		if (lawArticle) {
			fetch(`/api/article/${lawArticle}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => (articleJson = data))
				.catch(() => (lawArticle = ""))
		}
	})
</script>

<svelte:window bind:innerWidth={screenWidth} />
<div class="fixed flex min-h-full w-full flex-row overflow-hidden">
	<div class="h-screen w-1/2 overflow-y-auto"><Bill {billHTML}></Bill></div>
	<div class="h-screen w-1/2 overflow-y-auto bg-blue-100">
		{#if articleJson !== undefined}
			<Article {articleJson}></Article>
		{:else}
			<p>Cliquez sur une loi</p>
			<p>dans le PLF</p>
			<p>pour l'afficher</p>
		{/if}
	</div>
</div>
