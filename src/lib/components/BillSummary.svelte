<script lang="ts">
	interface Props {
		billHTML: string | undefined
		container: HTMLDivElement | undefined
	}

	let { billHTML, container }: Props = $props()

	let summaryItems = $state<{ id: string; text: string; level: number }[]>([])
	let summaryIsOpen = $state(false)

	function extractAnchors(html: string) {
		const parser = new DOMParser()
		const doc = parser.parseFromString(html, "text/html")
		const paragraphs = Array.from(doc.querySelectorAll('p[class^="assnatTOC"]'))

		return paragraphs
			.map((p) => {
				const link = p.querySelector('a[href^="#_"]')
				if (!link) return null

				const levelMatch = p.className.match(/assnatTOC(\d+)/)
				const level = levelMatch ? parseInt(levelMatch[1]) : 0

				const text = Array.from(link.querySelectorAll("span"))
					.map((span) => span.textContent)
					.join("")
					.trim()

				return {
					id: link.getAttribute("href")?.slice(1) || "",
					text: text,
					level: level,
				}
			})
			.filter((item) => item !== null) as {
			id: string
			text: string
			level: number
		}[]
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
			<li style="padding-left:{item.level * 5}px;">
				<a
					href={`#${item.id}`}
					class="block py-1 text-blue-600 hover:underline"
					onclick={() => {
						if (container !== undefined) {
							const target = container.shadowRoot?.getElementById(item.id)
							target?.scrollIntoView({ behavior: "smooth" })
							summaryIsOpen = false
						}
					}}
				>
					{item.text}
				</a>
			</li>
		{/each}
	</ul>
</div>
