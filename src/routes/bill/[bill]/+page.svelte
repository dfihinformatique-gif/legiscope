<script lang="ts">
	import { page } from "$app/state"
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
	let articleNum: String | undefined = $derived(
		articleJson ? articleJson.META?.META_SPEC?.META_ARTICLE?.NUM : undefined,
	)
	let articleTextcontent: String | undefined = $derived(
		articleJson ? articleJson.BLOC_TEXTUEL?.CONTENU : undefined,
	)
	let isLoadingArticle = $state(false)

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
	<div class="h-screen w-1/2 overflow-y-auto bg-amber-200">
		{#if articleJson !== undefined}
			{#if articleJson}
				{#if articleNum !== undefined}
					<span class="font-bold">Article {articleNum}</span>
				{/if}
				{#if articleTextcontent !== undefined}
					<span>{@html articleTextcontent}</span>
				{/if}
			{/if}
		{:else}
			<div class="h-screen w-1/2 overflow-y-auto bg-amber-200">
				<p>Ici la loi</p>
				<p>lorem ipsum</p>
			</div>
		{/if}
	</div>
</div>
