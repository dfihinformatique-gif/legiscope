<script lang="ts">
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
	} from "$lib/components/ui/data-table/index.js"
	import * as TableUI from "$lib/components/ui/table/index.js"
	import type {
		ArticleInfo,
		CitationsData,
		CitationsDataRow,
	} from "$lib/db_data_types"
	import {
		type ColumnDef,
		type ColumnFiltersState,
		type ExpandedState,
		getCoreRowModel,
		getExpandedRowModel,
		getFilteredRowModel,
		getGroupedRowModel,
		getSortedRowModel,
		type Row,
		type SortingState,
		type Table,
	} from "@tanstack/table-core"
	import { SvelteMap, SvelteSet } from "svelte/reactivity"
	import SkeletonArticleCitationsLoader from "./../SkeletonArticleCitationsLoader.svelte"
	import AlertDatabaseMessage from "./../ui_transverse_components/AlertDatabaseMessage.svelte"
	import CellVersionArticle from "./CellVersionArticle.svelte"
	import DataTableVersionCitanteButton from "./DataTableVersionCitanteButton.svelte"

	interface Props {
		articleInfo: ArticleInfo
	}

	let { articleInfo }: Props = $props()
	let citationsData: CitationsData | undefined = $state(undefined)
	let error = $state(false)
	$effect(() => {
		fetch(`/api/citations/${articleInfo.article?.legi_id}`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				citationsData = data
			})
			.catch(() => {
				citationsData = undefined
				error = true
			})
	})

	let grouping = $state<string[]>([
		"article_citant_texte_nature",
		"article_citant",
		"version_citante",
	])
	let sorting = $state<SortingState>([
		{ id: "article_citant_texte_nature", desc: false },
		{ id: "date_debut_cite", desc: true },
	])
	let expanded = $state<ExpandedState>({})
	let lastInitializedGrouping = $state<string | null>(null)
	let columnFilters = $state<ColumnFiltersState>([])
	let showFiltersPanel = $state(false)
	let selectedArticleTypes = $state<string[]>([])
	let selectedTextNatures = $state<string[]>([])
	let selectedVersionEtats = $state<string[]>([])
	let filterEnVigueurOnly = $state(false)

	/* ARTICLES_TYPES des versions */

	// Mapping des types d'article
	const ARTICLE_TYPES = [
		{
			value: "AUTONOME",
			label: "Autonome",
			title:
				"Version autonome, c'est-à-dire dont le contenu complète le droit. Par opposition aux versions modifiant un article.",
		},
		{
			value: "ENTIEREMENT_MODIF",
			label: "Modificatrice",
			title:
				"Version entièrement modificatrice, c'est-à-dire dont le contenu vise à modifier le contenu d'autres articles. Par opposition aux versions autonomes dont le contenu s'ajoute au droit.",
		},
		{
			value: "PARTIELLEMENT_MODIF",
			label: "Autonome et modificatrice",
			title:
				"Version à la fois autonome et modificatrice, c'est-à-dire dont le contenu complète le droit, et aussi, vise à modifier d'autres articles.",
		},
	]

	// Formate le type d'article en label lisible
	function labelArticleType(type?: string | null): string {
		const found = ARTICLE_TYPES.find((t) => t.value === type)
		return found?.label ?? type ?? ""
	}

	// Formate le type d'article en title lisible
	function titleArticleType(type?: string | null): string {
		const found = ARTICLE_TYPES.find((t) => t.value === type)
		return found?.title ?? type ?? ""
	}

	/* ÉTATS DES VERSIONS */

	// Mapping des états des versions
	const ETAT_VERSIONS = [
		{ value: "VIGUEUR", label: "En vigueur", categorie: "vigueur" },
		{
			value: "VIGUEUR_DIFF",
			label: "En vigueur différé",
			categorie: "vigueur",
		},
		{ value: "VIGUEUR_ETEN", label: "En vigueur étendu", categorie: "vigueur" },
		{
			value: "VIGUEUR_NON_ETEN",
			label: "En vigueur non étendu",
			categorie: "vigueur",
		},
		{ value: "ABROGE", label: "Abrogée", categorie: "supprime" },
		{ value: "ABROGE_DIFF", label: "Abrogée diff", categorie: "supprime" },
		{ value: "ANNULE", label: "Annulée", categorie: "supprime" },
		{ value: "DENONCE", label: "Dénoncée", categorie: "supprime" },
		{ value: "MODIFIE_MORT_NE", label: "Morte née", categorie: "supprime" },
		{ value: "PERIME", label: "Périmée", categorie: "supprime" },
		{ value: "DEPLACE", label: "Déplacée", categorie: "autre" },
		{ value: "DISJOINT", label: "Disjointe", categorie: "autre" },
		{ value: "MODIFIE", label: "Modifiée", categorie: "autre" },
		{ value: "REMPLACE", label: "Remplacée", categorie: "autre" },
		{ value: "TRANSFERE", label: "Transférée", categorie: "autre" },
		{ value: "CREE", label: "Créée", categorie: "autre" },
	] as const
	const VIGUEUR_ETATS: string[] = ETAT_VERSIONS.filter(
		(etat) => etat.categorie === "vigueur",
	).map((etat) => etat.value)

	// Formate l'état d'une version en label lisible
	function labelEtatVersion(etat?: string | null): string {
		const found = ETAT_VERSIONS.find((e) => e.value === etat)
		return found?.label ?? etat ?? "état inconnu"
	}

	/* TEXTES_NATURES des versions */

	// Ajout d'un label et d'un indicateur de priorité pour les principaux types de textes_natures
	const NATURE_MAPPING: Record<string, { priority: number; label: string }> = {
		CONSTITUTION: { priority: 1, label: "Constitution" },
		LOI_CONSTIT: { priority: 2, label: "Lois constitutionnelles" },
		LOI_ORGANIQUE: { priority: 3, label: "Lois organiques" },
		LOI: { priority: 4, label: "Lois" },
		CODE: { priority: 5, label: "Codes" },
		ORDONNANCE: { priority: 6, label: "Ordonnances" },
		DECRET_LOI: { priority: 7, label: "Décrets-loi" },
		DECRET: { priority: 8, label: "Décrets" },
		Décret: { priority: 8, label: "Décrets" },
		ARRETE: { priority: 9, label: "Arrêtés" },
		Arrêté: { priority: 10, label: "Arrêtés" },
		PROJET: { priority: 11, label: "Projets" },
		TRAITE: { priority: 12, label: "Traités" },
		ACCORD_FONCTION_PUBLIQUE: {
			priority: 13,
			label: "Accord de la fonction publique",
		},
	}

	// Récupère et formate le label d'une nature de texte à partir de son ID

	/* Fonction pour mettre en minuscules sauf la première lettre les textes_natures qui ne sont pas dans le mapping*/
	function capitalizeFirstLetter(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
	}

	/* Fonction princiaple pour récupérer le label à partir de l'ID */
	function getTextNatureLabel(
		nature: string | null | undefined,
		fallbackLabel?: string | null,
	): string {
		if (nature && NATURE_MAPPING[nature]) {
			return NATURE_MAPPING[nature].label
		}
		const raw = fallbackLabel || `Nature ${nature}`
		return capitalizeFirstLetter(raw)
	}

	// Fonction de comparaison de 2 IDs de nature de texte selon leur priorité
	function compareTextNatureIds(
		natureA: string | null,
		natureB: string | null,
	): number {
		const priorityA = (natureA && NATURE_MAPPING[natureA]?.priority) || 99
		const priorityB = (natureB && NATURE_MAPPING[natureB]?.priority) || 99

		if (priorityA !== priorityB) {
			return priorityA - priorityB
		}

		// Si pas d'ID, ordre arbitraire
		return 0
	}

	// Extrait le label de nature des groupes par nature */
	function getGroupeArticlesCitantsTexteNatureLabel(
		row: Row<CitationsDataRow>,
	): string {
		const firstRow = row.subRows?.[0]?.original
		const nature = firstRow?.article_citant_texte_nature
		return getTextNatureLabel(
			nature,
			row.getValue("article_citant_texte_nature"),
		)
	}

	/** COMPTEUR DU NOMBRE DE CITATIONS */

	// Génère le texte complet du compteur de nombre de ligne enfant (ex: "(3 articles citent cette version)")
	function getInformationNombreEnfant(
		row: Row<CitationsDataRow>,
		columnId: string,
		articleNum?: string | null,
	): string {
		// CALCUL du nombre d'enfant
		/* Pour le cas général :*/
		let count = row.subRows.length

		/*  Pour la vue groupée par "version_citee" :*/
		// On veut compter le nombre total d'articles (niveau 2) et pas le nombre de natures (niveau 1)
		if (
			columnId === "version_citee" &&
			grouping.includes("article_citant_texte_nature")
		) {
			count = row.subRows.reduce(
				(acc: number, subRow: Row<CitationsDataRow>) =>
					acc + (subRow.subRows?.length ?? 0),
				0,
			)
		}

		// TEXTE
		const article = articleNum ?? "étudié"

		if (columnId === "version_citante") {
			return `(${count} ${
				count > 1
					? `versions de l'art. ${article} citées`
					: `version de l'art. ${article} citée`
			})`
		}

		if (columnId === "version_citee") {
			return `(${count} ${
				count > 1
					? "articles citent cette version"
					: "article cite cette version"
			})`
		}

		return `(${count} ${
			count > 1
				? `versions citent l'art. ${article}`
				: `version cite l'art. ${article}`
		})`
	}

	// DÉFINITION DES COLONNES DU TABLEAU (TanStack Table)
	const columns: ColumnDef<CitationsDataRow>[] = [
		{
			accessorKey: "article_citant_texte_nature",
			header: "Nature",
			enableGrouping: true,
			cell: ({ row, getValue }) => {
				return getTextNatureLabel(
					row.original.article_citant_texte_nature,
					getValue() as string,
				)
			},
			filterFn: (row, columnId, filterValues) => {
				if (!filterValues || filterValues.length === 0) return true

				const value = row.getValue(columnId)
				return value !== null && filterValues.includes(value)
			},
			sortingFn: (rowA, rowB) => {
				const natureA = rowA.getIsGrouped()
					? rowA.subRows[0]?.original.article_citant_texte_nature
					: rowA.original.article_citant_texte_nature
				const natureB = rowB.getIsGrouped()
					? rowB.subRows[0]?.original.article_citant_texte_nature
					: rowB.original.article_citant_texte_nature
				return compareTextNatureIds(natureA, natureB)
			},
		},
		{
			id: "article_citant",
			header: ({ table: tableInstance }) =>
				renderComponent(DataTableVersionCitanteButton, {
					onclick: () => {
						// Inverser le tri des groupes de nature
						const currentDesc =
							sorting.find((s) => s.id === "article_citant_texte_nature")
								?.desc ?? false
						const newSorting = [
							{ id: "article_citant_texte_nature", desc: !currentDesc },
							{ id: "date_debut_cite", desc: true },
						]
						tableInstance.setSorting(newSorting)
						sorting = newSorting
					},
					grouping,
					articleNum: articleInfo.article?.num,
				}),
			accessorFn: (row) => {
				const titre = row.titre_text_citant || ""
				const num = row.num_citant || ""
				return num ? `Article ${num} du ${titre}` : titre
			},
			cell: ({ getValue }) => getValue() as string,
			enableGrouping: true,
			getGroupingValue: (row) => `${row.titre_text_citant}-${row.num_citant}`,
		},
		{
			id: "version_citante",
			header: "Version citante",
			enableGrouping: true,
			getGroupingValue: (row: CitationsDataRow) =>
				`${row.date_debut_citant ?? ""}|${row.date_fin_citant ?? ""}|${row.etat_citant ?? ""}|${row.article_type_citant ?? ""}`,
			cell: ({ row }) => {
				if (row.getIsGrouped()) {
					// Si une version de l'article citant est présente plusieurs fois, firstSubRow utilise les infos de la première sous-ligne pour le groupe
					const firstSubRow = row.subRows[0]?.original
					if (firstSubRow) {
						return renderComponent(CellVersionArticle, {
							data: {
								date_debut: firstSubRow.date_debut_citant,
								date_fin: firstSubRow.date_fin_citant,
								etat: firstSubRow.etat_citant,
								article_type: firstSubRow.article_type_citant,
								legi_id: firstSubRow.legi_id_citant,
								is_version_citee: false,
							},
							labelArticleType,
							titleArticleType,
							labelEtatVersion,
							etatVersions: ETAT_VERSIONS,
						})
					}
					return ""
				} else {
					return renderComponent(CellVersionArticle, {
						data: {
							date_debut: row.original.date_debut_citant,
							date_fin: row.original.date_fin_citant,
							etat: row.original.etat_citant,
							article_type: row.original.article_type_citant,
							legi_id: row.original.legi_id_citant,
							is_version_citee: false,
						},
						labelArticleType,
						titleArticleType,
						labelEtatVersion,
						etatVersions: ETAT_VERSIONS,
					})
				}
			},
		},
		{
			accessorKey: "article_type_citant",
			header: "Type de la version de l'article citant",
			enableHiding: true,
			filterFn: (row, columnId, filterValues) => {
				if (!filterValues || filterValues.length === 0) return true

				const value = row.getValue(columnId)
				return filterValues.includes(value)
			},
		},
		{
			accessorKey: "etat_citant",
			header: "État de la version citant",
			filterFn: (row, columnId, filterValues) => {
				if (!filterValues || filterValues.length === 0) return true

				const value = row.getValue(columnId)
				return filterValues.includes(value)
			},
		},
		{
			accessorKey: "titre_text_citant",
			header: "titre_text_citant",
			enableHiding: true,
		},
		{
			accessorKey: "num_citant",
			header: "num_citant",
			enableHiding: true,
		},
		{
			id: "version_citee",
			header: "Version de cet article qui est citée",
			cell: ({ row }) => {
				const dataRow = row.getIsGrouped()
					? row.getLeafRows()[0]?.original
					: row.original

				if (!dataRow) return ""

				return renderComponent(CellVersionArticle, {
					data: {
						date_debut: dataRow.date_debut_cite,
						date_fin: dataRow.date_fin_cite,
						etat: dataRow.etat_cite,
						article_type: dataRow.article_type_cite,
						legi_id: dataRow.legi_id_cite,
						is_version_citee: true,
					},
					labelArticleType,
					titleArticleType,
					labelEtatVersion,
					etatVersions: ETAT_VERSIONS,
				})
			},
			enableGrouping: true,
			getGroupingValue: (row) => `${row.date_debut_cite}-${row.date_fin_cite}`,
		},
		{
			accessorKey: "legi_id_cite",
			header: "legi_id_cite",
			enableHiding: true,
		},
		{
			accessorKey: "date_debut_cite",
			header: "date_debut_cite",
			cell: ({ getValue }) => {
				const date = getValue() as string | null
				return date ? new Date(date).toISOString().split("T")[0] : ""
			},
			enableHiding: true,
		},
		{
			accessorKey: "date_fin_cite",
			header: "date_fin_cite",
			cell: ({ getValue }) => {
				const date = getValue() as string | null
				return date ? new Date(date).toISOString().split("T")[0] : ""
			},
			enableHiding: true,
		},
		{
			accessorKey: "num_cite",
			header: "num_cite",
			enableHiding: true,
		},
		{
			accessorKey: "article_type_cite",
			header: "article_type_cite",
			enableHiding: true,
		},
		{
			accessorKey: "etat_cite",
			header: "etat_cite",
			enableHiding: true,
		},
		{
			accessorKey: "legi_id_citant",
			header: "legi_id_citant",
			enableHiding: true,
		},
		{
			accessorKey: "date_debut_citant",
			header: "date_debut_citant",
			enableHiding: true,

			cell: ({ getValue }) => {
				const date = getValue() as string | null
				return date ? new Date(date).toISOString().split("T")[0] : ""
			},
		},
		{
			accessorKey: "date_fin_citant",
			header: "date_fin_citant",
			enableHiding: true,

			cell: ({ getValue }) => {
				const date = getValue() as string | null
				return date ? new Date(date).toISOString().split("T")[0] : ""
			},
		},

		{
			accessorKey: "legitext_id_citant",
			header: "legitext_id_citant",
			enableHiding: true,
		},
	]
	const defaultColumnOrder = columns.map(
		(column) =>
			column.id ||
			("accessorKey" in column ? (column.accessorKey as string) : ""),
	)
	let columnOrder = $state<string[]>(defaultColumnOrder)

	let table: Table<CitationsDataRow> | undefined = $state()

	/** INITIALISATION DE LA TABLE APRÈS CHARGEMENT DES DONNÉES (TanStack Table)*/
	$effect(() => {
		if (citationsData !== undefined) {
			table = createSvelteTable({
				get data() {
					return citationsData as CitationsDataRow[]
				},
				columns,
				getCoreRowModel: getCoreRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getGroupedRowModel: getGroupedRowModel(),
				getExpandedRowModel: getExpandedRowModel(),
				getFilteredRowModel: getFilteredRowModel(),
				get state() {
					return {
						grouping,
						sorting,
						expanded,
						columnFilters,
						columnOrder,
					}
				},
				onGroupingChange: (updater) => {
					grouping = typeof updater === "function" ? updater(grouping) : updater
				},
				onSortingChange: (updater) => {
					if (typeof updater === "function") {
						sorting = updater(sorting)
					} else {
						sorting = updater
					}
				},
				onExpandedChange: (updater) => {
					expanded = typeof updater === "function" ? updater(expanded) : updater
				},
				onColumnFiltersChange: (updater) => {
					if (typeof updater === "function") {
						columnFilters = updater(columnFilters)
					} else {
						columnFilters = updater
					}
				},
				onColumnOrderChange: (updater) => {
					columnOrder =
						typeof updater === "function" ? updater(columnOrder) : updater
				},
				initialState: {
					columnVisibility: {
						article_type_citant: false,
						etat_citant: false,
						legi_id_cite: false,
						legi_id_citant: false,
						legitext_id_citant: false,
						titre_text_citant: false,
						num_citant: false,
						date_debut_citant: false,
						date_fin_citant: false,
						num_cite: false,
						date_debut_cite: false,
						date_fin_cite: false,
						article_type_cite: false,
						etat_cite: false,
					},
				},
			})
		}
	})

	/** EXPANSION AUTOMATIQUE DES ACCORDÉONS DES GROUPES */

	$effect(() => {
		if (table && grouping[0] !== lastInitializedGrouping) {
			const groups = table.getGroupedRowModel().rows
			let changed = false
			const newExpanded = typeof expanded === "object" ? { ...expanded } : {}

			// Ouvrir les groupes de premier niveau pour la vue article_citant_texte_nature
			if (grouping[0] === "article_citant_texte_nature") {
				for (const row of groups) {
					if (!newExpanded[row.id]) {
						newExpanded[row.id] = true
						changed = true
					}
				}
			}

			// Ouvrir uniquement les groupes de nature de texte (niveau 1) pour la vue version_citee
			// Ne PAS ouvrir les groupes de version (niveau 0)
			if (grouping[0] === "version_citee") {
				for (const versionGroup of groups) {
					// Ouvrir les groupes de nature de texte (sous-groupes de niveau 1)
					if (versionGroup.subRows) {
						for (const natureGroup of versionGroup.subRows) {
							if (!newExpanded[natureGroup.id]) {
								newExpanded[natureGroup.id] = true
								changed = true
							}
						}
					}
				}
			}

			if (changed) {
				expanded = newExpanded
			}

			// Marquer cette vue comme initialisée
			lastInitializedGrouping = grouping[0]
		}
	})

	/* FILTRE PAR TYPE D'ARTICLE */
	// Fonction pour gérer les filtres de type d'article
	function toggleArticleTypeFilter(type: string) {
		if (selectedArticleTypes.includes(type)) {
			selectedArticleTypes = selectedArticleTypes.filter((t) => t !== type)
		} else {
			selectedArticleTypes = [...selectedArticleTypes, type]
		}

		// Apply the array of selected types as filter value; the custom filterFn will handle inclusion
		table
			?.getColumn("article_type_citant")
			?.setFilterValue(selectedArticleTypes)
	}

	// Scanner toutes les citations pour trouver tous les types d'article réellements présents pour l'article
	let availableArticleTypes = $derived.by(() => {
		if (!citationsData) return []

		const typesSet = new SvelteSet<string>()
		for (const row of citationsData) {
			const type = row.article_type_citant
			if (type !== null) {
				typesSet.add(type)
			}
		}

		// Filtrer ARTICLE_TYPES pour ne garder que ceux présents dans les données
		return ARTICLE_TYPES.filter((articleType) =>
			typesSet.has(articleType.value),
		)
	})

	/* FILTRE PAR NATURE DE TEXTE */

	// Fonction pour gérer les filtres de nature de texte
	function toggleTextNatureFilter(nature: string) {
		if (selectedTextNatures.includes(nature)) {
			selectedTextNatures = selectedTextNatures.filter((id) => id !== nature)
		} else {
			selectedTextNatures = [...selectedTextNatures, nature]
		}

		table
			?.getColumn("article_citant_texte_nature")
			?.setFilterValue(selectedTextNatures)
	}

	// Scanner toutes les citations pour trouver toutes les natures de texte réellements présentes pour l'article
	let availableTextNatures = $derived.by(() => {
		if (!citationsData) return []

		const naturesMap = new SvelteMap<string, string>()
		for (const row of citationsData) {
			const nature = row.article_citant_texte_nature
			if (nature !== null) {
				const label = getTextNatureLabel(
					nature,
					row.article_citant_texte_nature,
				)
				naturesMap.set(nature, label)
			}
		}

		// Trier par priorité selon NATURE_MAPPING en utilisant la même fonction que le sortingFn
		return Array.from(naturesMap.entries())
			.map(([nature, label]) => ({ nature, label }))
			.sort((a, b) => compareTextNatureIds(a.nature, b.nature))
	})

	/* FILTRE PAR ÉTAT */

	// Scanner toutes les citations pour trouver tous les états réellements présents pour l'article
	let availableVersionEtats = $derived.by(() => {
		if (!citationsData) return []

		const etatsSet = new SvelteSet<string>()
		for (const row of citationsData) {
			const etat = row.etat_citant
			if (etat !== null) {
				etatsSet.add(etat)
			}
		}

		// Filtrer ETAT_VERSIONS pour ne garder que ceux présents dans les données
		return ETAT_VERSIONS.filter((etatVersion) =>
			etatsSet.has(etatVersion.value),
		)
	})

	// Lister les états de catégorie "vigueur" disponibles pour l'article
	let availableVigueurVersionEtats = $derived(
		availableVersionEtats
			.filter((etat) => etat.categorie === "vigueur")
			.map((etat) => etat.value),
	)

	// Fonction pour gérer les filtres d'état
	function toggleEtatFilter(etat: string) {
		if (selectedVersionEtats.includes(etat)) {
			selectedVersionEtats = selectedVersionEtats.filter(
				(etatString) => etatString !== etat,
			)
		} else {
			selectedVersionEtats = [...selectedVersionEtats, etat]
		}

		// Synchronisation avec le toggle "En vigueur seulement"
		const hasAllVigueur =
			availableVigueurVersionEtats.length > 0 &&
			availableVigueurVersionEtats.every((etatString) =>
				selectedVersionEtats.includes(etatString),
			)

		const hasOnlyVigueur = selectedVersionEtats.every((etatString) =>
			VIGUEUR_ETATS.includes(etatString),
		)
		filterEnVigueurOnly = hasAllVigueur && hasOnlyVigueur

		table?.getColumn("etat_citant")?.setFilterValue(selectedVersionEtats)
	}

	// Fonction pour réinitialiser tous les filtres
	function resetFilters() {
		selectedArticleTypes = []
		selectedTextNatures = []
		selectedVersionEtats = []
		filterEnVigueurOnly = false
		table?.getColumn("article_type_citant")?.setFilterValue(undefined)
		table?.getColumn("article_citant_texte_nature")?.setFilterValue(undefined)
		table?.getColumn("etat_citant")?.setFilterValue(undefined)
	}
</script>

<h2 class="flex items-center pb-2 text-base font-bold text-gray-700">
	Citations de l'article
</h2>
{#if table !== undefined && citationsData && citationsData.length > 0}
	<div class="mt-2 flex w-full flex-col flex-wrap justify-end gap-y-2">
		<div class="mt-1 mb-3 flex items-center justify-end gap-2">
			<div class="flex items-center">
				<!--Toggle "en vigueur seulement" -->
				<label class="inline-flex cursor-pointer items-center">
					<input
						class="peer sr-only"
						type="checkbox"
						bind:checked={filterEnVigueurOnly}
						onchange={() => {
							if (filterEnVigueurOnly) {
								selectedVersionEtats = [...availableVigueurVersionEtats]
							} else {
								// Si le toggle est off, tous les filtres de catégories vigueur sont décochés, mais pas les filtres des autres catégories
								selectedVersionEtats = selectedVersionEtats.filter(
									(etatString) => !VIGUEUR_ETATS.includes(etatString),
								)
							}
							table
								?.getColumn("etat_citant")
								?.setFilterValue(selectedVersionEtats)
						}}
					/>
					<div
						class="peer peer-checked:bg-le-gris-dispositif-dark relative h-6 w-11 shrink-0 rounded-full bg-gray-400 peer-focus:ring-0 peer-focus:outline-none after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
					></div>
					<span
						class="ms-3 text-left text-sm font-medium text-gray-900 sm:text-sm"
					>
						En vigueur seulement
					</span>
				</label>
			</div>
			<!--Bouton "Autres filtres" -->
			<button
				class="lx-link-uppercase text-left font-sans text-sm text-wrap"
				class:text-gray-500={!showFiltersPanel}
				class:text-gray-800={showFiltersPanel}
				onclick={() => {
					showFiltersPanel = !showFiltersPanel
				}}
			>
				<iconify-icon
					class="align-[-0.25rem] text-xl hover:bg-gray-100"
					class:rotate-180={showFiltersPanel}
					icon="ri-filter-3-line"
				></iconify-icon>
				Autres filtres
				{#if selectedArticleTypes.length > 0 || selectedTextNatures.length > 0 || selectedVersionEtats.length > 0}
					<span
						class="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white"
					>
						{selectedArticleTypes.length +
							selectedTextNatures.length +
							selectedVersionEtats.length}
					</span>
				{/if}
			</button>
		</div>

		<!--Boutons des autres filtres lorsque le volet est ouvert-->
		{#if showFiltersPanel}
			<div class="rounded-t-md border bg-neutral-100 p-3">
				<div class="flex justify-between">
					<h3 class="mb-3 font-semibold tracking-wide text-gray-500 uppercase">
						Filtrer les versions :
					</h3>

					{#if selectedArticleTypes.length > 0 || selectedTextNatures.length > 0 || selectedVersionEtats.length > 0}
						<button
							class="mt-3 cursor-pointer text-xs text-blue-600 underline hover:text-blue-800"
							onclick={resetFilters}
						>
							Réinitialiser les filtres
						</button>
					{/if}
				</div>
				<div class="flex flex-wrap justify-between gap-2">
					<div>
						<h4 class="mb-2 text-sm font-semibold text-gray-500">
							Par nature de texte :
						</h4>
						<div class="mb-2 flex flex-wrap gap-2">
							{#each availableTextNatures as textNature, indexTextnature (indexTextnature)}
								<button
									class="relative cursor-pointer rounded-full border px-2 py-1 text-sm tracking-wide transition-colors {selectedTextNatures.includes(
										textNature.nature,
									)
										? 'border-blue-500 bg-blue-100 font-medium text-blue-700'
										: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}"
									onclick={() => toggleTextNatureFilter(textNature.nature)}
								>
									{textNature.label}
									{#if selectedTextNatures.includes(textNature.nature)}
										<iconify-icon
											class="absolute -top-2 -right-1 rounded-full border bg-white text-lg"
											icon="ri-check-line"
										></iconify-icon>
									{/if}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="mb-2 text-sm font-semibold text-gray-500">Par état :</h4>
						<div class="mb-2 flex flex-wrap gap-2">
							{#each availableVersionEtats as etatVersion, indexVersionEtat (indexVersionEtat)}
								<button
									class="relative cursor-pointer rounded-full border px-2 py-1 text-sm tracking-wide transition-colors {selectedVersionEtats.includes(
										etatVersion.value,
									)
										? 'border-blue-500 bg-blue-100 font-medium text-blue-700'
										: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}"
									onclick={() => toggleEtatFilter(etatVersion.value)}
								>
									{etatVersion.label}

									{#if selectedVersionEtats.includes(etatVersion.value)}
										<iconify-icon
											class="absolute -top-2 -right-1 rounded-full border bg-white text-lg"
											icon="ri-check-line"
										></iconify-icon>
									{/if}
								</button>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="mb-2 text-sm font-semibold text-gray-500">
							Par type de version :
						</h4>
						<div class="mb-4 flex flex-wrap gap-2">
							{#each availableArticleTypes as articleType, indexArticleType (indexArticleType)}
								<button
									title={articleType.title}
									class="relative cursor-pointer rounded-full border px-2 py-1 text-sm tracking-wide transition-colors {selectedArticleTypes.includes(
										articleType.value,
									)
										? 'border-blue-500 bg-blue-100 font-medium text-blue-700'
										: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}"
									onclick={() => toggleArticleTypeFilter(articleType.value)}
								>
									<span
										class="underline decoration-neutral-400 decoration-dotted underline-offset-2"
										>{articleType.label}</span
									>

									{#if selectedArticleTypes.includes(articleType.value)}
										<iconify-icon
											class="absolute -top-2 -right-1 rounded-full border bg-white text-lg"
											icon="ri-check-line"
										></iconify-icon>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
	<!--TABLEAU DES CITATIONS -->
	<div
		class="w-full rounded-b-md border bg-white"
		class:rounded-t-md={!showFiltersPanel}
	>
		<TableUI.Root>
			<TableUI.Header>
				<div
					class="mx-2 my-2 flex justify-start @xs/section-article:justify-center @md/section-article:justify-end"
				>
					<!--Bouton "Grouper par" permettant de changer l'organisation du tableau -->
					<button
						onclick={() => {
							if (grouping[0] === "article_citant_texte_nature") {
								grouping = [
									"version_citee",
									"article_citant_texte_nature",
									"article_citant",
								]
								sorting = [{ id: "date_debut_cite", desc: true }]
								columnOrder = [
									"version_citee",
									...defaultColumnOrder.filter((id) => id !== "version_citee"),
								]
							} else {
								grouping = [
									"article_citant_texte_nature",
									"article_citant",
									"version_citante",
								]
								sorting = [
									{ id: "article_citant_texte_nature", desc: false },
									{ id: "date_debut_cite", desc: true },
								]
								columnOrder = defaultColumnOrder
							}
						}}
						><iconify-icon
							class="align-[-0.25rem] text-lg text-gray-500 hover:bg-gray-100"
							icon={grouping[0] === "article_citant_texte_nature"
								? "ri-list-ordered-2"
								: "ri-list-unordered"}
						>
						</iconify-icon>
						<p
							class="lx-link-uppercase hidden text-xs text-gray-500 @md/section-article:inline-flex"
						>
							{grouping[0] === "article_citant_texte_nature"
								? `Grouper par version de l'art. ${articleInfo.article?.num ?? "étudié"}`
								: `Grouper par articles citant l'art. ${articleInfo.article?.num ?? "étudié"}`}
						</p>
						<p
							class="lx-link-uppercase inline-flex text-xs text-wrap text-gray-500 @md/section-article:hidden"
						>
							Grouper
						</p>
					</button>
				</div>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<TableUI.Row>
						{#each headerGroup.headers as header (header.id)}
							{#if !header.isPlaceholder && !["version_citante", "article_citant_texte_nature"].includes(header.column.id) && !(grouping.length > 0 && header.column.id === "version_citee")}
								<TableUI.Head colspan={header.colSpan}>
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</TableUI.Head>
							{/if}
						{/each}
					</TableUI.Row>
				{/each}
			</TableUI.Header>
			<TableUI.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<TableUI.Row data-state={row.getIsSelected() && "selected"}>
						{#each row.getVisibleCells() as cell, cellIndex (cell.id)}
							<!-- Afficher la cellule si elle est groupée OU si elle ne fait pas partie du groupement -->
							{#if cell.getIsGrouped() || !grouping.includes(cell.column.id)}
								<TableUI.Cell
									isSubrow={row.depth > 0}
									isFirstColumn={cellIndex === 0}
									isArticleCitantEmptyColumn={cell.column.id ===
										"article_citant" &&
										row.depth > 1 &&
										!cell.getIsGrouped()}
									colspan={!row.getIsGrouped() &&
									cell.column.id === "version_citante" &&
									grouping.includes("version_citee")
										? 99
										: 1}
								>
									{#if cell.getIsGrouped()}
										{#if cell.column.id === "article_citant_texte_nature"}
											<div
												class="flex items-center gap-1 bg-neutral-50 px-2 font-bold text-gray-400 {grouping.includes(
													'version_citee',
												) && row.depth >= 1
													? 'pl-6'
													: ''}"
											>
												<button
													class="flex items-center"
													onclick={(e) => {
														e.stopPropagation()
														row.toggleExpanded()
													}}
													aria-label="Ouvrir/fermer le volet"
												>
													<iconify-icon
														class="align-[-0.3rem] text-xl hover:bg-gray-100"
														icon={row.getIsExpanded()
															? "ri:arrow-down-s-line"
															: "ri:arrow-right-s-line"}
													>
													</iconify-icon>
												</button>
												<div class="flex items-center gap-2">
													{getGroupeArticlesCitantsTexteNatureLabel(row)}
												</div>
											</div>
										{:else}
											<div
												class="flex items-center gap-1 rounded px-2 py-3 font-semibold {(grouping.includes(
													'version_citante',
												) &&
													row.depth == 2) ||
												(grouping.includes('version_citee') && row.depth >= 1)
													? 'ml-4'
													: ''}"
											>
												<button
													class="flex items-center"
													onclick={(e) => {
														e.stopPropagation()
														row.toggleExpanded()
													}}
													aria-label="Ouvrir/fermer le volet"
												>
													<iconify-icon
														class="align-[-0.3rem] text-xl hover:bg-gray-100"
														icon={row.getIsExpanded()
															? "ri:arrow-down-s-line"
															: "ri:arrow-right-s-line"}
													>
													</iconify-icon>
												</button>
												<div class="flex items-center gap-1">
													{#if grouping.includes("version_citee") && cell.column.id === "article_citant"}
														<span class="font-normal">Citée par</span>
													{/if}
													<FlexRender
														content={cell.column.columnDef.cell}
														context={cell.getContext()}
													/>
													<span class="text-sm font-normal text-gray-600">
														{getInformationNombreEnfant(
															row,
															cell.column.id,
															articleInfo.article?.num,
														)}
													</span>
												</div>
											</div>
										{/if}
									{:else if cell.getIsAggregated()}
										<!-- Cellule agrégée -->
									{:else if cell.getIsPlaceholder()}
										<!-- Placeholder pour les lignes groupées -->
									{:else}
										<div class="ml-12 flex items-center py-2">
											{#if grouping.includes("version_citante")}
												Cite&nbsp;{#if row.original.num_cite}
													l'art. {row.original.num_cite} -{/if}
												<FlexRender
													content={cell.column.columnDef.cell}
													context={cell.getContext()}
												/>
											{:else if grouping.includes("version_citee")}
												<FlexRender
													content={cell.column.columnDef.cell}
													context={cell.getContext()}
												/>
											{/if}
										</div>
									{/if}
								</TableUI.Cell>
							{/if}
						{/each}
					</TableUI.Row>
				{:else}
					<TableUI.Row>
						<TableUI.Cell
							colspan={columns.length}
							class="text-center text-gray-500 italic text-sm flex-col flex items-center my-10"
						>
							<p>Aucune citation ne correspond aux filtres sélectionnés.</p>
							<button
								class="text-sm text-blue-600 underline hover:text-blue-800 cursor-pointer not-italic"
								onclick={resetFilters}
							>
								Réinitialiser les filtres
							</button>
						</TableUI.Cell>
					</TableUI.Row>
				{/each}
			</TableUI.Body>
		</TableUI.Root>
	</div>
	<AlertDatabaseMessage>
		<b
			>Certaines versions ne citent pas cet article ? Il manque des citations ?</b
		>
		Le Légiscope s'appuie sur la liste des citations mise à disposition par Légifrance.
		Cette liste peut contenir des erreurs ou des manques.
	</AlertDatabaseMessage>
{:else if citationsData === undefined}
	<SkeletonArticleCitationsLoader />
{:else if error}
	<div class="border bg-white p-4">
		⚠️ Une erreur est survenue lors de la récupération des citations
	</div>
{:else}
	<AlertDatabaseMessage>
		<b>Aucun texte ne semble citer cet article.</b> Le Légiscope s'appuie sur la liste
		des citations mise à disposition par Légifrance. Cette liste peut contenir des
		erreurs ou des manques.
	</AlertDatabaseMessage>
{/if}
