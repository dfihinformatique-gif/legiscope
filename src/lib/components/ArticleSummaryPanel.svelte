<script lang="ts">
	import { goto } from "$app/navigation"
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import Toc from "$lib/components/Toc.svelte"
	import type { ArticleInfo } from "$lib/db_data_types"
	import { shared } from "$lib/shared.svelte"
	import { SvelteURLSearchParams } from "svelte/reactivity"

	interface Props {
		articleInfo: ArticleInfo
		date: string
	}
	let { articleInfo, date }: Props = $props()
</script>

<button
	class="bg-le-gris-dispositif peer hover:bg-le-gris-dispositif-dark fixed top-8 right-6 z-40 z-50 flex cursor-pointer items-center justify-center rounded-b-full px-3 pt-8 pb-2 text-white hover:translate-y-4"
	title="Fermer le sommaire"
	onclick={() => {
		const searchParams = new SvelteURLSearchParams(page.url.searchParams)
		searchParams.delete("summary")
		shared.activePanelMobile = "law"
		goto(
			resolve(`${page.url.pathname}?${searchParams.toString()}` as Pathname),
			{
				replaceState: true,
				noScroll: true,
			},
		)
	}}
>
	<iconify-icon class="align-[-0.4rem] text-2xl" icon="ri-close-large-line"
	></iconify-icon></button
>
<div
	class="pointer-events-none absolute inset-0 z-40 w-1/3 justify-self-end
         bg-linear-to-r
         from-transparent
         to-transparent
         transition peer-hover:from-transparent peer-hover:to-blue-100"
></div>

<header
	class="my-5 mr-10 flex flex-col justify-between gap-x-5 px-4 md:flex-row md:items-center lg:px-0"
>
	<!--Titre-->
	<h1 class="flex-wrap text-left font-sans text-2xl text-neutral-900">
		<iconify-icon
			class="align-[-0.25rem] text-2xl"
			icon="ri:menu-unfold-3-line"
		>
		</iconify-icon>
		<span class="font-light"> Sommaire ・</span>
		{articleInfo.textTitle}
	</h1>
</header>

<div class="mb-20 bg-blue-50 p-4 pb-20 shadow-md">
	<Toc {articleInfo} {date}></Toc>
</div>
