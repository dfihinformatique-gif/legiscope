<script lang="ts">
	import Toc from "$lib/components/Toc.svelte"
	import type { ArticleInfo } from "$lib/db_data_types"

	interface Props {
		articleInfo: ArticleInfo
		pjlDate: string
	}
	let { articleInfo }: Props = $props()
	let tocIsOpen = $state(false)
</script>

<div
	class:mb-10={tocIsOpen}
	class:border-b={tocIsOpen}
	class:shadow-bottom-extralight={tocIsOpen}
	class:border-gray-200={tocIsOpen}
>
	<button
		class="text-le-gris-dispositif-dark lx-link-text my-2 cursor-pointer text-left font-sans xl:mt-5 xl:text-lg"
		onclick={() => {
			tocIsOpen = !tocIsOpen
		}}
	>
		<iconify-icon
			class="align-[-0.3rem] text-xl"
			icon={tocIsOpen ? "ri:arrow-down-s-line" : "ri:arrow-right-s-line"}
		>
		</iconify-icon>
		{articleInfo.textTitle}
	</button>

	{#if tocIsOpen}
		<div class="mb-10 ml-6">
			<Toc {articleInfo}></Toc>
		</div>
	{/if}
</div>
