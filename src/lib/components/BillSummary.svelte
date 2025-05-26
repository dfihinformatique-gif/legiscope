<script lang="ts">
	interface Props {
		billHTML: string | undefined
		container: HTMLDivElement | undefined
	}

	let { billHTML, container }: Props = $props()

	let summaryItems = $state<{ id: string; text: string }[]>([])
	let summaryIsOpen = $state(false)

	function extractAnchors(html: string) {
		const parser = new DOMParser()
		const doc = parser.parseFromString(html, "text/html")
		const links = Array.from(doc.querySelectorAll('a[href^="#_"]'))

		return links
			.map((link) => {
				return {
					id: link.getAttribute("href")?.slice(1) || "",
					text: link.textContent?.trim() || "",
				}
			})
			.filter((item) => item.id && item.text)
	}

	$effect(() => {
		if (!billHTML) return
		summaryItems = extractAnchors(billHTML)
	})
</script>

<div class="sticky top-0 z-10 bg-white p-4 shadow-md">
	<button
		class="w-full bg-gray-100 px-4 py-2 text-left font-medium hover:bg-gray-200"
		onclick={() => (summaryIsOpen = !summaryIsOpen)}
	>
		Sommaire
		<span
			class="float-right transform transition-transform"
			class:rotate-180={summaryIsOpen}
		>
			▼
		</span>
	</button>
	<ul
		class="overflow-y-auto transition-all duration-300 ease-in-out"
		class:max-h-0={!summaryIsOpen}
		class:max-h-[60vh]={summaryIsOpen}
	>
		{#each summaryItems as item}
			<li>
				<a
					href={`#${item.id}`}
					class="block py-1 text-blue-600 hover:underline"
					onclick={() => {
						if (container !== undefined) {
							const target = container.shadowRoot?.getElementById(item.id)
							target?.scrollIntoView({ behavior: "smooth" })
						}
					}}
				>
					{item.text}
				</a>
			</li>
		{/each}
	</ul>
</div>
