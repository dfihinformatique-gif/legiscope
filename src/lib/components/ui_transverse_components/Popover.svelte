<script lang="ts">
	import { Popover } from "bits-ui"

	interface Props {
		widthClass?: string
		side?: "top" | "bottom" | "left" | "right"
		align?: "start" | "center" | "end"
		triggerOnHover?: boolean
		children?: import("svelte").Snippet
		content?: import("svelte").Snippet
	}

	let {
		widthClass = "w-60",
		side = "top",
		align = "center",
		triggerOnHover = true,
		children,
		content,
	}: Props = $props()

	let open = $state(false)
	let timer: ReturnType<typeof setTimeout>
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="inline-block"
		onmouseenter={() => {
			if (triggerOnHover) {
				clearTimeout(timer)
				open = true
			}
		}}
		onmouseleave={() => {
			if (triggerOnHover) {
				timer = setTimeout(() => {
					open = false
				}, 100)
			}
		}}
	>
		{@render children?.()}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			{side}
			{align}
			sideOffset={8}
			class="z-50 {widthClass} rounded-lg border border-gray-200 bg-white p-2 shadow-md outline-hidden"
			onmouseenter={() => {
				if (triggerOnHover) {
					clearTimeout(timer)
				}
			}}
			onmouseleave={() => {
				if (triggerOnHover) {
					timer = setTimeout(() => {
						open = false
					}, 100)
				}
			}}
		>
			{@render content?.()}
			<Popover.Arrow class="fill-white" />
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
