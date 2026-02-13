<script lang="ts">
	import { resolve } from "$app/paths"
	import { page } from "$app/state"

	import { type Pathname } from "$app/types"
	import { formatDateFrAbrege, shared } from "$lib/shared.svelte"

	interface Props {
		data?: {
			date_debut?: string | null
			date_fin?: string | null
			article_type?: string | null
			etat?: string | null
			legi_id: string
			is_version_citee?: boolean
		}
		labelArticleType?: (type?: string | null) => string
		titleArticleType?: (type?: string | null) => string
		labelEtatVersion?: (etat?: string | null) => string
		etatVersions?: ReadonlyArray<{
			value: string
			label: string
			categorie: string
		}>
	}
	let {
		data,
		labelArticleType,
		titleArticleType,
		labelEtatVersion,
		etatVersions,
	}: Props = $props()

	let labelVersion = $state("")
	let isJORFVersion = $derived(data?.legi_id.startsWith("JORF") || false)

	$effect(() => {
		if (!data) {
			labelVersion = ""
			return
		}
		// --- Condition spéciale JORF ---
		else if (isJORFVersion) {
			labelVersion = "Version publiée au Journal Officiel"
			return
		} else {
			const start = data.date_debut ? new Date(data.date_debut) : null
			let end = data.date_fin ? new Date(data.date_fin) : null

			if (end?.getFullYear() === 2999) end = null

			if (start && end)
				labelVersion = `Version du ${formatDateFrAbrege(data.date_debut ?? null)} au ${formatDateFrAbrege(data.date_fin ?? null)}`
			else if (start)
				labelVersion = `Version depuis le ${formatDateFrAbrege(data.date_debut ?? null)}`
			else if (end)
				labelVersion = `Version jusqu’au ${formatDateFrAbrege(data.date_fin ?? null)}`
			else labelVersion = "Version sans date"
		}
	})

	// Retourne la catégorie d'un état (pour le style CSS)
	// Retourne la classe de couleur pour le badge d'état
	function getEtatBadgeColor(etat?: string | null): string {
		const found = etatVersions?.find((e) => e.value === etat)
		const categorie = found?.categorie

		if (categorie === "vigueur") return "bg-green-200"
		if (categorie === "supprime") return "bg-red-200"
		return "bg-blue-50"
	}
</script>

<div class="flex flex-col gap-y-1 leading-tight">
	<div class="1">
		{#if !data?.is_version_citee && data?.legi_id}
			{@const urlToNavigate = new URL(page.url)}
			{urlToNavigate.searchParams.set("citant", data?.legi_id)}
			{urlToNavigate.searchParams.delete("summary")}
			<a
				href={resolve(
					`${urlToNavigate.pathname}${urlToNavigate.search}` as Pathname,
				)}
				onclick={() => {
					shared.showCitingDesktop = true
					shared.showSummaryDesktop = false
					if (shared.isMobilePhone) {
						shared.activePanelMobile = "citing"
					}
				}}
				class="text-le-gris-dispositif-dark hover:text-le-gris-dispositif-darker underline underline-offset-4"
				>{labelVersion}</a
			>
		{:else}
			<span>{labelVersion}</span>
		{/if}
		{#if !data?.legi_id.startsWith("JORF")}
			<span
				class={`rounded-md border border-neutral-300 px-1 text-xs tracking-wide text-neutral-600 ${getEtatBadgeColor(data?.etat)}`}
			>
				{labelEtatVersion?.(data?.etat) ?? data?.etat ?? "état inconnu"}
			</span>

			{#if data?.article_type && ["ENTIEREMENT_MODIF", "PARTIELLEMENT_MODIF"].includes(data.article_type)}
				<span
					title={titleArticleType?.(data?.article_type) ?? data?.article_type}
					class="rounded-md border border-neutral-300 bg-neutral-100 px-1 text-xs tracking-wide text-neutral-600 underline decoration-neutral-400 decoration-dotted"
				>
					{labelArticleType?.(data?.article_type) ?? data?.article_type}
				</span>
			{/if}
		{/if}
	</div>
</div>
