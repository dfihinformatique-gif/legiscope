<script lang="ts">
	import type { Legiarti, TocData, TocDataRow } from "$lib/db_data_types"
	import { shared } from "$lib/shared.svelte"

	interface Props {
		articleFromDb: Legiarti
		associatedText: string
	}
	let { articleFromDb, associatedText }: Props = $props()
	let tocData: TocData | undefined = $state(undefined)

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

	fetch(`/api/toc/${associatedText}/${shared.pjlDate}`)
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => (tocData = data))
		.catch(() => (tocData = undefined))

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
			item.type_objet === "scta" ? item.titre : `Article ${item.num}`

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
		return data.filter((item) => item.dernier_segment === articleFromDb.legi_id)
	}
</script>

<ul class="translate-1">
	{#if topLevelItems !== undefined}
		{#each topLevelItems as item}
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
	<li class="border-le-gris-dispositif-light border-l py-1 pl-3">
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
				<span bind:this={activeEl}>{tocItem.title}</span>
			{:else}
				<span>{tocItem.title}</span>
			{/if}
		</button>

		{#if tocItem.open && tocItem.children.length > 0}
			<ul class="translate-1">
				{#each tocItem.children as child}
					{@render itemComponent(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}
