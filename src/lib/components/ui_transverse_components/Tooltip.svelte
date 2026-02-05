<script lang="ts">
	import { run } from "svelte/legacy"

	import { arrow, flip, shift } from "@floating-ui/core"
	import {
		computePosition,
		type Coords,
		type Placement,
	} from "@floating-ui/dom"

	interface Props {
		allowFlip?: boolean
		arrowClass?: string
		arrowBorderWidth?: string
		class?: string
		classes?: string
		hoverable?: boolean
		initialPlacement?: Placement
		role?: string
		tag?: string
		widthClass?: string
		children?: import("svelte").Snippet
		tooltip?: import("svelte").Snippet
	}

	let {
		allowFlip = true,
		arrowClass = "",
		arrowBorderWidth = "1px",
		class: klass = "",
		classes = "",
		hoverable = true,
		initialPlacement = "bottom",
		role = "presentation",
		tag = "div",
		widthClass = "w-1/3",
		children,
		tooltip,
	}: Props = $props()

	let arrowCoords: (Partial<Coords> & { centerOffset: number }) | undefined =
		$state()
	let arrowElement: HTMLElement | SVGSVGElement | null = $state(null)
	let arrowSpace = 10
	let arrowHeight = 6
	let mouseInReference = $state(false)
	let mouseInTooltip = $state(false)
	let placement = $state(initialPlacement)
	let referenceElement: HTMLElement | null = $state(null)
	let showTooltip = $state(false)
	let tooltipElement: HTMLElement | null = $state(null)
	let uuid = crypto.randomUUID()

	function updateTooltip(
		isMouseInReference: boolean,
		isMouseInTooltip: boolean,
	) {
		showTooltip = isMouseInReference || (hoverable && isMouseInTooltip)

		if (showTooltip) {
			if (
				referenceElement === null ||
				tooltipElement === null ||
				arrowElement === null
			)
				return

			positionTooltip(referenceElement, tooltipElement, arrowElement)
		}
	}

	async function positionTooltip(
		referenceElement: HTMLElement,
		tooltipElement: HTMLElement,
		arrowElement: HTMLElement | SVGSVGElement,
	): Promise<void> {
		const {
			x,
			y,
			middlewareData,
			placement: computedPlacement,
		} = await computePosition(referenceElement, tooltipElement, {
			placement: initialPlacement,
			middleware: [
				...(allowFlip ? [flip()] : []),
				shift(),
				arrow({ element: arrowElement }),
			],
		})
		placement = computedPlacement
		Object.assign(tooltipElement.style, {
			left: `${x}px`,
			top: `${y}px`,
		})

		if (middlewareData.arrow) {
			arrowCoords = { ...middlewareData.arrow }
		}
	}
	run(() => {
		updateTooltip(mouseInReference, mouseInTooltip)
	})
</script>

<svelte:element
	this={tag}
	aria-describedby="tooltip-{uuid}"
	class="inline-block {classes}"
	onmouseenter={() => (mouseInReference = true)}
	onmouseleave={() => (mouseInReference = false)}
	{role}
	bind:this={referenceElement}
>
	{@render children?.()}
</svelte:element>
<div
	class="absolute z-50 {widthClass} {klass ?? ''}"
	id="tooltip-{uuid}"
	bind:this={tooltipElement}
	onmouseenter={() => (mouseInTooltip = true)}
	onmouseleave={() => (mouseInTooltip = false)}
	role="tooltip"
	style:padding-top={placement === "bottom" ? `${arrowSpace}px` : undefined}
	style:padding-right={placement === "left" ? `${arrowSpace}px` : undefined}
	style:padding-bottom={placement === "top" ? `${arrowSpace}px` : undefined}
	style:padding-left={placement === "right" ? `${arrowSpace}px` : undefined}
	style:display={showTooltip ? "block" : "none"}
>
	{@render tooltip?.()}
	<div
		bind:this={arrowElement}
		class="{arrowClass} absolute h-1 w-1 after:absolute after:-top-0.5 after:left-[-2.5px] after:h-2.25 after:w-2.25 after:rotate-45 after:border-inherit after:bg-inherit"
		style:top={placement === "top"
			? `calc(100% - ${arrowSpace + arrowHeight / 2}px)`
			: arrowCoords?.y
				? `${arrowCoords?.y}px`
				: undefined}
		style:right={placement === "right"
			? `calc(100% - ${arrowSpace + arrowHeight / 2}px)`
			: arrowCoords?.x
				? `${arrowCoords?.x}px`
				: undefined}
		style:bottom={placement === "bottom"
			? `calc(100% - ${arrowSpace + arrowHeight / 2}px)`
			: arrowCoords?.y
				? `${arrowCoords?.y}px`
				: undefined}
		style:left={placement === "left"
			? `calc(100% - ${arrowSpace + arrowHeight / 2}px)`
			: arrowCoords?.x
				? `${arrowCoords?.x}px`
				: undefined}
		style="--arrow-border-width: {arrowBorderWidth};"
		class:after:border-t={placement === "bottom" || placement === "left"}
		class:border-t-width={placement === "bottom" || placement === "left"}
		class:after:border-r={placement === "top" || placement === "left"}
		class:border-r-width={placement === "top" || placement === "left"}
		class:after:border-b={placement === "top" || placement === "right"}
		class:border-b-width={placement === "top" || placement === "right"}
		class:after:border-l={placement === "bottom" || placement === "right"}
		class:border-l-width={placement === "bottom" || placement === "right"}
	></div>
</div>

<style>
	.border-t-width::after {
		border-top-width: var(--arrow-border-width);
	}
	.border-r-width::after {
		border-right-width: var(--arrow-border-width);
	}
	.border-b-width::after {
		border-bottom-width: var(--arrow-border-width);
	}
	.border-l-width::after {
		border-left-width: var(--arrow-border-width);
	}
</style>
