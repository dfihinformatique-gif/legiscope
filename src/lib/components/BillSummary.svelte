<script lang="ts">
	interface Props {
		pjlHTML: string | undefined
		container: HTMLDivElement | undefined
	}

	let { pjlHTML, container }: Props = $props()

	let summaryItems = $state<{ id: string; text: string; level: number }[]>([])
	let summaryIsOpen = $state(false)

	let currentTitle = $state<string>("")

	function updateCurrentTitleFromScroll() {
		if (!container?.shadowRoot) return

		const anchors = summaryItems
			.map((item) => container.shadowRoot!.getElementById(item.id))
			.filter((el): el is HTMLElement => !!el)

		const containerTop = container.getBoundingClientRect().top

		let closestAnchor: HTMLElement | null = null
		let closestDistance = -Infinity

		for (const anchor of anchors) {
			const rect = anchor.getBoundingClientRect()
			const distance = rect.top - containerTop - 20

			if (distance < 0 && distance > closestDistance) {
				closestDistance = distance
				closestAnchor = anchor
			}
		}

		if (closestAnchor) {
			const id = closestAnchor.id
			const item = summaryItems.find((i) => i.id === id)
			if (item) currentTitle = item.text
		}
	}

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
		if (!pjlHTML) return
		summaryItems = extractAnchors(pjlHTML)
	})
	$effect(() => {
		if (!container) return

		const handler = () => updateCurrentTitleFromScroll()
		container.addEventListener("scroll", handler)

		handler()

		return () => {
			container.removeEventListener("scroll", handler)
		}
	})
</script>

<div class="sticky top-0 z-10 px-4 pt-2">
	<div
		class="flex h-8 items-center justify-between pb-2 xl:h-12"
		class:border-b-2={!summaryIsOpen}
		class:border-b={summaryIsOpen}
		class:shadow-bottom={!summaryIsOpen}
		class:shadow-bottom-extralight={summaryIsOpen}
		class:border-black={!summaryIsOpen}
		class:border-gray-200={summaryIsOpen}
	>
		<span class="truncate">{currentTitle}</span>
		<button
			class="lx-link-uppercase font-sans text-gray-500 uppercase"
			onclick={() => (summaryIsOpen = !summaryIsOpen)}
		>
			<iconify-icon
				class="align-[-0.3rem] text-xl"
				icon={summaryIsOpen ? "ri:menu-fold-line" : "ri:menu-fold-2-line"}
			>
			</iconify-icon>
			{#if summaryIsOpen}Fermer Sommaire{:else}Sommaire{/if}
		</button>
	</div>
	<ul
		class="shadow-bottom overflow-y-auto px-2 transition-all duration-300 ease-in-out lg:px-4 xl:px-10"
		class:border-b-2={summaryIsOpen}
		class:max-h-0={!summaryIsOpen}
		class:max-h-[80vh]={summaryIsOpen}
	>
		<h2 class="mt-5 font-serif text-2xl">
			Projet de loi de finances <span
				class="font-sans font-light tracking-wider">| Sommaire</span
			>
		</h2>
		{#each summaryItems as item}
			<li class="my-2" style="padding-left:{item.level * 5}px;">
				<a
					href={`#${item.id}`}
					class="lx-link-simple block py-1 text-sm text-neutral-700"
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
