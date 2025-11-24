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
		type SortingState,
		type Table,
	} from "@tanstack/table-core"
	import SkeletonArticleCitationsLoader from "../SkeletonArticleCitationsLoader.svelte"
	import CellVersionArticle from "./CellVersionArticle.svelte"
	import DataTableVersionCitanteButton from "./DataTableVersionCitanteButton.svelte"

	interface Props {
		articleInfo: ArticleInfo
	}

	let { articleInfo }: Props = $props()
	let citationsData: CitationsData | undefined = $state(undefined)
	let error = $state(false)

	fetch(`/api/citations/${articleInfo.article?.legi_id}`)
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => {
			citationsData = data
		})
		.catch(() => {
			citationsData = undefined
			error = true
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
	let columnFilters = $state<ColumnFiltersState>([])

	const NATURE_MAPPING: Record<number, { priority: number; label: string }> = {
		72: { priority: 1, label: "Constitution" },
		260: { priority: 2, label: "Loi constitutionnelle" },
		157: { priority: 3, label: "Loi organique" },
		60: { priority: 4, label: "Loi" },
		237: { priority: 5, label: "Code" },
		32: { priority: 6, label: "Ordonnance" },
		14: { priority: 7, label: "Décret-loi" },
		119: { priority: 8, label: "Décret" },
		120: { priority: 8, label: "Décret" },
		178: { priority: 9, label: "Arrêté" },
		36: { priority: 10, label: "Arrêté" },
		47: { priority: 11, label: "Projet" },
		109: { priority: 12, label: "Traité" },
	}

	const columns: ColumnDef<CitationsDataRow>[] = [
		{
			accessorKey: "article_citant_texte_nature",
			header: "Nature",
			enableGrouping: true,
			cell: ({ row, getValue }) => {
				const id = row.original.article_citant_texte_nature_id
				if (id && NATURE_MAPPING[id]) {
					return NATURE_MAPPING[id].label
				}
				return getValue() as string
			},
			sortingFn: (rowA, rowB, columnId) => {
				// Tri des textes_natures du NATURE_MAPPING selon la priorité qui leur a été donnée
				const idA = rowA.original.article_citant_texte_nature_id
				const idB = rowB.original.article_citant_texte_nature_id

				const priorityA = (idA && NATURE_MAPPING[idA]?.priority) || 99
				const priorityB = (idB && NATURE_MAPPING[idB]?.priority) || 99

				if (priorityA !== priorityB) {
					return priorityA - priorityB
				}

				// Pour les textes_natures n'ayant pas été mentionné dans le NATURE_MAPPING ci-dessus, on trie par ordre d'ID
				if (idA && idB && idA !== idB) {
					return idA - idB
				}

				// Fallback ultime : si pas d'ID, ordre arbitraire
				return 0
			},
		},
		{
			id: "article_citant",
			header: ({ column, table: tableInstance }) =>
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
							},
						})
					}
					return ""
				} else {
					return renderComponent(CellVersionArticle, {
						data: {
							article_citant: grouping.includes("article_citant")
								? null
								: (row.getValue("article_citant") as string | null),
							date_debut: row.original.date_debut_citant,
							date_fin: row.original.date_fin_citant,
							etat: row.original.etat_citant,
							article_type: row.original.article_type_citant,
						},
					})
				}
			},
		},
		{
			accessorKey: "article_type_citant",
			header: "Type de la version de l'article citant",
			enableHiding: true,
		},
		{
			accessorKey: "etat_citant",
			header: "État de la version citant",
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
					},
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
	$effect(() => {
		if (grouping[0] === "article_citant_texte_nature" && table) {
			const groups = table.getGroupedRowModel().rows
			let changed = false
			const newExpanded = typeof expanded === "object" ? { ...expanded } : {}

			for (const row of groups) {
				if (!newExpanded[row.id]) {
					newExpanded[row.id] = true
					changed = true
				}
			}

			if (changed) {
				expanded = newExpanded
			}
		}
	})

	let inEffectOnly = $state(false)
</script>

