<script lang="ts">
	import {
		createSvelteTable,
		FlexRender,
	} from "$lib/components/ui/data-table/index.js"
	import * as TableUI from "$lib/components/ui/table/index.js"
	import type {
		ArticleInfo,
		CitationsData,
		CitationsDataRow,
	} from "$lib/db_data_types"
	import {
		type ColumnDef,
		getCoreRowModel,
		type Table,
	} from "@tanstack/table-core"

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
	$inspect(citationsData)
	const columns: ColumnDef<CitationsDataRow>[] = [
		{
			accessorKey: "legi_id_cite",
			header: "legi_id_cite",
		},
		{
			accessorKey: "date_debut_cite",
			header: "date_debut_cite",
		},
		{
			accessorKey: "date_fin_cite",
			header: "date_fin_cite",
		},
		{
			accessorKey: "num_cite",
			header: "num_cite",
		},
		{
			accessorKey: "article_type_cite",
			header: "article_type_cite",
		},
		{
			accessorKey: "etat_cite",
			header: "etat_cite",
		},
		{
			accessorKey: "legi_id_citant",
			header: "legi_id_citant",
		},
		{
			accessorKey: "date_debut_citant",
			header: "date_debut_citant",
		},
		{
			accessorKey: "date_fin_citant",
			header: "date_fin_citant",
		},
		{
			accessorKey: "num_citant",
			header: "num_citant",
		},
		{
			accessorKey: "article_type_citant",
			header: "article_type_citant",
		},
		{
			accessorKey: "etat_citant",
			header: "etat_citant",
		},
		{
			accessorKey: "legitext_id_citant",
			header: "legitext_id_citant",
		},
		{
			accessorKey: "titre_text_citant",
			header: "titre_text_citant",
		},
	]
	let table: Table<CitationsDataRow> | undefined = $state()
	$effect(() => {
		if (citationsData !== undefined) {
			table = createSvelteTable({
				get data() {
					return citationsData as CitationsDataRow[]
				},
				columns,
				getCoreRowModel: getCoreRowModel(),
			})
			// for (const row in table.getRowModel().rows) {
			// 	console.log(row)
			// }
		}
	})
	$inspect({ table })
</script>

{#if table !== undefined}
	Cité par :
	<div class="rounded-md border">
		<TableUI.Root>
			<TableUI.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<TableUI.Row>
						{#each headerGroup.headers as header (header.id)}
							<TableUI.Head colspan={header.colSpan}>
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</TableUI.Head>
						{/each}
					</TableUI.Row>
				{/each}
			</TableUI.Header>
			<TableUI.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<TableUI.Row data-state={row.getIsSelected() && "selected"}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<TableUI.Cell>
								<FlexRender
									content={cell.column.columnDef.cell}
									context={cell.getContext()}
								/>
							</TableUI.Cell>
						{/each}
					</TableUI.Row>
				{:else}
					<TableUI.Row>
						<TableUI.Cell colspan={columns.length} class="h-24 text-center">
							No results.
						</TableUI.Cell>
					</TableUI.Row>
				{/each}
			</TableUI.Body>
		</TableUI.Root>
	</div>
{:else if citationsData === undefined}
	Récupération des citations
{:else if error}
	Une erreur est survenue lors de la récupération des citations
{:else}
	Pas de citations
{/if}
