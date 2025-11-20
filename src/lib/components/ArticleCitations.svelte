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
	import CellVersionCitante from "./CellVersionCitante.svelte"
	import DataTableVersionCitanteButton from "./DataTableVersionCitanteButton.svelte"
	import SkeletonArticleCitationsLoader from "./SkeletonArticleCitationsLoader.svelte"

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

	let grouping = $state<string[]>(["article_citant", "version_citante"])
	let sorting = $state<SortingState>([])
	let expanded = $state<ExpandedState>({})
	let columnFilters = $state<ColumnFiltersState>([])

	const columns: ColumnDef<CitationsDataRow>[] = [
		{
			id: "article_citant",
			header: ({ column }) =>
				renderComponent(DataTableVersionCitanteButton, {
					onclick: column.getToggleSortingHandler(),
					grouping,
					articleNum: articleInfo.article?.num,
				}),
			accessorFn: (row) => {
				const titre = row.titre_text_citant || ""
				const num = row.num_citant || ""
				return `${num ? "Article " + num : ""} du ${titre}`
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
						return renderComponent(CellVersionCitante, {
							data: {
								date_debut_citant: firstSubRow.date_debut_citant,
								date_fin_citant: firstSubRow.date_fin_citant,
								etat_citant: firstSubRow.etat_citant,
								article_type_citant: firstSubRow.article_type_citant,
							},
						})
					}
					return ""
				} else {
					return renderComponent(CellVersionCitante, {
						data: {
							article_citant: grouping.includes("article_citant")
								? null
								: (row.getValue("article_citant") as string | null),
							date_debut_citant: row.original.date_debut_citant,
							date_fin_citant: row.original.date_fin_citant,
							etat_citant: row.original.etat_citant,
							article_type_citant: row.original.article_type_citant,
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
				const dateDebut = row.original.date_debut_cite
					? new Date(row.original.date_debut_cite).toISOString().split("T")[0]
					: ""
				const dateFin = row.original.date_fin_cite
					? new Date(row.original.date_fin_cite).toISOString().split("T")[0]
					: ""

				return `v${dateDebut} → ${dateFin}`
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
	let inEffectOnly = $state(false)
</script>

{#if table !== undefined}
	<div class="mb-4 flex gap-2">
		<button
			class="rounded border px-4 py-2"
			onclick={() => {
				if (grouping[0] === "article_citant") {
					grouping = ["version_citee", "article_citant"]
					columnOrder = [
						"version_citee",
						...defaultColumnOrder.filter((id) => id !== "version_citee"),
					]
				} else {
					grouping = ["article_citant", "version_citante"]
					columnOrder = defaultColumnOrder
				}
			}}
		>
			{grouping[0] === "article_citant"
				? `Grouper les citations par versions de cet article`
				: `Grouper par articles citant l'article ${articleInfo.article?.num ?? "étudié"}`}
		</button>
		En vigueur seulement
		<input
			bind:checked={inEffectOnly}
			type="checkbox"
			onchange={() => {
				table!
					.getColumn("etat_citant")
					?.setFilterValue(inEffectOnly ? "VIGUEUR" : "")
			}}
		/>
	</div>
	<div class="rounded-md border bg-white">
		<TableUI.Root>
			<TableUI.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<TableUI.Row>
						{#each headerGroup.headers as header (header.id)}
							{#if !header.isPlaceholder && header.column.id !== "version_citante" && !(grouping.length > 0 && header.column.id === "version_citee")}
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
							{#if !(!row.getIsGrouped() && grouping.includes(cell.column.id))}
								<TableUI.Cell
									isSubrow={row.depth > 0}
									isFirstColumn={cellIndex === 0}
									colspan={!row.getIsGrouped() &&
									cell.column.id === "version_citante" &&
									grouping.includes("version_citee")
										? 99
										: 1}
								>
									{#if cell.getIsGrouped()}
										<div
											class="flex items-center gap-1 rounded px-2 py-1 font-semibold {row.depth >
											0
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
															? `versions de l'article ${articleInfo.article?.num ?? "étudié"} citées`
															: `version de l'article ${articleInfo.article?.num ?? "étudié"} citée`})
													{:else if cell.column.id === "version_citee"}
														{row.subRows.length > 1
															? "articles citant cette version"
															: "article citant cette version"})
													{:else}
														{row.subRows.length > 1 ? "versions" : "version"})
													{/if}
												</span>
											</div>
										</div>
									{:else if cell.getIsAggregated()}
										<!-- Cellule agrégée -->
									{:else if cell.getIsPlaceholder()}
										<!-- Placeholder pour les lignes groupées -->
									{:else if !row.getIsGrouped() && cell.column.id === "version_citante" && grouping.includes("version_citee")}
										<div class="ml-12">
											<FlexRender
												content={cell.column.columnDef.cell}
												context={cell.getContext()}
											/>
										</div>
									{:else}
										<FlexRender
											content={cell.column.columnDef.cell}
											context={cell.getContext()}
										/>
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