{#if table !== undefined}
	<div class="flex w-full flex-col flex-wrap justify-end gap-y-2 p-3">
		<div class="flex items-center justify-end">
			<label class="inline-flex cursor-pointer items-center">
				<input
					class="peer sr-only"
					type="checkbox"
					bind:checked={inEffectOnly}
					onchange={() => {
						table!
							.getColumn("etat_citant")
							?.setFilterValue(inEffectOnly ? "VIGUEUR" : "")
					}}
				/>
				<div
					class="peer peer-checked:bg-le-gris-dispositif-dark relative h-6 w-11 shrink-0 rounded-full bg-gray-400 peer-focus:ring-0 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
				></div>
				<span class="ms-3 text-sm font-medium text-gray-900 sm:text-sm">
					En vigueur seulement
				</span>
			</label>
		</div>
		<div class="flex justify-end">
			<button
				class="lx-link-uppercase text-left font-sans text-sm text-wrap text-gray-500"
				onclick={() => {
					if (grouping[0] === "article_citant_texte_nature") {
						grouping = ["version_citee", "article_citant"]
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
					class="align-[-0.25rem] text-xl hover:bg-gray-100"
					icon={grouping[0] === "article_citant_texte_nature"
						? "ri-list-ordered-2"
						: "ri-list-unordered"}
				>
				</iconify-icon>

				{grouping[0] === "article_citant_texte_nature"
					? `Grouper par version de l'art. ${articleInfo.article?.num ?? "étudié"}`
					: `Grouper par articles citant l'art. ${articleInfo.article?.num ?? "étudié"}`}
			</button>
		</div>
	</div>
	<div class="w-full rounded-md border bg-white">
		<TableUI.Root>
			<TableUI.Header>
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
							{#if !(!row.getIsGrouped() && grouping.includes(cell.column.id)) && !(cell.column.id === "article_citant_texte_nature" && !row.getIsGrouped() && grouping.includes("version_citee"))}
								<TableUI.Cell
									isSubrow={row.depth > 0}
									isFirstColumn={cellIndex === 0}
									isArticleCitantEmptyColumn={cell.column.id ===
										"article_citant" && row.depth > 1}
									colspan={!row.getIsGrouped() &&
									cell.column.id === "version_citante" &&
									grouping.includes("version_citee")
										? 99
										: cell.column.id === "article_citant_texte_nature" &&
											  cell.getIsGrouped() &&
											  row.depth === 0
											? 99
											: 1}
								>
									{#if cell.getIsGrouped()}
										{#if cell.column.id === "article_citant_texte_nature"}
											<div
												class="flex items-center bg-neutral-50 px-3 font-bold text-gray-400"
											>
												<div class="flex items-center gap-2">
													{(() => {
														const firstRow = row.subRows[0]?.original
														const id = firstRow?.article_citant_texte_nature_id
														return (
															(id && NATURE_MAPPING[id]?.label) ||
															cell.getValue()
														)
													})()}
												</div>
											</div>
										{:else}
											<div
												class="flex items-center gap-1 rounded px-2 py-3 font-semibold {(grouping.includes(
													'version_citante',
												) &&
													row.depth == 2) ||
												(grouping.includes('version_citee') && row.depth == 1)
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
												<div class="flex items-center gap-2">
													<FlexRender
														content={cell.column.columnDef.cell}
														context={cell.getContext()}
													/>
													<span class="text-sm font-normal text-gray-600">
														({row.subRows.length}
														{#if cell.column.id === "version_citante"}
															{row.subRows.length > 1
																? `versions de l'art. ${articleInfo.article?.num ?? "étudié"} citées`
																: `version de l'art. ${articleInfo.article?.num ?? "étudié"} citée`})
														{:else if cell.column.id === "version_citee"}
															{row.subRows.length > 1
																? "articles citent cette version"
																: "article cite cette version"})
														{:else}
															{row.subRows.length > 1
																? `versions citent l'art. ${articleInfo.article?.num ?? "étudié"}`
																: `version cite l'art. ${articleInfo.article?.num ?? "étudié"}`})
														{/if}
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
												Cite l'art. {row.original.num_cite} - <FlexRender
													content={cell.column.columnDef.cell}
													context={cell.getContext()}
												/>
											{:else if grouping.includes("version_citee")}
												Version de l'art. {row.original.num_cite} citée par la&nbsp;
												<FlexRender
													content={cell.column.columnDef.cell}
													context={cell.getContext()}
												/>&nbsp;de l'article {row.original.num_citant}
											{/if}
										</div>
									{/if}
								</TableUI.Cell>
							{/if}
						{/each}
					</TableUI.Row>
				{:else}
					<TableUI.Row>
						<TableUI.Cell colspan={columns.length} class="h-24 text-center">
							Pas de citations
						</TableUI.Cell>
					</TableUI.Row>
				{/each}
			</TableUI.Body>
		</TableUI.Root>
	</div>
{:else if citationsData === undefined}
	<SkeletonArticleCitationsLoader />
{:else if error}
	<div class="border bg-white p-4">
		⚠️ Une erreur est survenue lors de la récupération des citations
	</div>
{:else}
	<div class="border bg-white p-4">
		Cet article ne semble pas être cité par un autre article. Aucun lien de
		citation par un autre texte n'est référencé dans la base de données source.
	</div>
{/if}
