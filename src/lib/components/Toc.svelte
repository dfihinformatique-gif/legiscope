<script lang="ts">
	import { resolve } from "$app/paths"
	import { page } from "$app/state"
	import { type Pathname } from "$app/types"
	import type { ArticleInfo, TocData, TocDataRow } from "$lib/db_data_types"
	import { formatDateFr } from "$lib/shared.svelte"
	import AlertDatabaseMessage from "./ui_transverse_components/AlertDatabaseMessage.svelte"

	interface Props {
		articleInfo: ArticleInfo
		date: string
	}
	let { articleInfo, date }: Props = $props()
	let tocData: TocData | undefined = $state(undefined)
	let articleIsNotInValidSection = $state(false)

	let topLevelItems = $derived(getTopLevelItems(tocData))
	let activeArticleChemin = $derived(
		tocData !== undefined
			? (getActiveArticleChemin(tocData)?.[0]?.chemin ?? "")
			: "",
	)

	let activeEl: HTMLElement | null = $state(null)

	$effect(() => {
		if (activeEl !== null) {
			;(activeEl as HTMLElement).scrollIntoView({
				behavior: "smooth",
				block: "center",
			})
		}
	})

	$effect(() => {
		fetch(`/api/toc/${articleInfo.text}/${date}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				tocData = data
				const articleRow = (tocData as TocData).find(
					(scta: TocDataRow) =>
						scta.dernier_segment === articleInfo.article?.legi_id,
				)
				articleIsNotInValidSection = articleRow?.invalid_sections === "1"
			})
			.catch(() => (tocData = undefined))
	})

	const TocItemRecursive = ({
		item,
		allTocItems,
		currentActiveChemin,
	}: {
		item: TocDataRow
		allTocItems: TocData
		currentActiveChemin: string
	}) => {
		const isBranchActive = currentActiveChemin.startsWith(item.chemin)
		let open = $state(isBranchActive)

		const itemPathLevel = item.chemin.split(".").length
		const children = $derived(
			allTocItems.filter((child) => {
				const isDescendant = child.chemin.startsWith(item.chemin + ".")
				if (!isDescendant) return false

				const isDirectChild =
					child.chemin.split(".").length === itemPathLevel + 1
				return isDirectChild
			}),
		)

		const title =
			item.type_objet === "scta"
				? item.titre
				: item.num
					? `Article ${item.num}`
					: "Article sans numéro"

		return {
			get item() {
				return item
			},
			get open() {
				return open
			},
			set open(value) {
				open = value
			},
			get children() {
				return children
			},
			get title() {
				return title
			},
		}
	}

	function getTopLevelItems(
		data: TocData | undefined,
	): TocDataRow[] | undefined {
		if (!data) {
			return undefined
		}
		return data.filter((item) => item.tri_hierarchique?.length === 4)
	}

	function getActiveArticleChemin(data: TocData): TocDataRow[] | undefined {
		if (!data) {
			return undefined
		}
		return data.filter(
			// (item) => item.dernier_segment === articleInfo.article?.legi_id,
			(item) => item.dernier_segment === page.url.searchParams.get("article"),
		)
	}
</script>

{#if articleIsNotInValidSection}
	<AlertDatabaseMessage>
		Les données disponibles ne permettent pas d'afficher le contexte de cet
		article à la date du {formatDateFr(date)}

		<p>Ci-dessous est reproduit le sommaire du texte à la date demandée.</p>
	</AlertDatabaseMessage>
{/if}

<ul class="translate-1">
	{#if topLevelItems !== undefined}
		{#each topLevelItems as item, indexItem (indexItem)}
			{@render itemComponent(item)}
		{/each}
	{/if}
</ul>

{#snippet itemComponent(item: TocDataRow)}
	{@const tocItem = TocItemRecursive({
		item: item,
		allTocItems: tocData!,
		currentActiveChemin: activeArticleChemin,
	})}
	<li
		class="border-le-gris-dispositif-light border-l py-1 pl-3"
		class:border-l={item.niveau !== 1}
		class:border-le-gris-dispositif-light={item.niveau !== 1}
	>
		<button
			class="text-le-gris-dispositif-dark lx-link-text my-0.5 -ml-1 cursor-pointer text-left xl:text-lg"
			onclick={() => {
				tocItem.open = !tocItem.open
			}}
		>
			{#if tocItem.children.length > 0}
				<iconify-icon
					class="align-[-0.2rem] text-lg no-underline"
					icon={tocItem.open
						? "ri:checkbox-indeterminate-fill"
						: "ri:add-box-fill"}
				></iconify-icon>
			{/if}
			{#if item.chemin === activeArticleChemin}
				<span
					class="rounded-md bg-white p-2 font-bold text-[#835454]"
					bind:this={activeEl}>{tocItem.title}</span
				>
			{:else if item.chemin.includes("LEGIARTI") || item.chemin.includes("JORFARTI")}
				<a
					href="{resolve(
						page.url.pathname as Pathname,
					)}?article={item.dernier_segment}&summary=true">{tocItem.title}</a
				>
			{:else}
				<span class:font-bold={tocItem.open}>{tocItem.title}</span>
			{/if}
		</button>

		{#if tocItem.open && tocItem.children.length > 0}
			<ul class="translate-1">
				{#each tocItem.children as child, childIndex (childIndex)}
					{@render itemComponent(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}
